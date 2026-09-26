import type { SessionMilestones } from "./parse-session-schedule";

/**
 * 既存の節目に、新しく取れた節目を重ねる。
 *
 * **取れなかった項目で既存値を消さない。** 閉会日を
 * `session.endDate ?? existing.end_date` で守っているのと同じ考え方を、
 * 節目の**項目ごと**に適用する。
 *
 * オブジェクト単位で見るだけでは足りない理由:
 *
 * - 日程ページは取れたが中身が全部 null という結果がありうる
 *   （表の構造が変わった・議事日程がまだ空、など）。
 *   これを「取れた」と扱うと、一度入った正しい節目を全部消す。
 * - 一部の項目だけ取れないこともある（会期途中で常任委員会の
 *   日程が未掲載など）。その項目だけ消えるのも避けたい。
 *
 * 既存・新規ともに何も無ければ null を返す。
 */
export function mergeSessionMilestones(
  existing: SessionMilestones | null,
  scraped: SessionMilestones | null
): SessionMilestones | null {
  if (!existing && !scraped) return null;

  const merged: SessionMilestones = {
    representativeQuestions:
      scraped?.representativeQuestions ??
      existing?.representativeQuestions ??
      null,
    generalQuestions:
      scraped?.generalQuestions ?? existing?.generalQuestions ?? null,
    standingCommittees:
      scraped?.standingCommittees ?? existing?.standingCommittees ?? null,
    billVote: scraped?.billVote ?? existing?.billVote ?? null,
  };

  return hasAnyMilestone(merged) ? merged : null;
}

/** 1項目でも値があるか */
export function hasAnyMilestone(milestones: SessionMilestones): boolean {
  return (
    milestones.representativeQuestions !== null ||
    milestones.generalQuestions !== null ||
    milestones.standingCommittees !== null ||
    milestones.billVote !== null
  );
}
