import type { DateRange, SessionMilestones } from "../types";

/**
 * DBの `council_sessions.schedule_milestones`（jsonb）を型へ落とす。
 *
 * **防御的に読む。** jsonb なのでDB側に形の保証がなく、投入スクリプトの
 * 不具合や手動更新で欠けた形が入りうる。読めなかった項目は null にし、
 * 呼び出し側は行ごと出さない（設計書 7章）。全項目が読めなければ null。
 */
export function parseSessionMilestones(
  value: unknown
): SessionMilestones | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const milestones: SessionMilestones = {
    representativeQuestions: parseRange(source.representativeQuestions),
    generalQuestions: parseRange(source.generalQuestions),
    standingCommittees: parseRange(source.standingCommittees),
    billVote: parseDate(source.billVote),
  };

  const hasAny = Object.values(milestones).some((v) => v !== null);
  return hasAny ? milestones : null;
}

/** "YYYY-MM-DD" として読める文字列だけ通す */
function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/**
 * `{ from, to }` を読む。
 *
 * 逆順（from > to）は壊れた値として捨てる。バーや期間表示が
 * おかしくなるより、行を出さないほうがよい。
 */
function parseRange(value: unknown): DateRange | null {
  if (typeof value !== "object" || value === null) return null;

  const source = value as Record<string, unknown>;
  const from = parseDate(source.from);
  const to = parseDate(source.to);
  if (from === null || to === null) return null;

  return from <= to ? { from, to } : null;
}
