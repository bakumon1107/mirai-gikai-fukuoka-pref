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
  /** トップの「会期の流れ」に出す節目（設計書 5.3.3 節） */
  milestones: SessionMilestones;
  warnings: string[];
};

/** 日付の範囲。1日だけなら from と to が同じ */
export type DateRange = {
  from: string;
  to: string;
};

/**
 * 会期の節目。取れなかったものは null（呼び出し側は行ごと出さない）。
 *
 * **採決日は閉会日と別に持つ。** 令和8年9月定例会は議案採決 10月1日・
 * 閉会 10月16日で、あいだに決算特別委員会が入る。一方
 * 令和7年12月定例会は同じ日（12月19日）。どちらもありうるため、
 * 「閉会日＝採決日」と決め打ちしない（設計書 5.3.3 節）。
 */
export type SessionMilestones = {
  /** 代表質問が行われる日の範囲 */
  representativeQuestions: DateRange | null;
  /** 一般質問が行われる日の範囲 */
  generalQuestions: DateRange | null;
  /** 常任委員会の審査日の範囲 */
  standingCommittees: DateRange | null;
  /** 議案が採決される日 */
  billVote: string | null;
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
  return normalize(line) === "閉会" || normalize(line) === "閉会式";
}

/**
 * 行から空白・ゼロ幅文字を落とす。
 *
 * 実ページでは「開 会」「閉 会」のように全角スペースが挟まることがある
 * （令和7年5月臨時会）。U+200B が前置される行もある。
 */
function normalize(line: string): string {
  return line.replace(/[\s　​]/g, "");
}

/**
 * 節目を示す議事日程の行。
 *
 * **完全一致で見る。** 部分一致にすると「決算関係議案報告上程」が
 * 「議案」に、「決算特別委員長報告・採決」が「採決」に引っかかる。
 * 実ページで両方とも出てくる（令和8年9月定例会）。
 */
const MILESTONE_LINES = {
  representativeQuestions: ["代表質問"],
  generalQuestions: ["一般質問"],
  standingCommittees: ["常任委員会"],
  billVote: ["議案採決"],
} as const;

type MilestoneKey = keyof typeof MILESTONE_LINES;

/**
 * 日程表の終わりを示す行。
 *
 * 表の下にページ内ナビが続き、そこに「代表質問」「一般質問」への
 * リンクが**単独行として**並ぶ。打ち切らないと、これらが最終日
 * （閉会日）の議事日程として数えられ、質問の範囲が閉会日まで伸びる。
 *
 * ナビは「日程 ｜ 提出議案 ｜ …」の形で、区切りの「｜」だけの行が
 * 表の中には現れない。これを境にする。
 */
function isFooterStart(line: string): boolean {
  const normalized = normalize(line);
  return normalized === "｜" || normalized === "1つ前のページに戻る";
}

function milestoneOf(line: string): MilestoneKey | null {
  const normalized = normalize(line);
  for (const [key, patterns] of Object.entries(MILESTONE_LINES)) {
    if ((patterns as readonly string[]).includes(normalized)) {
      return key as MilestoneKey;
    }
  }
  return null;
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
      milestones: emptyMilestones(),
      warnings: ["会期日程の見出しから年を取得できませんでした"],
    };
  }

  let startDate: string | null = null;
  let endDate: string | null = null;
  let year = baseYear;
  let prevMonth: number | null = null;
  // 直近に読んだ日付。次に「閉会」行が来たらその日が閉会日。
  let currentDate: string | null = null;
  // 節目ごとの出現日。範囲にするため最初と最後を持つ
  const seen: Record<MilestoneKey, string[]> = {
    representativeQuestions: [],
    generalQuestions: [],
    standingCommittees: [],
    billVote: [],
  };

  for (const line of lines) {
    // 表の下のナビにも「代表質問」「一般質問」が並ぶため、ここで打ち切る
    if (isFooterStart(line)) break;

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

    if (currentDate === null) continue;

    if (isClosingLine(line)) {
      // 「閉会」は複数回現れうる（閉会中の調査事項付議など）。最後を採用する
      endDate = currentDate;
      continue;
    }

    const key = milestoneOf(line);
    if (key) seen[key].push(currentDate);
  }

  if (startDate === null) {
    warnings.push("日程表から開会日を取得できませんでした");
  }
  if (endDate === null) {
    warnings.push("日程表に「閉会」の記載がありません（会期中の可能性）");
  }

  const milestones: SessionMilestones = {
    representativeQuestions: toRange(seen.representativeQuestions),
    generalQuestions: toRange(seen.generalQuestions),
    standingCommittees: toRange(seen.standingCommittees),
    // 採決は1日で終わるが、表記揺れで複数日に出たら最後を採る
    billVote: seen.billVote.at(-1) ?? null,
  };

  // 代表質問・一般質問は臨時会だと行わないことがあり、欠けていても異常ではない
  // ので警告しない。採決はどの会期でも行うため、取れなければ知らせる
  if (milestones.billVote === null) {
    warnings.push("日程表に「議案採決」の記載がありません");
  }

  return { startDate, endDate, milestones, warnings };
}

function emptyMilestones(): SessionMilestones {
  return {
    representativeQuestions: null,
    generalQuestions: null,
    standingCommittees: null,
    billVote: null,
  };
}

/** 出現日の配列を範囲に畳む。日付は走査順＝日程順に入る */
function toRange(dates: string[]): DateRange | null {
  if (dates.length === 0) return null;

  const sorted = [...dates].sort();
  return { from: sorted[0], to: sorted[sorted.length - 1] };
}
