import "server-only";
import { findBillStatusesBySession } from "@/features/bills/server/repositories/bill-repository";
import { summarizeBillStatuses } from "@/features/bills/shared/utils/summarize-bill-statuses";
import { findCouncilSessionsByYear } from "@/features/council-sessions/server/repositories/council-session-repository";
import { getCurrentCouncilSession } from "@/features/council-sessions/server/loaders/get-current-council-session";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import { findNextRegularSession } from "@/features/council-sessions/shared/utils/find-next-session";
import { countQuestionersBySession } from "@/features/general-questions/server/repositories/general-questions-repository";
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
  /**
   * 開催中の会期の入口タイル用の件数（設計書 5.3.2 節 段階2）。
   * 閉会中は null。0件のタイルは出さないので、呼び出し側で判定する
   */
  inSessionCounts: InSessionCounts | null;
  /**
   * このローダーが基準にした日本時間の日付（"YYYY-MM-DD"）。
   *
   * 会期の進み具合を出すのに要る。呼び出し側で取り直すと、
   * 日付が変わる瞬間に会期判定と進み具合がズレうるため渡す
   */
  today: string;
};

/** 会期中ヒーローの入口タイルに出す件数 */
export type InSessionCounts = {
  /** 審議中の議案数。可決済みなどは含まない */
  deliberatingBills: number;
  /** 質問した議員の人数（件数ではない） */
  questioners: number;
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
    inSessionCounts: await loadInSessionCounts(currentSession),
    today,
  };
}

/**
 * 会期中ヒーローの入口タイル用の件数を取る。
 *
 * 閉会中は引かない。会期中ヒーロー自体が出ないため
 */
async function loadInSessionCounts(
  currentSession: CouncilSession | null
): Promise<InSessionCounts | null> {
  if (!currentSession) return null;

  const [billStatuses, questioners] = await Promise.all([
    findBillStatusesBySession(currentSession.id),
    countQuestionersBySession(currentSession.id),
  ]);

  return {
    deliberatingBills: summarizeBillStatuses(billStatuses).deliberatingCount,
    questioners,
  };
}
