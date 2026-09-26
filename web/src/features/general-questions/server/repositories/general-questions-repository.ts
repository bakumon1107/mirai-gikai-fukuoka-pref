import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { GeneralQuestion } from "../../shared/types";

/** 1回の取得件数。PostgREST の `max_rows`（1000）以下にすること */
const QUESTIONER_PAGE_SIZE = 500;

/** ページングの安全弁。500 × 20 = 10,000件で打ち切る */
const QUESTIONER_MAX_PAGES = 20;

/**
 * 会期内で質問した議員の人数を返す（設計書 5.3.2 節 段階2）。
 *
 * 会期中ヒーローの「一般質問 N人が質問」に使う。**質問の件数ではなく
 * 人数**なので、同じ議員が複数回登壇したぶんは重ねない。
 *
 * 質問本体は要らないので `questioner_name` だけ引く。
 *
 * **ページングして全件を見る。** 一度に引くと PostgREST の `max_rows`
 * （このリポジトリでは1000）で黙って打ち切られ、人数が実際より少なくなる。
 * 1会期の質問は議員定数に縛られるため現実には1000件に届かないが、
 * 件数の上限に依存した書き方はしない。
 */
export async function countQuestionersBySession(
  sessionId: string
): Promise<number> {
  const supabase = createAdminClient();
  const questioners = new Set<string>();

  for (let page = 0; page < QUESTIONER_MAX_PAGES; page++) {
    const from = page * QUESTIONER_PAGE_SIZE;
    const { data, error } = await supabase
      .from("general_questions")
      .select("questioner_name")
      .eq("council_session_id", sessionId)
      .eq("publish_status", "published")
      // range だけでは順序が保証されず、ページ間で行が重複・欠落しうる
      .order("id", { ascending: true })
      .range(from, from + QUESTIONER_PAGE_SIZE - 1);

    if (error) {
      console.error("Failed to count questioners by session:", error);
      return 0;
    }

    for (const row of data ?? []) questioners.add(row.questioner_name);

    // 満たなければ最終ページ
    if (!data || data.length < QUESTIONER_PAGE_SIZE) return questioners.size;
  }

  console.warn(
    `countQuestionersBySession: ページ上限に達した (session=${sessionId})`
  );
  return questioners.size;
}

export async function findPublishedGeneralQuestionsBySession(
  sessionId: string
): Promise<GeneralQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("general_questions")
    .select("*")
    .eq("council_session_id", sessionId)
    .eq("publish_status", "published")
    .order("session_day", { ascending: true })
    .order("question_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch general questions: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    ...row,
    topics: Array.isArray(row.topics) ? row.topics : [],
  })) as GeneralQuestion[];
}

export async function findLatestSessionSlugWithPublishedQuestions(): Promise<
  string | null
> {
  const session = await findLatestSessionWithPublishedQuestions();
  return session?.slug ?? null;
}

/** 質問が公開されている最新会期の識別情報 */
export type LatestQuestionSession = {
  id: string;
  slug: string | null;
  name: string;
};

/**
 * 質問が公開されている最新会期を id / slug / name で返す（設計書 5.7 節）。
 *
 * `findLatestSessionSlugWithPublishedQuestions()` は slug しか返さないため、
 * 質問本体を引くにも出典ラベルを出すにも会期を引き直す必要があった。
 * トップの「代表質問・一般質問から」はどちらも要るのでこちらを使う。
 *
 * 質問側を全件引いて会期を絞る書き方はしない。PostgREST の
 * `max_rows`（このリポジトリでは1000）に当たると新しい会期の行が返らず、
 * 古い会期を「最新」と誤判定する。会期側を起点に `!inner` で公開質問の
 * 存在だけを見て、`start_date` の降順で1件取る。
 */
export async function findLatestSessionWithPublishedQuestions(): Promise<LatestQuestionSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("id, slug, name, general_questions!inner(id)")
    .eq("general_questions.publish_status", "published")
    .order("start_date", { ascending: false })
    // 存在確認だけなので、埋め込む質問は1件に絞る
    .limit(1, { referencedTable: "general_questions" })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch latest session with questions:", error);
    return null;
  }

  if (!data) return null;
  return { id: data.id, slug: data.slug, name: data.name };
}

export async function findPublishedGeneralQuestionById(
  id: string
): Promise<GeneralQuestion | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("general_questions")
    .select("*")
    .eq("id", id)
    .eq("publish_status", "published")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch general question: ${error.message}`);
  }

  return {
    ...data,
    topics: Array.isArray(data.topics) ? data.topics : [],
  } as GeneralQuestion;
}
