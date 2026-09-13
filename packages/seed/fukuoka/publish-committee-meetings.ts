/**
 * publish-committee-meetings.ts
 *
 * 委員会会議を公開（publish_status = 'published'）にする。
 * 委員会の一覧・詳細・検索は published のみを表示するため、公開したい会議を
 * このスクリプトで published にする（管理画面の公開フローが入るまでの暫定手段）。
 *
 * - 引数なし: draft の全会議を published にする
 * - 引数に source_document_id を並べると、その会議のみ published にする
 *
 * 使い方:
 *   cd packages/seed
 *   # 全件公開
 *   npx tsx --env-file=../../.env fukuoka/publish-committee-meetings.ts
 *   # 特定の会議のみ
 *   npx tsx --env-file=../../.env fukuoka/publish-committee-meetings.ts 7385 7386
 */

import { createAdminClient } from "../shared/helper";

async function main(): Promise<void> {
  const supabase = createAdminClient();
  const rawArgs = process.argv.slice(2);
  const docIds = rawArgs.map(Number).filter(Number.isInteger);

  // 引数を渡したのに一部でも整数として解釈できない場合は、
  // タイポ等で意図せず全件公開してしまうのを防ぐため中止する
  if (rawArgs.length > 0 && docIds.length !== rawArgs.length) {
    throw new Error(
      `不正な引数が含まれています: ${rawArgs.join(", ")} / DocumentIDは整数で指定してください（引数なしで実行するとdraft全件公開）`
    );
  }

  let query = supabase
    .from("committee_meetings")
    .update({ publish_status: "published" })
    .eq("publish_status", "draft");
  if (docIds.length > 0) {
    query = query.in("source_document_id", docIds);
  }

  const { data, error } = await query.select("source_document_id");
  if (error) {
    throw new Error(`公開に失敗しました: ${error.message}`);
  }
  console.log(
    `公開（published）にしました: ${data?.length ?? 0}件`,
    docIds.length > 0 ? `(対象指定: ${docIds.join(", ")})` : "(draft全件)"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
