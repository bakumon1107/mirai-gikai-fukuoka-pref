/**
 * parse-bill-list.ts
 *
 * 福岡県議会ホームページの提出議案件名ページ（gian-*.html）をパースする純粋関数群。
 * スクレイパー本体（scrape-bills.ts）から利用する。
 *
 * 詳細は docs/20260922_1650_議案スクレイプ設計.md §4.2 を参照。
 */

/** bills.bill_type に対応する種別 */
export type ParsedBillType = "bill" | "member_bill";

export type ParsedBill = {
  /** 議案番号（「第122号」形式。既存 bills.bill_number の表記に合わせる） */
  billNumber: string;
  billType: ParsedBillType;
  /** 件名（「第122号議案　」を除いた部分） */
  name: string;
  /** 提出日（YYYY-MM-DD）。ページに提出日見出しが無い会期では null */
  submittedDate: string | null;
};

export type ParseBillListResult = {
  /** 会期名（ページ見出しの表記。例「令和8年9月定例会」） */
  sessionName: string | null;
  bills: ParsedBill[];
  /** パース時に補正した箇所。目視レビューで確認する */
  warnings: string[];
};

/** HTML実体参照のデコード（parse-committee-minutes.ts と同じ方針） */
export function decodeEntities(text: string): string {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&");
}

/**
 * HTMLタグとみなすパターン。
 *
 * **`<[^>]+>` のような素朴な指定は使えない。** 議案件名には半角の山括弧が
 * そのままエスケープされずに現れる実例があり、タグとして食われてしまう。
 *
 *   第131号議案　専決処分について（令和8年度福岡県一般会計補正予算<第2号>）
 *
 * `<[^>]+>` だと `<第2号>` が除去され、さらに改行へ置換した場合は
 * 直後の `）` が次行に落ちて件名が途中で切れる。
 * そこでタグ名の先頭をASCII英字・`/`・`!`・`?` に限定し、
 * 日本語で始まる山括弧は本文として残す。
 */
const HTML_TAG_RE = /<\/?[A-Za-z!?][^>]*>/g;

/**
 * 本文領域（id="main" 以降）のタグを落としてテキスト行に変換する。
 *
 * 生の改行を先に潰してから <br> を改行に変換する。順序が逆だと
 * `<br />\n` の生改行が残って空行が量産される。
 */
export function htmlToLines(html: string): string[] {
  const mainStart = html.search(/id="main"/);
  const body = mainStart >= 0 ? html.slice(mainStart) : html;

  const text = body
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, "")
    .replace(/\r?\n/g, "")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/g, "\n")
    .replace(HTML_TAG_RE, "\n");

  return decodeEntities(text)
    .split("\n")
    // 実ページには全角スペースやゼロ幅スペース（U+200B）・BOM（U+FEFF）が
    // 行頭に入っている箇所がある（例: 採決結果の「​令和8年9月18日、…」）。
    // status_note などへそのまま入るため、ここで落とす。
    .map((line) => line.replace(TRIM_CHARS_RE, "").replace(LEAD_TRIM_RE, ""))
    .filter((line) => line.length > 0);
}

const TRIM_CHARS_RE = /[\s　​﻿]+$/;
const LEAD_TRIM_RE = /^[\s　​﻿]+/;

/** 和暦の元号年を西暦へ。福岡県議会サイトは令和／平成が混在する。 */
export function warekiToYear(era: string, eraYear: number): number {
  if (era === "令和") return 2018 + eraYear;
  if (era === "平成") return 1988 + eraYear;
  throw new Error(`未対応の元号です: ${era}`);
}

/** 「令和8年9月9日提出」形式の提出日見出し */
const SUBMITTED_DATE_RE =
  /^(令和|平成)(\d+|元)年(\d+)月(\d+)日提出$/;

/** 「第122号議案　件名」形式。全角スペース区切り。 */
const BILL_LINE_RE = /^第(\d+)号議案[\s　]*(.*)$/;

/** 議員提出・委員会提出セクションの見出し */
const MEMBER_SECTION_RE = /^(議員提出|委員会提出)(議案)?$/;

/** ページ見出し「令和8年9月定例会の提出議案件名」 */
const SESSION_NAME_RE = /^((?:令和|平成)(?:\d+|元)年\d+月(?:定例会|臨時会))の提出議案件名$/;

/** 本文終端。ページ下部のナビゲーション以降は議案行を含まない。 */
const FOOTER_MARKERS = ["日程", "1つ前のページに戻る", "このページの先頭へ"];

function parseSubmittedDate(line: string): string | null {
  const m = line.match(SUBMITTED_DATE_RE);
  if (!m) return null;
  const eraYear = m[2] === "元" ? 1 : Number(m[2]);
  const year = warekiToYear(m[1], eraYear);
  const month = String(Number(m[3])).padStart(2, "0");
  const day = String(Number(m[4])).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 提出議案件名ページをパースする。
 *
 * - 提出日見出し（「令和8年9月9日提出」）が現れたら、以降の議案へ適用する。
 *   見出しが1つも無い会期（例: gian-0705.html）では submittedDate が null になる。
 * - 「議員提出」「委員会提出」見出し以降は bill_type = member_bill。
 *   知事提出と番号体系が別なので、同一会期に「第3号」が両方存在しうる。
 * - 件名が空の行は警告に記録して読み飛ばす（改行割れの取りこぼし検知）。
 */
export function parseBillList(html: string): ParseBillListResult {
  const lines = htmlToLines(html);
  const bills: ParsedBill[] = [];
  const warnings: string[] = [];

  let sessionName: string | null = null;
  let currentDate: string | null = null;
  let currentType: ParsedBillType = "bill";
  const seen = new Set<string>();

  for (const line of lines) {
    if (sessionName === null) {
      const nameMatch = line.match(SESSION_NAME_RE);
      if (nameMatch) {
        sessionName = nameMatch[1];
        continue;
      }
    }

    // フッターのナビゲーションに到達したら打ち切る。
    // ただし議案を1件も読めていない場合は、まだ本文前なので継続する
    // （ページ上部のパンくずに同じ語が現れることがある）。
    if (bills.length > 0 && FOOTER_MARKERS.includes(line)) break;

    const date = parseSubmittedDate(line);
    if (date) {
      currentDate = date;
      continue;
    }

    if (MEMBER_SECTION_RE.test(line)) {
      currentType = "member_bill";
      continue;
    }

    const billMatch = line.match(BILL_LINE_RE);
    if (!billMatch) continue;

    const billNumber = `第${Number(billMatch[1])}号`;
    const name = billMatch[2].trim();

    if (name.length === 0) {
      warnings.push(
        `${billNumber}議案: 件名が空のため読み飛ばしました（改行割れの可能性）`
      );
      continue;
    }

    // 同一ページ内の重複（ナビゲーションの再掲等）を弾く。
    // bill_type が違えば別議案なのでキーに含める。
    const key = `${currentType}:${billNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);

    bills.push({
      billNumber,
      billType: currentType,
      name,
      submittedDate: currentDate,
    });
  }

  return { sessionName, bills, warnings };
}

/**
 * 知事議案説明要旨（chiji-*.html）の冒頭にある議案件数を取り出す。
 *
 *   この議会に提案しております議案は、36件であります。
 *
 * パース結果の検算に使う（設計書 §2）。見つからなければ null。
 */
export function extractDeclaredBillCount(html: string): number | null {
  const lines = htmlToLines(html);
  for (const line of lines) {
    const m = line.match(/提案しております議案は、(\d+)件であります/);
    if (m) return Number(m[1]);
  }
  return null;
}
