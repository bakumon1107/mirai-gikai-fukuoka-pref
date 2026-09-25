import "server-only";
import { findCouncilSessionsByYear } from "@/features/council-sessions/server/repositories/council-session-repository";
import { getCurrentCouncilSession } from "@/features/council-sessions/server/loaders/get-current-council-session";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import { findNextRegularSession } from "@/features/council-sessions/shared/utils/find-next-session";
import {
  findLatestPressConferenceSummary,
  findRecentPressConferenceRefs,
} from "@/features/press-conferences/server/repositories/press-conference-repository";
import type {
  PressConferenceRef,
  PressConferenceSummary,
} from "@/features/press-conferences/shared/types";
import { getJapanTime } from "@/lib/utils/date";

/** 「これまでの会見」に出す件数 + 最新1件ぶん */
const RECENT_FETCH_COUNT = 4;

/** 会見カードに出す話題の上限（設計書 5.4 節） */
const MAX_TOPICS = 4;

export type TopHeroData = {
  currentSession: CouncilSession | null;
  nextSession: CouncilSession | null;
  latestConference: PressConferenceSummary | null;
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

  // 会見は「最新1件（話題つき）」と「直近の日付だけ」の2本で足りる。
  // getPressConferences() は全会見の全発言本文まで引くので使わない（設計書 5.4節）
  const [currentSession, thisYear, nextYear, latestConference, recentRefs] =
    await Promise.all([
      getCurrentCouncilSession(getJapanTime()),
      findCouncilSessionsByYear(year),
      findCouncilSessionsByYear(year + 1),
      findLatestPressConferenceSummary(MAX_TOPICS),
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
