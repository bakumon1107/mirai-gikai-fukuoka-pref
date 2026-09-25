import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type {
  BillPublishStatus,
  BillStatusEnum,
  MiraiStance,
} from "../../shared/types";

// ============================================================
// Bills
// ============================================================

/**
 * 公開済み議案を難易度コンテンツ付きで取得
 */
export async function findPublishedBillsWithContents(
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      *,
      bill_contents!inner (
        id,
        bill_id,
        title,
        summary,
        content,
        difficulty_level,
        created_at,
        updated_at
      )
    `
    )
    .eq("publish_status", "published")
    .eq("bill_contents.difficulty_level", difficultyLevel)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch bills: ${error.message}`);
  }

  return data;
}

/**
 * 公開済み議案を1件取得
 */
export async function findPublishedBillById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("id", id)
    .eq("publish_status", "published")
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * 管理者用: ステータス問わず議案を1件取得
 */
export async function findBillById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * 議案のmirai_stanceを取得
 * 福岡県議会DBにはmirai_stancesテーブルが存在しないため常にnullを返す
 */
export async function findMiraiStanceByBillId(
  _billId: string
): Promise<MiraiStance | null> {
  return null;
}

/**
 * 議案に紐づく会派見解を取得
 */
export async function findFactionStancesByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("faction_stances")
    .select(
      `
      id,
      type,
      comment,
      factions (
        id,
        name,
        display_name,
        sort_order
      )
    `
    )
    .eq("bill_id", billId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Failed to fetch faction stances: ${error.message}`);
    return [];
  }

  return data ?? [];
}

/**
 * 議案のタグを取得
 */
export async function findTagsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills_tags")
    .select("tags(id, label)")
    .eq("bill_id", billId);

  if (error) {
    return null;
  }

  return data;
}

// ============================================================
// Bill Contents
// ============================================================

/**
 * 指定された難易度の議案コンテンツを取得
 */
export async function findBillContentByDifficulty(
  billId: string,
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_contents")
    .select("*")
    .eq("bill_id", billId)
    .eq("difficulty_level", difficultyLevel)
    .single();

  if (error) {
    console.error(`Failed to fetch bill content: ${error.message}`);
    return null;
  }

  return data;
}

// ============================================================
// Tags (bulk)
// ============================================================

import { groupTagsByBillId } from "../../shared/utils/group-tags";

/**
 * 複数のbill_idに紐づくタグを一括取得し、bill_idごとにグループ化して返す
 */
export async function findTagsByBillIds(
  billIds: string[]
): Promise<Map<string, Array<{ id: string; label: string }>>> {
  if (billIds.length === 0) {
    return new Map();
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills_tags")
    .select("bill_id, tags(id, label)")
    .in("bill_id", billIds);

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  return groupTagsByBillId(data ?? []);
}

// ============================================================
// Council Session Bills
// ============================================================

/**
 * 定例会IDに紐づく公開済み議案を取得
 */
export async function findPublishedBillsByDietSession(
  councilSessionId: string,
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      *,
      bill_contents!inner (
        id,
        bill_id,
        title,
        summary,
        content,
        difficulty_level,
        created_at,
        updated_at
      )
    `
    )
    .eq("council_session_id", councilSessionId)
    .eq("publish_status", "published")
    .eq("bill_contents.difficulty_level", difficultyLevel)
    .order("status_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch bills by council session: ${error.message}`
    );
  }

  return data;
}

/**
 * 前回の定例会の公開済み議案を取得（件数制限あり）
 */
