import "server-only";
import { findBillStatusesBySession } from "@/features/bills/server/repositories/bill-repository";
import type { BillStatusSummary } from "@/features/bills/shared/utils/summarize-bill-statuses";
import { summarizeBillStatuses } from "@/features/bills/shared/utils/summarize-bill-statuses";
import { getSessionsWithBudget } from "@/features/budget-overview/server/loaders/get-sessions-with-budget";
import { findAllMeetings } from "@/features/committee-minutes/server/repositories/committee-meeting-repository";
import type { CommitteeMeetingSummary } from "@/features/committee-minutes/shared/types";
import { selectFeaturedMeetings } from "@/features/committee-minutes/shared/utils/select-featured-meetings";
import { findCouncilSessionsByYear } from "@/features/council-sessions/server/repositories/council-session-repository";
import {
  type SessionSlot,
  resolveSessionSlots,
} from "@/features/council-sessions/shared/utils/resolve-session-slot-status";
import { getGeneralQuestionsBySession } from "@/features/general-questions/server/loaders/get-general-questions-by-session";
import { findLatestSessionWithPublishedQuestions } from "@/features/general-questions/server/repositories/general-questions-repository";
import type { GeneralQuestion } from "@/features/general-questions/shared/types";
import { getJapanTime } from "@/lib/utils/date";

/** 委員会カードの表示件数。PC4件・スマホ3件だが、CSSで出し分けず多い方を取る */
const COMMITTEE_COUNT = 4;

/** 質問の表示件数（設計書 5.7 節） */
const QUESTION_COUNT = 3;

export type TopSectionsData = {
  sessionSlots: SessionSlot[];
  committeeMeetings: CommitteeMeetingSummary[];
  questions: GeneralQuestion[];
  questionSessionName: string | null;
  budgetSlug: string | null;
  budgetLabel: string | null;
  billSummary: BillStatusSummary;
  billsSessionSlug: string | null;
};

/** 日本時間の "YYYY-MM-DD" */
function todayInJst(): string {
  const now = getJapanTime();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** "令和8年 6月定例会" → "令和8年度の予算をテーマでたどる" */
function toBudgetLabel(sessionName: string): string {
  const match = sessionName.match(/^(令和\d+年)/);
  return match ? `${match[1]}度の予算をテーマでたどる` : "予算をテーマでたどる";
}

/**
 * トップの各セクションに必要なデータをまとめて取る（設計書 5.5〜5.9 節）。
 *
 * 件数の集計・選定・状態算出はすべて PR1 で入れた純粋関数に任せ、
 * ここは取得と受け渡しだけを行う。
 */
export async function loadTopSectionsData(): Promise<TopSectionsData> {
  const today = todayInJst();
  const year = Number(today.slice(0, 4));

  const [sessionsThisYear, meetings, questionSession, budgetSessions] =
    await Promise.all([
      findCouncilSessionsByYear(year),
      findAllMeetings(),
      findLatestSessionWithPublishedQuestions(),
      getSessionsWithBudget(),
    ]);

  const questions = questionSession
    ? (await getGeneralQuestionsBySession(questionSession.id)).slice(
        0,
        QUESTION_COUNT
      )
    : [];

  // 件数チップは質問と同じ最新会期を見る。会期が取れなければ空集計
  const billStatuses = questionSession
    ? await findBillStatusesBySession(questionSession.id)
    : [];

  const budgetSession = budgetSessions[0] ?? null;

  return {
    sessionSlots: resolveSessionSlots(sessionsThisYear, today),
    committeeMeetings: selectFeaturedMeetings(meetings, COMMITTEE_COUNT),
    questions,
    questionSessionName: questionSession?.name ?? null,
    budgetSlug: budgetSession?.slug ?? null,
    budgetLabel: budgetSession ? toBudgetLabel(budgetSession.name) : null,
    billSummary: summarizeBillStatuses(billStatuses),
    billsSessionSlug: questionSession?.slug ?? null,
  };
}
