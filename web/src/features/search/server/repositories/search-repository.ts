import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type {
  BillSearchResult,
  BudgetSearchResult,
  CommitteeSearchResult,
  QuestionSearchResult,
} from "../../shared/types/search-types";

/**
 * テーブル未作成による失敗か（マイグレーション適用前の環境）。
 * この場合のみ「データなし」として扱い、それ以外のDB障害はエラーとして伝播させる。
 */
function isMissingTableError(error: { code?: string | null }): boolean {
  // 42P01: undefined_table / PGRST205: スキーマキャッシュにテーブルなし
  return error.code === "42P01" || error.code === "PGRST205";
}

export async function searchBills(query: string): Promise<BillSearchResult[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_contents")
    .select(
      `
      bill_id,
      title,
      summary,
      bills!inner (
        id,
        publish_status,
        published_at,
        council_sessions (name),
        bills_tags (
          tags (label)
        )
      )
    `
    )
    .eq("difficulty_level", "normal")
    .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
    .limit(50);

  if (error) throw new Error(`Failed to search bills: ${error.message}`);

  return (data ?? [])
    .filter((row) => {
      const bill = row.bills as { publish_status: string };
      return bill.publish_status === "published";
    })
    .map((row) => {
      const bill = row.bills as {
        id: string;
        published_at: string | null;
        council_sessions: { name: string } | null;
        bills_tags: Array<{ tags: { label: string } | null }>;
      };
      return {
        id: bill.id,
        title: row.title,
        summary: row.summary,
        session: bill.council_sessions?.name ?? "",
        publishedAt: bill.published_at,
        tags: bill.bills_tags
          .map((bt) => bt.tags?.label)
          .filter((l): l is string => l != null),
      };
    });
}

export async function searchGeneralQuestions(
  query: string
): Promise<QuestionSearchResult[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("general_questions")
    .select(
      `
      id,
      questioner_name,
      summary,
      topics,
      council_sessions (name)
    `
    )
    .eq("publish_status", "published")
    .or(`summary.ilike.%${query}%,questioner_name.ilike.%${query}%`)
    .limit(50);

  if (error) throw new Error(`Failed to search questions: ${error.message}`);

  return (data ?? []).map((row) => {
    const topics = Array.isArray(row.topics)
      ? (row.topics as Array<{ title: string }>)
      : [];
    const session =
      (row.council_sessions as { name: string } | null)?.name ?? "";
    return {
      id: row.id,
      questioner: row.questioner_name,
      topics: topics.map((t) => t.title),
      summary: row.summary,
      session,
    };
  });
}

export async function searchBudgets(
  query: string
): Promise<BudgetSearchResult[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("budget_overviews")
    .select(
      `
      id,
      department_name,
      department_slug,
      direction,
      council_sessions!inner (name, slug)
    `
    )
    .eq("publish_status", "published")
    .or(`department_name.ilike.%${query}%,direction.ilike.%${query}%`)
    .limit(50);

  if (error) throw new Error(`Failed to search budgets: ${error.message}`);

  return (data ?? []).map((row) => {
    const session = row.council_sessions as { name: string; slug: string };
    return {
      id: row.id,
      departmentName: row.department_name,
      direction: row.direction,
      session: session?.name ?? "",
      sessionSlug: session?.slug ?? "",
      departmentSlug: row.department_slug,
    };
  });
}

type CommitteeMeetingSearchRow = {
  id: string;
  committee_name: string;
  committee_slug: string;
  meeting_date: string;
  title: string;
  source_document_id: number;
  summary: string | null;
};

const COMMITTEE_MEETING_SELECT = `
  id,
  committee_name,
  committee_slug,
  meeting_date,
  title,
  source_document_id,
  summary
` as const;

function toCommitteeResult(
  row: CommitteeMeetingSearchRow
): CommitteeSearchResult {
  return {
    id: row.id,
    committeeName: row.committee_name,
    committeeSlug: row.committee_slug,
    title: row.title,
    summary: row.summary,
    meetingDate: row.meeting_date,
    sourceDocumentId: row.source_document_id,
    matchedTopics: [],
  };
}

export async function searchCommittees(
  query: string
): Promise<CommitteeSearchResult[]> {
  const supabase = createAdminClient();
  const like = `%${query}%`;

  // 1) 会議のタイトル・要約・委員会名で検索
  // 委員会の一覧・詳細ページと同様、公開（published）の会議のみを対象とする
  const meetingsRes = await supabase
    .from("committee_meetings")
    .select(COMMITTEE_MEETING_SELECT)
    .eq("publish_status", "published")
    .or(
      `title.ilike.${like},summary.ilike.${like},committee_name.ilike.${like}`
    )
    .limit(50);

  if (meetingsRes.error) {
    // マイグレーション未適用の環境では委員会分のみ空にして他の検索を活かす
    if (isMissingTableError(meetingsRes.error)) return [];
    throw new Error(
      `Failed to search committees: ${meetingsRes.error.message}`
    );
  }

  // 会議IDをキーに結果をまとめ、議題マッチはタイトルを追記する
  const byId = new Map<string, CommitteeSearchResult>();
  for (const row of (meetingsRes.data ?? []) as CommitteeMeetingSearchRow[]) {
    byId.set(row.id, toCommitteeResult(row));
  }

  // 2) 議題のタイトル・要約で検索し、親会議（公開のもの）に紐づける
  const topicsRes = await supabase
    .from("committee_meeting_topics")
    .select(
      `title, committee_meetings!inner (${COMMITTEE_MEETING_SELECT}, publish_status)`
    )
    .eq("committee_meetings.publish_status", "published")
    .or(`title.ilike.${like},summary.ilike.${like}`)
    .limit(100);

  if (topicsRes.error) {
    if (isMissingTableError(topicsRes.error)) {
      return [...byId.values()];
    }
    throw new Error(`Failed to search committees: ${topicsRes.error.message}`);
  }

  for (const row of (topicsRes.data ?? []) as Array<{
    title: string;
    committee_meetings: CommitteeMeetingSearchRow | null;
  }>) {
    const meeting = row.committee_meetings;
    if (!meeting) continue;
    const existing = byId.get(meeting.id) ?? toCommitteeResult(meeting);
    if (row.title && !existing.matchedTopics.includes(row.title)) {
      existing.matchedTopics.push(row.title);
    }
    byId.set(meeting.id, existing);
  }

  return [...byId.values()].slice(0, 50);
}
