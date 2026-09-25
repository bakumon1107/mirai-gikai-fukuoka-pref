import { createAdminClient } from "@mirai-gikai/supabase";
import { afterAll, describe, expect, it } from "vitest";
import { selectFeaturedMeetings } from "../../shared/utils/select-featured-meetings";
import { findAllMeetings } from "./committee-meeting-repository";

/**
 * speech_count（生成列）が一覧取得の経路で引けることを、実DBに対して確認する。
 *
 * PostgREST は生成列を読み取り専用カラムとして公開するが、
 * LIST_SELECT に足した列がスキーマキャッシュに乗るかは実際に叩かないと分からない。
 */

const DOC_ID_MANY = 990001;
const DOC_ID_FEW = 990002;

/** このテストが作った行のid。後始末はこれだけを消す */
const createdIds: string[] = [];

function buildSpeeches(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    voiceNo: i + 1,
    speakerLabel: "委員",
    speakerType: "member",
    text: "発言",
  }));
}

/**
 * 同じ source_document_id の行が既にあれば中断する。
 *
 * 後始末で他人のデータを巻き込まないため、衝突時は消さずに落とす。
 */
async function assertNoCollision() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("committee_meetings")
    .select("source_document_id")
    .in("source_document_id", [DOC_ID_MANY, DOC_ID_FEW]);

  if (data && data.length > 0) {
    const ids = data.map((r) => r.source_document_id).join(", ");
    throw new Error(
      `テスト用の source_document_id が既に使われています: ${ids}。` +
        "手動で確認してください（このテストは削除しません）"
    );
  }
}

async function seed() {
  const supabase = createAdminClient();
  const rows = [
    {
      committee_name: "テスト農林水産委員会",
      committee_slug: "test-nourin",
      meeting_date: "2026-07-14",
      title: "会議録",
      source_document_id: DOC_ID_MANY,
      source_url: "https://example.com",
      raw_text: "raw",
      speeches: buildSpeeches(30),
      publish_status: "published",
    },
    {
      committee_name: "テスト県土整備委員会",
      committee_slug: "test-kendo",
      meeting_date: "2026-05-20",
      title: "会議録",
      source_document_id: DOC_ID_FEW,
      source_url: "https://example.com",
      raw_text: "raw",
      speeches: buildSpeeches(6),
      publish_status: "published",
    },
  ];

  const { data, error } = await supabase
    .from("committee_meetings")
    .insert(rows)
    .select("id");

  if (error) throw new Error(`テストデータの投入に失敗: ${error.message}`);
  createdIds.push(...(data ?? []).map((r) => r.id));
}

/** このテストが作った行だけを消す */
async function cleanup() {
  if (createdIds.length === 0) return;

  const supabase = createAdminClient();
  await supabase.from("committee_meetings").delete().in("id", createdIds);
  createdIds.length = 0;
}

describe("committee-meeting-repository / speech_count", () => {
  afterAll(async () => {
    await cleanup();
  });

  it("一覧取得で speech_count が実値として返る", async () => {
    await assertNoCollision();
    await seed();

    const meetings = await findAllMeetings();
    const many = meetings.find((m) => m.sourceDocumentId === DOC_ID_MANY);
    const few = meetings.find((m) => m.sourceDocumentId === DOC_ID_FEW);

    expect(many?.speechCount).toBe(30);
    expect(few?.speechCount).toBe(6);
  });

  it("選定ロジックが発言数の少ない回を落とす", async () => {
    const meetings = (await findAllMeetings()).filter((m) =>
      m.committeeSlug.startsWith("test-")
    );
    const featured = selectFeaturedMeetings(meetings, 4);

    expect(featured.map((m) => m.sourceDocumentId)).toEqual([DOC_ID_MANY]);
  });
});
