import type { CouncilSession } from "../types";

/**
 * 定例会の帯（トップページ）の状態。
 *
 * 設計書 5.5 節。強調枠は常に1つだけになるよう、
 * 会期中は `in_session` のみを強調し `next` は出さない。
 */
export type SessionSlotStatus = "finished" | "in_session" | "next" | "upcoming";

/** 定例会が開かれる月。福岡県議会は年4回（設計書 5.5.1 節で実データ確認済み） */
export const REGULAR_SESSION_MONTHS = [2, 6, 9, 12] as const;

export type RegularSessionMonth = (typeof REGULAR_SESSION_MONTHS)[number];

/** 各回の一行説明。固定文言 */
const MONTH_DESCRIPTIONS: Record<RegularSessionMonth, string> = {
  2: "新しい年度の予算を決める",
  6: "条例や工事契約などを審議",
  9: "補正予算や決算を審議",
  12: "年内最後の議案を審議",
};

export type SessionSlot = {
  month: RegularSessionMonth;
  description: string;
  status: SessionSlotStatus;
  /** 該当する会期。DBに無い回（日程未掲載など）は null */
  session: CouncilSession | null;
};

/**
 * 臨時会を除き、定例会だけを残す。
 *
 * `council_sessions` には臨時会も入る（令和7年4月・5月、令和8年8月など）。
 * 帯に流し込む前に必ず通すこと。
 */
export function isRegularSession(session: CouncilSession): boolean {
  return session.name.includes("定例会");
}

/** "YYYY-MM-DD" を数値比較できる形に落とす。タイムゾーンの影響を受けない */
function toComparable(date: string): number {
  return Number(date.slice(0, 10).replaceAll("-", ""));
}

function monthOf(session: CouncilSession): number {
  return Number(session.start_date.slice(5, 7));
}

/**
 * 当年の定例会4回ぶんのスロットを組み立てる。
 *
 * @param sessions 当年の `council_sessions`（臨時会が混ざっていてよい）
 * @param today 基準日（"YYYY-MM-DD"）
 */
export function resolveSessionSlots(
  sessions: CouncilSession[],
  today: string
): SessionSlot[] {
  const now = toComparable(today);

  const byMonth = new Map<number, CouncilSession>();
  for (const session of sessions.filter(isRegularSession)) {
    const month = monthOf(session);
    // 同じ月に複数あるときは開会が早いものを採る
    const existing = byMonth.get(month);
    if (!existing || session.start_date < existing.start_date) {
      byMonth.set(month, session);
    }
  }

  // 各会期について「次に開会する会期の開会日」を求めておく。
  // end_date が無い会期の打ち切り判定に使う
  const ordered = [...byMonth.values()].sort((a, b) =>
    a.start_date.localeCompare(b.start_date)
  );
  const nextStartById = new Map<string, number | null>();
  for (let i = 0; i < ordered.length; i++) {
    const next = ordered[i + 1];
    nextStartById.set(
      ordered[i].id,
      next ? toComparable(next.start_date) : null
    );
  }

  const inSessionOf = (session: CouncilSession) =>
    isInSession(session, now, nextStartById.get(session.id) ?? null);

  // 会期中の回があるか。あるなら「つぎはここ」は出さない（強調は常に1つ）
  const hasInSession = ordered.some(inSessionOf);

  // 「つぎはここ」に当たる回（まだ開会していない回のうち最も早いもの）
  let nextMonth: number | null = null;
  if (!hasInSession) {
    let earliest = Number.POSITIVE_INFINITY;
    for (const [month, session] of byMonth) {
      const start = toComparable(session.start_date);
      if (start > now && start < earliest) {
        earliest = start;
        nextMonth = month;
      }
    }
  }

  return REGULAR_SESSION_MONTHS.map((month) => {
    const session = byMonth.get(month) ?? null;
    return {
      month,
      description: MONTH_DESCRIPTIONS[month],
      status: resolveStatus(session, now, month === nextMonth, inSessionOf),
      session,
    };
  });
}

/**
 * 会期中かどうか。
 *
 * `end_date` が無い会期（閉会日が未取得・会期中で未確定）は、開会済みなら
 * 会期中とみなす。ただし**次の会期が既に開会していれば、そこで打ち切る**。
 * そうしないと、閉会日を取り損ねた古い会期が永久に「会期中」になり、
 * 「強調枠は常に1つ」（設計書 5.5節）が壊れる。
 *
 * @param nextStart 次に開会する会期の開会日（数値比較用）。無ければ null
 */
function isInSession(
  session: CouncilSession,
  now: number,
  nextStart: number | null
): boolean {
  const start = toComparable(session.start_date);
  if (start > now) return false;

  if (!session.end_date) {
    // 次の会期が始まっていれば、この会期は終わったものとして扱う
    if (nextStart !== null && nextStart <= now) return false;
    return true;
  }

  return now <= toComparable(session.end_date);
}

function resolveStatus(
  session: CouncilSession | null,
  now: number,
  isNext: boolean,
  inSessionOf: (session: CouncilSession) => boolean
): SessionSlotStatus {
  // 日程がまだ公式に掲載されていない回。フォールバックで「これから」
  if (!session) return isNext ? "next" : "upcoming";

  if (inSessionOf(session)) return "in_session";

  if (session.end_date && toComparable(session.end_date) < now) {
    return "finished";
  }

  if (toComparable(session.start_date) > now) {
    return isNext ? "next" : "upcoming";
  }

  return "finished";
}
