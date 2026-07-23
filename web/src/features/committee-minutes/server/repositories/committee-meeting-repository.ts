import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type {
  CommitteeArchive,
  CommitteeMeetingDetail,
  CommitteeMeetingSummary,
  CommitteeMeetingTopic,
  CommitteeSpeech,
} from "../../shared/types";

type TopicRow = {
  id: string;
  topic_order: number;
  title: string;
  summary: string | null;
  discussion_summary: string | null;
  speakers: unknown;
  start_voice_no: number | null;
  end_voice_no: number | null;
};

type MeetingRow = {
  id: string;
  committee_name: string;
  committee_slug: string;
  meeting_date: string;
  title: string;
  source_document_id: number;
  source_url: string;
  summary: string | null;
  speeches: unknown;
  committee_meeting_topics: TopicRow[];
};

function mapTopics(rows: TopicRow[]): CommitteeMeetingTopic[] {
  return [...rows]
    .sort((a, b) => a.topic_order - b.topic_order)
    .map((t) => ({
      id: t.id,
      topicOrder: t.topic_order,
      title: t.title,
      summary: t.summary,
      discussionSummary: t.discussion_summary,
      speakers: Array.isArray(t.speakers)
        ? (t.speakers as { label: string }[])
        : [],
      startVoiceNo: t.start_voice_no,
      endVoiceNo: t.end_voice_no,
    }));
}

function mapSummary(row: MeetingRow): CommitteeMeetingSummary {
  return {
    id: row.id,
    committeeName: row.committee_name,
    committeeSlug: row.committee_slug,
    meetingDate: row.meeting_date,
    title: row.title,
    sourceDocumentId: row.source_document_id,
    sourceUrl: row.source_url,
    summary: row.summary,
    topics: mapTopics(row.committee_meeting_topics ?? []),
  };
}

/**
 * テーブル未作成による失敗か（マイグレーション適用前の環境）。
 * この場合のみ「データなし」として扱い、それ以外のDB障害はエラーとして伝播させる。
 */
function isMissingTableError(error: { code?: string | null }): boolean {
  // 42P01: undefined_table / PGRST205: スキーマキャッシュにテーブルなし
  return error.code === "42P01" || error.code === "PGRST205";
}

const LIST_SELECT = `
  id,
  committee_name,
  committee_slug,
  meeting_date,
  title,
  source_document_id,
  source_url,
  summary,
  committee_meeting_topics (*)
` as const;

export async function findAllMeetings(): Promise<CommitteeMeetingSummary[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committee_meetings")
    .select(LIST_SELECT)
    .eq("publish_status", "published")
    .order("meeting_date", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(`委員会会議の取得に失敗しました: ${error.message}`);
  }
  return (data ?? []).map((row) => mapSummary(row as unknown as MeetingRow));
}

export async function findMeetingsBySlug(
  slug: string
): Promise<CommitteeMeetingSummary[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committee_meetings")
    .select(LIST_SELECT)
    .eq("committee_slug", slug)
    .eq("publish_status", "published")
    .order("meeting_date", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(`委員会会議の取得に失敗しました: ${error.message}`);
  }
  return (data ?? []).map((row) => mapSummary(row as unknown as MeetingRow));
}

export async function findMeetingByDocumentId(
  documentId: number
): Promise<CommitteeMeetingDetail | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committee_meetings")
    .select(`*, committee_meeting_topics (*)`)
    .eq("source_document_id", documentId)
    .eq("publish_status", "published")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(`委員会会議の取得に失敗しました: ${error.message}`);
  }
  if (!data) return null;

  const row = data as unknown as MeetingRow;
  return {
    ...mapSummary(row),
    speeches: Array.isArray(row.speeches)
      ? (row.speeches as CommitteeSpeech[])
      : [],
  };
}

/** 会議データから委員会の一覧（最新開催日つき）を組み立てる */
export function buildArchives(
  meetings: CommitteeMeetingSummary[]
): CommitteeArchive[] {
  const bySlug = new Map<string, CommitteeMeetingSummary[]>();
  for (const m of meetings) {
    const list = bySlug.get(m.committeeSlug) ?? [];
    list.push(m);
    bySlug.set(m.committeeSlug, list);
  }
  return [...bySlug.entries()].map(([slug, list]) => {
    // 一覧は開催日降順なので先頭が最新。名称は最新開催時のものを使う
    const latest = list[0];
    return {
      slug,
      name: latest.committeeName,
      meetingCount: list.length,
      latestMeetingDate: latest.meetingDate,
    };
  });
}
