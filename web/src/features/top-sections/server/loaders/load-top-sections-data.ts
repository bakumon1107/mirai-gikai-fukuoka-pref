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
import {
  type LatestQuestionSession,
  findLatestSessionWithPublishedQuestions,
} from "@/features/general-questions/server/repositories/general-questions-repository";
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
  /**
   * 件数を数えた会期が、いま開会中の会期かどうか。
   *
   * 見出しの「いまN件を審議中」はこれで出し分ける。サイト全体の
   * 「会期中か」ではないことに注意（下の {@link loadTopSectionsData} 参照）。
   */
  isBillSessionInSession: boolean;
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

  const sessionSlots = resolveSessionSlots(sessionsThisYear, today);
  const bills = await resolveBillSummary(sessionSlots, questionSession);

  const budgetSession = budgetSessions[0] ?? null;

  return {
    sessionSlots,
    committeeMeetings: selectFeaturedMeetings(meetings, COMMITTEE_COUNT),
    questions,
    questionSessionName: questionSession?.name ?? null,
    budgetSlug: budgetSession?.slug ?? null,
    budgetLabel: budgetSession ? toBudgetLabel(budgetSession.name) : null,
    billSummary: bills.summary,
    billsSessionSlug: bills.sessionSlug,
    isBillSessionInSession: bills.isInSession,
  };
}

/**
 * 議案カードの件数を、どの会期から数えるか決める。
 *
 * 素直に「質問がある最新会期」を使うと、**会期が始まってから質問が
 * 公開されるまでの数週間**、前回会期の議案を数えたまま見出しだけ
 * 「いまN件を審議中」になり、可決済みの議案を審議中と言ってしまう。
 * 開会中の会期があればそちらを優先し、その会期に議案がまだ1件も
 * 入っていなければ前回会期の実績に戻す（そのときは「いま」と言わない）。
 */
async function resolveBillSummary(
  slots: SessionSlot[],
  fallbackSession: LatestQuestionSession | null
): Promise<{
  summary: BillStatusSummary;
  sessionSlug: string | null;
  isInSession: boolean;
}> {
  const current = slots.find((slot) => slot.status === "in_session")?.session;

  if (current) {
    const statuses = await findBillStatusesBySession(current.id);
    if (statuses.length > 0) {
      return {
        summary: summarizeBillStatuses(statuses),
        sessionSlug: current.slug,
        isInSession: true,
      };
    }
  }

  if (!fallbackSession) {
    return {
      summary: summarizeBillStatuses([]),
      sessionSlug: null,
      isInSession: false,
    };
  }

  return {
    summary: summarizeBillStatuses(
      await findBillStatusesBySession(fallbackSession.id)
    ),
    sessionSlug: fallbackSession.slug,
    isInSession: false,
  };
}
