import "server-only";
import { findCouncilSessionsByYear } from "@/features/council-sessions/server/repositories/council-session-repository";
import { getCurrentCouncilSession } from "@/features/council-sessions/server/loaders/get-current-council-session";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import { findNextRegularSession } from "@/features/council-sessions/shared/utils/find-next-session";
import { getLatestPressConference } from "@/features/press-conferences/server/loaders/get-latest-press-conference";
import { findRecentPressConferenceRefs } from "@/features/press-conferences/server/repositories/press-conference-repository";
import type {
  PressConference,
  PressConferenceRef,
} from "@/features/press-conferences/shared/types";
import { getJapanTime } from "@/lib/utils/date";

/** 「これまでの会見」に出す件数 + 最新1件ぶん */
const RECENT_FETCH_COUNT = 4;

export type TopHeroData = {
  currentSession: CouncilSession | null;
  nextSession: CouncilSession | null;
  latestConference: PressConference | null;
  recentConferences: PressConferenceRef[];
};

/** 日本時間の "YYYY-MM-DD" */
function todayInJst(): string {
  const now = getJapanTime();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * ヒーローに必要なデータをまとめて取る（設計書 5.3 / 5.4 節）。
 *
 * 「次の定例会」は当年の会期から選ぶ。年をまたぐ直前は当年に候補が無くなるため、
 * 翌年ぶんも引いて繋ぐ。
 */
export async function loadTopHeroData(): Promise<TopHeroData> {
  const today = todayInJst();
  const year = Number(today.slice(0, 4));

  const [currentSession, thisYear, nextYear, latestConference, recentRefs] =
    await Promise.all([
      getCurrentCouncilSession(getJapanTime()),
      findCouncilSessionsByYear(year),
      findCouncilSessionsByYear(year + 1),
      getLatestPressConference(),
      findRecentPressConferenceRefs(RECENT_FETCH_COUNT),
    ]);

  const nextSession = findNextRegularSession([...thisYear, ...nextYear], today);

  // 最新1件はカード見出しに出るので、日付チップからは除く
  const recentConferences = recentRefs.filter(
    (ref) => ref.id !== latestConference?.id
  );

  return {
    currentSession,
    nextSession,
    latestConference,
    recentConferences,
  };
}
