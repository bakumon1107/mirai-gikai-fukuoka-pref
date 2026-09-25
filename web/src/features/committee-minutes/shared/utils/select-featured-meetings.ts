import type { CommitteeMeetingSummary } from "../types";

/**
 * 質疑が薄い回とみなす発言数の下限。
 *
 * これ未満の回はトップに出さず、その委員会の一つ前の回を候補にする
 * （設計書 5.6 節の選定ルール2）。
 */
export const MIN_SPEECH_COUNT = 10;

/**
 * トップページに出す委員会の回を選ぶ（設計書 5.6 節）。
 *
 * 1. 委員会ごとに最新の開催回を取る（1委員会1枚）
 * 2. 発言数が {@link MIN_SPEECH_COUNT} 未満の回は除外し、一つ前の回を候補にする
 * 3. 開催日の新しい順に並べて上位 `limit` 件
 *
 * @param meetings 公開済みの会議（順不同でよい）
 * @param limit 取り出す件数（PC 4件 / スマホ 3件）
 */
export function selectFeaturedMeetings(
  meetings: CommitteeMeetingSummary[],
  limit: number
): CommitteeMeetingSummary[] {
  if (limit <= 0) return [];

  const bySlug = new Map<string, CommitteeMeetingSummary[]>();
  for (const meeting of meetings) {
    const list = bySlug.get(meeting.committeeSlug);
    if (list) {
      list.push(meeting);
    } else {
      bySlug.set(meeting.committeeSlug, [meeting]);
    }
  }

  const picked: CommitteeMeetingSummary[] = [];
  for (const list of bySlug.values()) {
    const candidate = pickFromCommittee(list);
    if (candidate) picked.push(candidate);
  }

  return picked
    .sort((a, b) => compareDateDesc(a.meetingDate, b.meetingDate))
    .slice(0, limit);
}

/**
 * 1委員会ぶんから1回を選ぶ。
 *
 * 開催日の新しい順に見て、最初に発言数の条件を満たした回を返す。
 * すべて満たさなければ選ばない（無理に薄い回を出さない）。
 */
function pickFromCommittee(
  list: CommitteeMeetingSummary[]
): CommitteeMeetingSummary | null {
  const sorted = [...list].sort((a, b) =>
    compareDateDesc(a.meetingDate, b.meetingDate)
  );

  for (const meeting of sorted) {
    if (hasEnoughSpeeches(meeting)) return meeting;
  }

  return null;
}

/**
 * 発言数が足りているか。
 *
 * `speechCount` が null（未取得）の場合は判定できないため、
 * 除外せず通す。件数表示側でフォールバックする。
 */
function hasEnoughSpeeches(meeting: CommitteeMeetingSummary): boolean {
  if (meeting.speechCount === null) return true;
  return meeting.speechCount >= MIN_SPEECH_COUNT;
}

/** "YYYY-MM-DD" の降順比較 */
function compareDateDesc(a: string, b: string): number {
  return b.localeCompare(a);
}
