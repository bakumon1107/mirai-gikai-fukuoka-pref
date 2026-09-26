/**
 * seed-scraped-bills.ts
 *
 * スクレイプ済みの議案一覧（docs/data/bills/*.json）を bills テーブルへ投入する。
 *
 * 既存の seed-bills.ts は令和8年6月定例会のデータをファイルに直書きした
 * 専用スクリプトで、他の会期には使えない。こちらは会期を引数で選ぶ。
 *
 * 使い方:
 *   # ローカルに dry-run
 *   tsx --env-file=../../.env fukuoka/seed-scraped-bills.ts 0809 --dry-run
 *   # 実投入
 *   tsx --env-file=../../.env fukuoka/seed-scraped-bills.ts 0809
 *
 * **本文（bill_contents）は投入しない。** スクレイプで取れるのは議案名と
 * 議決結果までで、本文はPDFから別途起こす必要がある。そのため
 * publish_status は `coming_soon`（件数には入るが中身は「準備中」）にする。
 * `draft` にすると設計書 5.9.1 節の集計から外れ、件数に出ない。
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminClient } from "../shared/helper";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/** bills.status（bill_status_enum）。スクレイプ結果を素通しせず検証する */
const BILL_STATUSES = [
  "preparing",
  "submitted",
  "in_committee",
  "plenary_session",
  "approved",
  "rejected",
  "adopted",
  "partially_adopted",
  "reported",
] as const;

type BillStatus = (typeof BILL_STATUSES)[number];

function toBillStatus(value: string): BillStatus | null {
  return (BILL_STATUSES as readonly string[]).includes(value)
    ? (value as BillStatus)
    : null;
}

type ScrapedBill = {
  billNumber: string;
  billType: string;
  name: string;
  submittedDate: string | null;
  status: string;
  statusNote?: string | null;
  sourceUrl?: string | null;
};

type ScrapedFile = {
  dbSessionName: string;
  bills: ScrapedBill[];
};

async function main() {
  const [sessionKey] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const isDryRun = process.argv.includes("--dry-run");

  if (!sessionKey) {
    console.error("会期キーを指定してください（例: 0809）");
    process.exit(1);
  }

  const supabase = createAdminClient();
  console.log(isDryRun ? "🔍 DRY RUN（DB更新なし）" : "🚀 実投入");
  console.log(`🔗 接続先: ${process.env.SUPABASE_URL}`);

  const path = join(REPO_ROOT, "docs/data/bills", `${sessionKey}.json`);
  const data = JSON.parse(await readFile(path, "utf-8")) as ScrapedFile;
  console.log(`📋 ${data.dbSessionName}: ${data.bills.length} 件\n`);

  const { data: session, error: sErr } = await supabase
    .from("council_sessions")
    .select("id, name")
    .eq("name", data.dbSessionName)
    .maybeSingle();

  if (sErr || !session) {
    console.error(`❌ 会期が見つかりません: ${data.dbSessionName}`);
    process.exit(1);
  }

  // 既存の議案番号を引いて、重複投入を避ける
  const { data: existing } = await supabase
    .from("bills")
    .select("bill_number")
    .eq("council_session_id", session.id);
  const known = new Set((existing ?? []).map((b) => b.bill_number));

  // 想定外の status はスキップする。enum に無い値を入れると投入ごと失敗する
  const unknown = data.bills.filter(
    (b) => !known.has(b.billNumber) && toBillStatus(b.status) === null
  );
  for (const b of unknown) {
    console.warn(`⚠️  未知の status（スキップ）: ${b.billNumber} ${b.status}`);
  }

  const toInsert = data.bills
    .filter((b) => !known.has(b.billNumber) && toBillStatus(b.status) !== null)
    .map((b) => ({
      name: b.name,
      bill_number: b.billNumber,
      bill_type: b.billType,
      status: toBillStatus(b.status) as BillStatus,
      status_note: b.statusNote ?? null,
      source_url: b.sourceUrl ?? null,
      council_session_id: session.id,
      // 本文が無いので中身は出さない。件数には入る（設計書 5.9.1 節）
      publish_status: "coming_soon" as const,
      published_at: b.submittedDate ? `${b.submittedDate}T00:00:00Z` : null,
      is_featured: false,
      discussion_overview_points: [],
    }));

  console.log(`  既存: ${known.size} 件 / 新規: ${toInsert.length} 件`);
  const byStatus = new Map<string, number>();
  for (const b of toInsert) {
    byStatus.set(b.status, (byStatus.get(b.status) ?? 0) + 1);
  }
  for (const [s, n] of byStatus) console.log(`    ${s}: ${n} 件`);

  if (isDryRun || toInsert.length === 0) {
    console.log("\n（DRY RUN のため投入しません）");
    return;
  }

  let ok = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const { error } = await supabase
      .from("bills")
      .insert(toInsert.slice(i, i + 50));
    if (error) {
      console.error(`❌ 投入エラー: ${error.message}`);
    } else {
      ok += Math.min(50, toInsert.length - i);
    }
  }

  console.log(`\n✅ 投入: ${ok}/${toInsert.length} 件`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
