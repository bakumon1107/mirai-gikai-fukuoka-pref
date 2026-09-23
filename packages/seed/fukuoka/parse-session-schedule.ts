/**
 * parse-session-schedule.ts
 *
 * 福岡県議会ホームページの会期日程ページ（gikainittei-*.html）から
 * 開会日・閉会日を抽出する純粋関数。
 *
 * council_sessions の start_date / end_date を推測で埋めないために使う。
 * 日程表そのものはDBへ入れない（設計書 §5.3）。
 */

import { htmlToLines, warekiToYear } from "./parse-bill-list";

export type SessionSchedule = {
  /** 開会日（YYYY-MM-DD）。日程表の最初の日付 */
  startDate: string | null;
  /** 閉会日（YYYY-MM-DD）。「閉会」が記載された日。会期中は null */
  endDate: string | null;
  warnings: string[];
};

/**
 * 会期日程ページの見出しから年を取る。
 *
 * 定例会と臨時会で表記が揺れるため、間の文字は問わない。
 *   令和8年9月第18回定例会会期日程
 *   令和7年5月第11回福岡県議会臨時会会期日程   ← 「福岡県議会」が入る
 */
const HEADING_YEAR_RE = /^(令和|平成)(\d+|元)年(\d+)月.*会期日程$/;

/** 日程行の日付「9月9日(水曜日)」 */
const DAY_RE = /^(\d+)月(\d+)日\(.{1,3}曜日\)$/;

/**
 * 「閉会」を示す行。日程表では議事日程の項目として現れる。
 *
 * 実ページでは全角スペースや U+200B が前置されることがあるため
 * （例: `​閉会`）、前後の空白・ゼロ幅文字を除いて判定する。
 */
function isClosingLine(line: string): boolean {
  const normalized = line.replace(/[\s　​]/g, "");
  return normalized === "閉会" || normalized === "閉会式";
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 会期日程ページをパースして開会日・閉会日を返す。
 *
 * 日程表は「月日」と「議事日程」が縦に並ぶ構造で、年は見出しにしか無い。
 * **会期が年をまたぐ場合（12月定例会など）に対応するため、月が減少したら
 * 翌年へ繰り上げる。** 例: 12月定例会が1月まで続く場合。
 */
export function parseSessionSchedule(html: string): SessionSchedule {
  const lines = htmlToLines(html);
  const warnings: string[] = [];

  let baseYear: number | null = null;
  for (const line of lines) {
    const m = line.match(HEADING_YEAR_RE);
    if (m) {
      const eraYear = m[2] === "元" ? 1 : Number(m[2]);
      baseYear = warekiToYear(m[1], eraYear);
      break;
    }
  }

  if (baseYear === null) {
    return {
      startDate: null,
      endDate: null,
      warnings: ["会期日程の見出しから年を取得できませんでした"],
    };
  }

  let startDate: string | null = null;
  let endDate: string | null = null;
  let year = baseYear;
  let prevMonth: number | null = null;
  // 直近に読んだ日付。次に「閉会」行が来たらその日が閉会日。
  let currentDate: string | null = null;

  for (const line of lines) {
    const dayMatch = line.match(DAY_RE);
    if (dayMatch) {
      const month = Number(dayMatch[1]);
      const day = Number(dayMatch[2]);
      // 月が戻ったら年明け（12月 → 1月）
      if (prevMonth !== null && month < prevMonth) year += 1;
      prevMonth = month;
      currentDate = toIsoDate(year, month, day);
      if (startDate === null) startDate = currentDate;
      continue;
    }

    if (isClosingLine(line) && currentDate !== null) {
      // 「閉会」は複数回現れうる（閉会中の調査事項付議など）。最後を採用する
      endDate = currentDate;
    }
  }

  if (startDate === null) {
    warnings.push("日程表から開会日を取得できませんでした");
  }
  if (endDate === null) {
    warnings.push("日程表に「閉会」の記載がありません（会期中の可能性）");
  }

  return { startDate, endDate, warnings };
}
