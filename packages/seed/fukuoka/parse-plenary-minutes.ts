/**
 * parse-plenary-minutes.ts
 *
 * 福岡県議会 会議録検索システム（dbsr.jp・Laravel版）の本会議文書ページHTMLから、
 * 一般質問パーサー（parse-general-questions.py）が読めるプレーンテキストを組み立てる
 * 純粋関数群。ネットワークアクセスは scrape-plenary-minutes.ts 側が担当する。
 */

import { decodeEntities } from "./parse-committee-minutes";

/** 文書ページの開催日（例:「2026-06-12」） */
export function extractDocDate(html: string): string | null {
  const m = html.match(/command__date"[^>]*>\s*([\d-]{10})/);
  return m ? m[1] : null;
}

/**
 * 文書ページの全発言ブロックを、話者ラベル込みの生テキストとして抽出する。
 * 委員会用の parseDocumentPage と違い「◯十六番（佐藤　楓）登壇　」という
 * 話者ラベルを本文から切り離さない（一般質問パーサーがこの行を目印にするため）。
 */
export function extractVoiceTexts(html: string): string[] {
  const voiceRe =
    /data-voice_code="(\d+)"[\s\S]*?<p class="voice__text">([\s\S]*?)<\/p>/g;
  const texts: string[] = [];
  for (const m of html.matchAll(voiceRe)) {
    const inner = m[2]
      .replace(/\r?\n/g, "")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, "");
    const text = decodeEntities(inner)
      .split("\n")
      .map((line) => line.replace(/\s+$/, ""))
      .join("\n")
      .trim();
    if (text.length === 0) continue;
    texts.push(text);
  }
  return texts;
}

const FULLWIDTH_DIGITS = "０１２３４５６７８９";
const KANJI_DIGITS = "〇一二三四五六七八九";

/**
 * 「第５日」「第10日」「第十一日」から日数を取り出す。
 *
 * 会議名の表記は全角数字・半角数字・漢数字が混在する。全角を半角に正規化した上で
 * 漢数字表記かどうかを判定し、「第十1日」のように漢数字と算用数字が混ざった表記は
 * 誤った日数を返さないよう null にする（誤った session_day でDBに入るのを避ける）。
 */
export function extractSessionDay(docName: string): number | null {
  const m = docName.match(/第([0-9０-９〇一二三四五六七八九十]+)日/);
  if (!m) return null;
  const raw = m[1].replace(/[０-９]/g, (c) =>
    String(FULLWIDTH_DIGITS.indexOf(c))
  );
  const hasKanji = /[〇一二三四五六七八九十]/.test(raw);
  const hasArabic = /[0-9]/.test(raw);
  if (hasKanji && hasArabic) return null;

  // 十進の漢数字（十一・二十 など）
  if (hasKanji) {
    let result = 0;
    let current = 0;
    for (const ch of raw) {
      const digit = KANJI_DIGITS.indexOf(ch);
      if (digit >= 0) {
        current = digit;
        continue;
      }
      if (ch === "十") {
        result += (current || 1) * 10;
        current = 0;
      }
    }
    const value = result + current;
    return value > 0 ? value : null;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** 「令和８年６月定例会（第５日）　本文」→「令和８年６月定例会（第５日）」 */
export function stripDocNameSuffix(docName: string): string {
  return docName.replace(/[\s　]*本文$/, "").trim();
}

/** 保存ファイル名（既存の docs/data/令和７年12月定例会（第11日）.txt と同じ流儀） */
export function buildPlenaryFileName(docName: string): string {
  return `${stripDocNameSuffix(docName)}.txt`;
}

/** 「2026-06-12」→「2026年6月12日」 */
export function formatJapaneseDate(isoDate: string): string {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`不正な日付です: ${isoDate}`);
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}

/**
 * テキストファイルの中身を組み立てる。
 * 1行目は「2026年6月12日：令和８年６月定例会（第５日）　本文」、
 * 以降は発言ブロックを空行区切りで並べる（既存テキストと同じ体裁）。
 */
export function buildPlenaryText(
  docName: string,
  isoDate: string,
  voices: string[]
): string {
  const header = `${formatJapaneseDate(isoDate)}：${docName}`;
  return `${[header, ...voices].join("\n\n")}\n`;
}