export async function findPreviousSessionBills(
  councilSessionId: string,
  difficultyLevel: DifficultyLevelEnum,
  limit: number
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      *,
      bill_contents!inner (
        id,
        bill_id,
        title,
        summary,
        content,
        difficulty_level,
        created_at,
        updated_at
      )
    `
    )
    .eq("council_session_id", councilSessionId)
    .eq("publish_status", "published")
    .eq("bill_contents.difficulty_level", difficultyLevel)
    .order("status_order", { ascending: true })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch previous session bills:", error);
    return [];
  }

  return data ?? [];
}

/**
 * 会期内の議案の審議状況を取得（設計書 5.9.1 節）。
 *
 * トップの件数チップ用。status 列だけを引くので軽い。
 * 集計は純粋関数 `summarizeBillStatuses()`（shared/utils）で行う。
 *
 * **`published` と `coming_soon` の両方を含める。**
 * 県議会の議案は本文が紙で配布され、スキャンして掲載するまで時間がかかる。
 * `published` だけで数えると、会期が始まってスキャンが終わるまでのあいだ
 * 件数が0になり、いちばん見てほしい時期に議案の入口が消えてしまう。
 * 中身が未掲載でも「いま何件が審議されているか」は伝える価値があるため、
 * 掲載待ち（`coming_soon`）も件数に入れる。
 *
 * **`draft` は含めない。** 議案スクレイプ（#52）で draft が大量に入るため、
 * 含めると未確認のデータが画面に出てしまう。
 *
 * 遷移先リンクを出せるのは `published` のものだけなので、
 * 呼び出し側が判別できるよう publish_status も返す。
 */
export async function findBillStatusesBySession(
  councilSessionId: string
): Promise<{ status: BillStatusEnum; publishStatus: BillPublishStatus }[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("status, publish_status")
    .eq("council_session_id", councilSessionId)
    .in("publish_status", ["published", "coming_soon"]);

  if (error) {
    console.error("Failed to fetch bill statuses by session:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    status: row.status,
    publishStatus: row.publish_status,
  }));
}

/** 議案を持つ会期の識別情報 */
export type BillSession = {
  id: string;
  slug: string | null;
  name: string;
};

/**
 * 件数を出せる議案がある会期のうち、最も新しいものを返す。
 *
 * トップの議案カードは「どの会期の件数か」をここで決める。
 * 質問が公開されている会期から選ぶと、**議案は入っているが質問が
 * まだ公開されていない新しい会期**があるときに、古い会期の件数を
 * 出してしまう。
 *
 * 議案側を全件引いて会期を絞る書き方はしない。PostgREST の
 * `max_rows`（このリポジトリでは1000）に当たると新しい会期の行が
 * 返らず、古い会期を「最新」と誤判定する。会期側を起点に
 * `!inner` で存在だけを見て、`start_date` の降順で1件取る。
 *
 * **まだ開会していない会期は返さない。** 議案は告示の時点で
 * `coming_soon` として入りうるため、開会日で絞らないと未来の会期が
 * 選ばれ、呼び出し側がそれを「前回の議案」として出してしまう。
 *
 * @param today 基準日（"YYYY-MM-DD"）。これより後に開会する会期は除く
 */
export async function findLatestSessionWithBills(
  today: string
): Promise<BillSession | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("council_sessions")
    .select("id, slug, name, bills!inner(id)")
    .in("bills.publish_status", ["published", "coming_soon"])
    .lte("start_date", today)
    .order("start_date", { ascending: false })
    // 存在確認だけなので、埋め込む議案は1件に絞る
    .limit(1, { referencedTable: "bills" })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch latest session with bills:", error);
    return null;
  }

  if (!data) return null;
  return { id: data.id, slug: data.slug, name: data.name };
}

/**
 * 前回の定例会の公開済み議案数を取得
 */
export async function countPublishedBillsByDietSession(
  councilSessionId: string,
  difficultyLevel: DifficultyLevelEnum
): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("bills")
    .select("*, bill_contents!inner(difficulty_level)", {
      count: "exact",
      head: true,
    })
    .eq("council_session_id", councilSessionId)
    .eq("publish_status", "published")
    .eq("bill_contents.difficulty_level", difficultyLevel);

  if (error) {
    console.error("Failed to count previous session bills:", error);
    return 0;
  }

  return count ?? 0;
}

// ============================================================
// Featured
// ============================================================

/**
 * featured_priorityが設定されているタグを取得
 */
export async function findFeaturedTags() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, label, description, featured_priority")
    .not("featured_priority", "is", null)
    .order("featured_priority", { ascending: true });

  if (error) {
    console.error("Failed to fetch featured tags:", error);
    return [];
  }

  return data ?? [];
}

/**
 * 特定タグに紐づく公開済み議案を取得（bill_contents + タグ付き）
 */
export async function findPublishedBillsByTag(
  tagId: string,
  difficultyLevel: DifficultyLevelEnum,
  councilSessionId: string | null
) {
  const supabase = createAdminClient();
  let query = supabase
    .from("bills_tags")
    .select(
      `
      bill_id,
      bills!inner (
        *,
        bill_contents!inner (
          id,
          bill_id,
          title,
          summary,
          content,
          difficulty_level,
          created_at,
          updated_at
        ),
        bills_tags!inner (
          tags (
            id,
            label
          )
        )
      )
    `
    )
    .eq("tag_id", tagId)
    .eq("bills.publish_status", "published")
    .eq("bills.bill_contents.difficulty_level", difficultyLevel);

  if (councilSessionId) {
    query = query.eq("bills.council_session_id", councilSessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Failed to fetch bills for tag:`, error);
    return null;
  }

  return data;
}

/**
 * 注目の議案を取得（is_featured = true）
 *
 * draft / coming_soon の議案が is_featured を立てられてもトップページへ
 * 露出しないよう、公開済みのものだけを返す。
 */
export async function findFeaturedBillsWithContents(
  difficultyLevel: DifficultyLevelEnum,
  councilSessionId: string | null
) {
  const supabase = createAdminClient();
  let query = supabase
    .from("bills")
    .select(
      `
      *,
      bill_contents!inner (
        id,
        bill_id,
        title,
        summary,
        content,
        difficulty_level,
        created_at,
        updated_at
      ),
      tags:bills_tags(
        tag:tags(
          id,
          label
        )
      )
    `
    )
    .eq("publish_status", "published")
    .eq("is_featured", true)
    .eq("bill_contents.difficulty_level", difficultyLevel)
    .order("published_at", { ascending: false });

  if (councilSessionId) {
    query = query.eq("council_session_id", councilSessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch featured bills:", error);
    return [];
  }

  return data ?? [];
}

// ============================================================
// Coming Soon
// ============================================================

/**
 * Coming Soon議案を取得
 */
export async function findComingSoonBills(councilSessionId: string | null) {
  const supabase = createAdminClient();
  let query = supabase
    .from("bills")
    .select(
      `
      id,
      name,
      bill_contents (
        title,
        difficulty_level
      ),
      council_sessions (
        council_url
      )
    `
    )
    .eq("publish_status", "coming_soon")
    .order("created_at", { ascending: false });

  if (councilSessionId) {
    query = query.eq("council_session_id", councilSessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch coming soon bills:", error);
    return [];
  }

  return data ?? [];
}

// ============================================================
// Preview Tokens
// ============================================================

/**
 * プレビュートークンを検証
 */
export async function findPreviewToken(billId: string, token: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("preview_tokens")
    .select("expires_at")
    .eq("bill_id", billId)
    .eq("token", token)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * 議案に紐づく質疑情報を取得
 */
export async function findDiscussionsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_discussions")
    .select("*")
    .eq("bill_id", billId)
    .order("session_day", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Failed to fetch bill discussions: ${error.message}`);
    return [];
  }

  return data ?? [];
}
