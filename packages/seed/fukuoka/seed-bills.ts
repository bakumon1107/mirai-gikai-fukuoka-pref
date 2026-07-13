/**
 * seed-bills.ts
 *
 * 令和8年 6月定例会の議案（第88〜119号）を bills テーブルへ投入する。
 * 難易度別本文（bill_contents）は data 側に contents が付与されていれば併せて投入する。
 *
 * 使い方:
 *   # ローカル(.env)に対して dry-run（DB更新なし・確認のみ）
 *   tsx --env-file=../../.env       fukuoka/seed-bills.ts --dry-run
 *   # 本番(.env.production)に対して dry-run
 *   tsx --env-file=../../.env.production fukuoka/seed-bills.ts --dry-run
 *   # 実投入（--dry-run を外す）
 *   tsx --env-file=../../.env.production fukuoka/seed-bills.ts
 *
 * 前提:
 *   - 対象の council_session（令和8年 6月定例会）が存在すること
 *   - .env / .env.production に SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY があること
 */

import { createAdminClient } from "../shared/helper";
import { contentsByNumber } from "./bills-r8-6gatsu-contents";
import {
  type BillSeed,
  bills as billFacts,
  R8_6GATSU_SESSION_NAME,
} from "./bills-r8-6gatsu-data";

// 事実データ（bills-r8-6gatsu-data）に難易度別本文（contents）を紐付ける
const bills: BillSeed[] = billFacts.map((b) => ({
  ...b,
  contents: contentsByNumber[b.billNumber] ?? [],
}));

// ---- 導出フィールドのデフォルト（要確認・必要なら変更）----

// bills.status（bill_status_enum: preparing/submitted/in_committee/plenary_session/approved/rejected）
// ※ 議決結果はPDFに無いが、知事提出議案は通常可決のためユーザー判断で "approved"。
const DEFAULT_STATUS = "approved" as const;

// bills.publish_status（draft/published/coming_soon）
const DEFAULT_PUBLISH_STATUS = "published" as const;

// bills.bill_type（bill/opinion/resolution/member_bill）
// ※ すべて知事提出議案のため "bill"。
const BILL_TYPE = "bill" as const;

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const supabase = createAdminClient();

  console.log(
    isDryRun
      ? "🔍 DRY RUN モード（DB更新なし）"
      : "🚀 seed-bills 開始（実投入）"
  );
  console.log(`🔗 接続先: ${process.env.SUPABASE_URL}`);

  // 会期IDを取得
  const { data: session, error: sessionError } = await supabase
    .from("council_sessions")
    .select("id, name")
    .eq("name", R8_6GATSU_SESSION_NAME)
    .maybeSingle();

  if (sessionError) {
    console.error("❌ council_sessions取得エラー:", sessionError.message);
    process.exit(1);
  }
  if (!session) {
    console.error(
      `❌ 会期が見つかりません: 「${R8_6GATSU_SESSION_NAME}」。先に会期を作成してください。`
    );
    process.exit(1);
  }
  console.log(`📅 会期: ${session.name}（${session.id}）`);
  console.log(`📋 対象議案: ${bills.length} 件\n`);

  let billUpsert = 0;
  let contentUpsert = 0;
  let failures = 0;

  for (const bill of bills) {
    const label = `${bill.billNumber}「${bill.name}」`;

    // 既存確認（council_session_id + bill_number + bill_type）
    const { data: existing, error: findError } = await supabase
      .from("bills")
      .select("id")
      .eq("council_session_id", session.id)
      .eq("bill_number", bill.billNumber)
      .eq("bill_type", BILL_TYPE)
      .maybeSingle();

    if (findError) {
      console.error(`❌ ${label} 既存確認エラー:`, findError.message);
      failures++;
      continue;
    }

    const billRow = {
      name: bill.name,
      bill_number: bill.billNumber,
      bill_type: BILL_TYPE,
      status: DEFAULT_STATUS,
      publish_status: DEFAULT_PUBLISH_STATUS,
      council_session_id: session.id,
    };

    if (isDryRun) {
      console.log(
        `  [DRY RUN] ${existing ? "更新" : "新規"} ${label}`,
        `\n           分類=${bill.category} / 所管=${bill.department} / status=${DEFAULT_STATUS} / publish=${DEFAULT_PUBLISH_STATUS}`,
        `\n           概要: ${bill.gaiyou}`,
        `\n           本文: ${bill.contents?.length ?? 0} 難易度`
      );
      billUpsert++;
      contentUpsert += bill.contents?.length ?? 0;
      continue;
    }

    // bills を upsert（存在すれば更新、なければ挿入）
    let billId: string;
    if (existing) {
      const { error } = await supabase
        .from("bills")
        .update(billRow)
        .eq("id", existing.id);
      if (error) {
        console.error(`❌ ${label} 更新エラー:`, error.message);
        failures++;
        continue;
      }
      billId = existing.id;
    } else {
      const { data: inserted, error } = await supabase
        .from("bills")
        .insert(billRow)
        .select("id")
        .single();
      if (error || !inserted) {
        console.error(`❌ ${label} 挿入エラー:`, error?.message);
        failures++;
        continue;
      }
      billId = inserted.id;
    }
    console.log(`  ✅ ${existing ? "更新" : "新規"} ${label}`);
    billUpsert++;

    // bill_contents を upsert
    for (const c of bill.contents ?? []) {
      const { error } = await supabase.from("bill_contents").upsert(
        {
          bill_id: billId,
          difficulty_level: c.difficulty_level,
          title: c.title,
          summary: c.summary,
          content: c.content,
        },
        { onConflict: "bill_id,difficulty_level", ignoreDuplicates: false }
      );
      if (error) {
        console.error(
          `    ❌ ${bill.billNumber} 本文(${c.difficulty_level})エラー:`,
          error.message
        );
        failures++;
        continue;
      }
      console.log(`    ✅ 本文(${c.difficulty_level})`);
      contentUpsert++;
    }
  }

  console.log("\n🎉 完了");
  console.log(`  議案: ${billUpsert} 件`);
  console.log(`  本文: ${contentUpsert} 件`);
  console.log(`  失敗: ${failures} 件`);
  if (isDryRun) console.log("  （DRY RUN のため実際には書き込んでいません）");

  // 部分失敗があれば非0で終了（CI等で検知できるようにする）
  if (failures > 0) {
    process.exit(1);
  }
}

// biome-ignore lint/suspicious/noConsole: seed script
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export type { BillSeed };
