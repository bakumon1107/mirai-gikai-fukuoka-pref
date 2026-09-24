/**
 * seed-council-sessions.ts
 *
 * スクレイプ済みの会期日程（docs/data/bills/*.json の startDate / endDate）を
 * council_sessions.start_date / end_date に反映する。
 *
 * 背景（設計書 5.5.2 節）:
 * scrape-bills.ts は会期日程ページから開会日・閉会日を取得して JSON に書くが、
 * seed-bills.ts は council_sessions を会期名で引くだけで日程を書き込まない。
 * トップページの「定例会の帯」と会期中モードは start_date / end_date に
 * 依存するため、この投入経路が必要になる。
 *
 * 使い方:
 *   pnpm tsx packages/seed/fukuoka/seed-council-sessions.ts --dry-run
 *   pnpm tsx packages/seed/fukuoka/seed-council-sessions.ts
 *
 * 既存レコードの日程を上書きするため、**必ず --dry-run で差分を確認してから**
 * 実行すること。
 */

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminClient } from "@mirai-gikai/supabase";

/** docs/data/bills/*.json の必要部分 */
type ScrapedSession = {
  sessionName: string;
  /** council_sessions.name と同じ表記（例: "令和8年 6月定例会"） */
  dbSessionName: string;
  sessionKey: string;
  startDate: string | null;
  endDate: string | null;
  councilUrl?: string | null;
};

// packages/seed/fukuoka/ からリポジトリルートへ。
// 実行時のカレントディレクトリに依存させない
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const DATA_DIR = join(REPO_ROOT, "docs/data/bills");

type Change = {
  name: string;
  id: string;
  startDate: { from: string | null; to: string | null };
  endDate: { from: string | null; to: string | null };
};

type Creation = {
  name: string;
  slug: string;
  startDate: string;
  endDate: string | null;
  councilUrl: string | null;
};

/**
 * slug を組み立てる。
 *
 * 既存の表記に合わせる（例: 令和8年 6月定例会 → r8-6）。
 * 臨時会は定例会と衝突しないよう接尾辞を付ける（令和7年 4月臨時会 → r7-4-rinji）。
 *
 * ※ 既存レコードには `r8-budget`（令和8年2月）のような例外もあるが、
 *   既存レコードは名前で引き当てて更新するだけなので slug は作り直さない。
 */
export function buildSessionSlug(dbSessionName: string): string | null {
  const match = dbSessionName.match(/^令和(\d+)年\s*(\d+)月(定例会|臨時会)$/);
  if (!match) return null;

  const [, eraYear, month, kind] = match;
  const base = `r${eraYear}-${month}`;
  return kind === "臨時会" ? `${base}-rinji` : base;
}

async function loadScrapedSessions(): Promise<ScrapedSession[]> {
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith(".json"));
  const sessions: ScrapedSession[] = [];

  for (const file of files.sort()) {
    const raw = await readFile(join(DATA_DIR, file), "utf-8");
    const parsed = JSON.parse(raw) as ScrapedSession;
    if (!parsed.dbSessionName) {
      console.warn(`⚠️  dbSessionName がありません: ${file}`);
      continue;
    }
    sessions.push(parsed);
  }

  return sessions;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const supabase = createAdminClient();

  console.log(
    isDryRun
      ? "🔍 DRY RUN モード（DB更新なし）"
      : "🚀 seed-council-sessions 開始（実投入）"
  );
  console.log(`🔗 接続先: ${process.env.SUPABASE_URL}`);

  const scraped = await loadScrapedSessions();
  console.log(`📋 スクレイプ済み会期: ${scraped.length} 件\n`);

  const changes: Change[] = [];
  const creations: Creation[] = [];
  let unchanged = 0;
  let notFound = 0;
  let failures = 0;

  for (const session of scraped) {
    const { data: existing, error } = await supabase
      .from("council_sessions")
      .select("id, name, start_date, end_date")
      .eq("name", session.dbSessionName)
      .maybeSingle();

    if (error) {
      console.error(
        `❌ ${session.dbSessionName} 取得エラー: ${error.message}`
      );
      failures++;
      continue;
    }

    // 日程が取れていない会期は触らない（既存値を消さない・新規作成もしない）
    if (!session.startDate) {
      console.log(`⏭️  開会日が未取得（スキップ）: ${session.dbSessionName}`);
      unchanged++;
      continue;
    }

    if (!existing) {
      const slug = buildSessionSlug(session.dbSessionName);
      if (!slug) {
        console.warn(
          `⚠️  slug を組み立てられません（スキップ）: ${session.dbSessionName}`
        );
        notFound++;
        continue;
      }
      creations.push({
        name: session.dbSessionName,
        slug,
        startDate: session.startDate,
        endDate: session.endDate ?? null,
        councilUrl: session.councilUrl ?? null,
      });
      continue;
    }

    const startSame = existing.start_date === session.startDate;
    const endSame = (existing.end_date ?? null) === (session.endDate ?? null);

    if (startSame && endSame) {
      unchanged++;
      continue;
    }

    changes.push({
      name: session.dbSessionName,
      id: existing.id,
      startDate: { from: existing.start_date, to: session.startDate },
      endDate: { from: existing.end_date ?? null, to: session.endDate ?? null },
    });
  }

  if (creations.length > 0) {
    console.log(`\n🆕 新規作成: ${creations.length} 件`);
    for (const c of creations) {
      console.log(
        `  ${c.name}（${c.slug}）${c.startDate}〜${c.endDate ?? "(未定)"}`
      );
    }
    console.log(
      "  ※ is_active は false で作成する。現在の会期を切り替える場合は別途手動で更新すること"
    );
  }

  if (changes.length === 0) {
    console.log("\n✅ 更新が必要な会期はありません");
  } else {
    console.log(`\n📝 更新対象: ${changes.length} 件`);
    for (const change of changes) {
      console.log(`  ${change.name}`);
      if (change.startDate.from !== change.startDate.to) {
        console.log(
          `    開会日: ${change.startDate.from ?? "(なし)"} → ${change.startDate.to}`
        );
      }
      if (change.endDate.from !== change.endDate.to) {
        console.log(
          `    閉会日: ${change.endDate.from ?? "(なし)"} → ${change.endDate.to ?? "(なし)"}`
        );
      }
    }
  }

  if (!isDryRun) {
    for (const creation of creations) {
      const { error } = await supabase.from("council_sessions").insert({
        name: creation.name,
        slug: creation.slug,
        start_date: creation.startDate,
        end_date: creation.endDate,
        council_url: creation.councilUrl,
        is_active: false,
      });

      if (error) {
        console.error(`❌ ${creation.name} 作成エラー: ${error.message}`);
        failures++;
      }
    }

    for (const change of changes) {
      const { error } = await supabase
        .from("council_sessions")
        .update({
          start_date: change.startDate.to as string,
          end_date: change.endDate.to,
        })
        .eq("id", change.id);

      if (error) {
        console.error(`❌ ${change.name} 更新エラー: ${error.message}`);
        failures++;
      }
    }
  }

  console.log("\n────────────────");
  console.log(`新規作成${isDryRun ? "予定" : "済み"}: ${creations.length} 件`);
  console.log(`更新${isDryRun ? "予定" : "済み"}: ${changes.length} 件`);
  console.log(`変更なし: ${unchanged} 件`);
  console.log(`スキップ: ${notFound} 件`);
  console.log(`失敗: ${failures} 件`);

  if (isDryRun && changes.length + creations.length > 0) {
    console.log("\n※ 実際に反映するには --dry-run を外して再実行してください");
  }

  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
