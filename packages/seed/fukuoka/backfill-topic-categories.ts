/**
 * backfill-topic-categories.ts
 *
 * AIパッチのファイルが残っていない定例会のトピックに、表示分類（category）だけを
 * 後付けする。対応表は docs/data/general-questions/<slug>/topic-categories.json。
 *
 * - session_day + question_order でレコードを引き、トピックの title が対応表と
 *   一致することを確認した上で category のみを書き込む（取り違え防止）
 * - 1件でも不一致があれば何も書かずに中断する
 * - 冪等。すでに同じ category が入っていれば更新をスキップする
 *
 * 実行例:
 *   cd packages/seed
 *   npx tsx --env-file=<本番用env> fukuoka/backfill-topic-categories.ts --session r7-12
 *   npx tsx --env-file=<本番用env> fukuoka/backfill-topic-categories.ts --session r7-12 --dry-run
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminClient } from "../shared/helper";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = resolve(__dirname, "../../../docs/data/general-questions");

/** webの CATEGORY_MAP と対応する11分類 */
const CATEGORY_LABELS = [
  "子育て・教育",
  "健康・医療",
  "防災・安全",
  "高齢者・福祉",
  "交通・まちづくり",
  "環境・脱炭素",
  "スポーツ・文化",
  "観光・地域振興",
  "産業・農林水産",
  "警察・人権",
  "行政・県政",
] as const;

type Assignment = {
  day: number;
  order: number;
  topics: { title: string; category: string }[];
};

type Mapping = { session: string; assignments: Assignment[] };

/** JSONBに入る値（packages/supabase の生成型 Json と同等。再エクスポートが無いため同形で定義） */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

/** topics の1要素。title と category 以外のキーはそのまま保持する */
type Topic = {
  [key: string]: JsonValue | undefined;
  title: string;
  category?: string;
};

function parseArg(name: string): string | null {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? (process.argv[idx + 1] ?? null) : null;
}

async function main(): Promise<void> {
  const sessionSlug = parseArg("session");
  if (!sessionSlug) {
    throw new Error(
      "--session に定例会スラッグを指定してください（例: --session r7-12）"
    );
  }
  const dryRun = process.argv.includes("--dry-run");

  const mapping: Mapping = JSON.parse(
    readFileSync(join(DATA_ROOT, sessionSlug, "topic-categories.json"), "utf-8")
  );

  const unknown = mapping.assignments.flatMap((a) =>
    a.topics
      .filter((t) => !(CATEGORY_LABELS as readonly string[]).includes(t.category))
      .map((t) => `第${a.day}日 ${a.order}番目「${t.title}」: ${t.category}`)
  );
  if (unknown.length > 0) {
    throw new Error(`未知のcategoryがあります:\n  ${unknown.join("\n  ")}`);
  }

  const supabase = createAdminClient();

  const { data: session, error: sessionError } = await supabase
    .from("council_sessions")
    .select("id, name")
    .eq("slug", mapping.session)
    .single();
  if (sessionError || !session) {
    throw new Error(
      `定例会が見つかりません (${mapping.session}): ${sessionError?.message ?? "not found"}`
    );
  }

  const { data: rows, error: rowsError } = await supabase
    .from("general_questions")
    .select("id, session_day, question_order, topics")
    .eq("council_session_id", session.id);
  if (rowsError) {
    throw new Error(`レコードの取得に失敗: ${rowsError.message}`);
  }

  // --- 検証（1件でも合わなければ書き込まない）---
  const errors: string[] = [];
  const updates: { id: string; topics: Topic[]; changed: number }[] = [];

  for (const a of mapping.assignments) {
    const row = (rows ?? []).find(
      (r) => r.session_day === a.day && r.question_order === a.order
    );
    if (!row) {
      errors.push(`第${a.day}日 ${a.order}番目: DBに該当レコードが無い`);
      continue;
    }
    const topics = (
      Array.isArray(row.topics) ? row.topics : []
    ) as unknown as Topic[];
    if (topics.length !== a.topics.length) {
      errors.push(
        `第${a.day}日 ${a.order}番目: DBのトピック${topics.length}件に対し対応表${a.topics.length}件`
      );
      continue;
    }
    let changed = 0;
    const next = topics.map((t, i) => {
      const want = a.topics[i];
      if (t.title !== want.title) {
        errors.push(
          `第${a.day}日 ${a.order}番目 ${i}: タイトル不一致\n      DB  : ${t.title}\n      対応表: ${want.title}`
        );
        return t;
      }
      if (t.category === want.category) return t;
      changed++;
      return { ...t, category: want.category };
    });
    if (changed > 0) updates.push({ id: row.id, topics: next, changed });
  }

  if (errors.length > 0) {
    console.error("中断（書き込みなし）:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  const totalTopics = mapping.assignments.reduce(
    (n, a) => n + a.topics.length,
    0
  );
  console.log(
    `対象定例会: ${session.name}（${mapping.session}）/ 対応表 ${mapping.assignments.length}レコード・${totalTopics}トピック`
  );
  console.log(
    `更新が必要なレコード: ${updates.length}件（トピック${updates.reduce((n, u) => n + u.changed, 0)}件）`
  );

  if (dryRun) {
    console.log("--dry-run のため書き込みません");
    return;
  }

  for (const u of updates) {
    const { error } = await supabase
      .from("general_questions")
      .update({ topics: u.topics })
      .eq("id", u.id);
    if (error) {
      throw new Error(`更新に失敗 (${u.id}): ${error.message}`);
    }
  }
  console.log(`完了: ${updates.length}レコードを更新`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
