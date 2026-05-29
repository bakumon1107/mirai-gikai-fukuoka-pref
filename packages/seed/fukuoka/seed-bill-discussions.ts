/**
 * seed-bill-discussions.ts
 *
 * 令和７年第５回定例会（第１日）の会議録をパースし、
 * 議案ごとの質疑情報をAIで要約してDBに投入する。
 *
 * 使い方:
 *   tsx --env-file=../../.env fukuoka/seed-bill-discussions.ts
 *   --dry-run オプションで実際のDB更新なしに確認可能
 *
 * 前提:
 *   - bill_discussions テーブルが存在すること（マイグレーション適用済み）
 *   - .env に SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が設定されていること
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminClient } from "../shared/helper";
import {
  countExchanges,
  extractParty,
  groupIntoDiscussions,
  parseMinutes,
} from "./parse-minutes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- 設定 ----

const CLAUDE_PATH = process.env.CLAUDE_CLI_PATH || "claude";
const SESSION_DAY = 1;

// 会議録ファイルのパス（リポジトリルートからの相対パス）
const MINUTES_FILE = path.resolve(
  __dirname,
  // worktree環境では docs/ が存在しないため、本体リポジトリの絶対パスを指定
  // リポジトリルート（worktreeの場合は ../mirai-gikai-fukuoka-city）からのパス
  "../../../../mirai-gikai-fukuoka-city/docs/fukuoka/meeting-minutes/令和７年第５回定例会/令和７年第５回定例会（第１日）.txt"
);

// ---- Claude CLI呼び出し ----

function callClaude(prompt: string): string {
  const tmpFile = path.join(os.tmpdir(), `seed-discussions-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt, "utf-8");

  try {
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE;

    const result = execSync(
      `"${CLAUDE_PATH}" --dangerously-skip-permissions -p "$(cat ${tmpFile})"`,
      {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        env,
        shell: "/bin/bash",
      }
    );
    return result.trim();
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

// ---- AI要約プロンプト ----

function buildSummaryPrompt(
  questionText: string,
  answerText: string
): string {
  return `あなたは福岡県議会の会議録を要約するアシスタントです。

以下は議案に関する県議会での質疑応答です。
県民が読みやすいように、それぞれ2〜3文で要約してください。

## 質問者の発言
${questionText}

## 答弁者の発言
${answerText}

以下のJSON形式のみで出力してください（他のテキストは一切含めないこと）:
{
  "question_summary": "...",
  "answer_summary": "..."
}`;
}

// ---- メイン処理 ----

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log(
    isDryRun
      ? "🔍 DRY RUN モード（DB更新なし）"
      : "🚀 seed-bill-discussions 開始"
  );

  // 会議録を読み込む
  if (!fs.existsSync(MINUTES_FILE)) {
    console.error(`❌ 会議録ファイルが見つかりません: ${MINUTES_FILE}`);
    process.exit(1);
  }
  const minutesText = fs.readFileSync(MINUTES_FILE, "utf-8");
  console.log(`📄 会議録読み込み: ${MINUTES_FILE}`);

  // パース
  const speeches = parseMinutes(minutesText);
  const groups = groupIntoDiscussions(speeches);
  console.log(`👥 質疑グループ数: ${groups.length}`);

  // Supabaseクライアント
  const supabase = createAdminClient();

  // 議案番号 → bill_id マッピングを取得
  const { data: bills, error: billsError } = await supabase
    .from("bills")
    .select("id, bill_number")
    .eq("publish_status", "published")
    .not("bill_number", "is", null);

  if (billsError) {
    console.error("❌ bills取得エラー:", billsError.message);
    process.exit(1);
  }

  // bill_number は「第201号」形式。会議録からは "201" を抽出するため
  // "201" → "第201号" に変換してマッピング
  const billMap = new Map(
    (bills ?? []).map((b) => {
      const num = b.bill_number?.match(/第(\d+)号/)?.[1] ?? "";
      return [num, b.id];
    })
  );
  console.log(`📋 公開議案数: ${billMap.size}`);

  let insertCount = 0;
  let skipCount = 0;

  for (const group of groups) {
    console.log(
      `\n処理中: ${group.questionerName}（${group.questionerNumber}番）→ 議案番号: [${group.billNumbers.join(", ")}]`
    );

    if (group.billNumbers.length === 0) {
      console.log("  ⚠️  議案番号なし → スキップ");
      skipCount++;
      continue;
    }

    // 質問テキスト・答弁テキストを結合
    const questionSpeeches = group.speeches.filter(
      (s) => s.speakerType === "questioner"
    );
    const answerSpeeches = group.speeches.filter(
      (s) => s.speakerType === "answerer"
    );

    const questionText = questionSpeeches.map((s) => s.text).join("\n\n");
    const answerText = answerSpeeches.map((s) => s.text).join("\n\n");

    if (!questionText.trim() || !answerText.trim()) {
      console.log("  ⚠️  質問または答弁テキストなし → スキップ");
      skipCount++;
      continue;
    }

    // 会派名・往復回数
    const party =
      extractParty(questionText) ??
      extractParty(group.speeches[0]?.text ?? "") ??
      null;
    const exchanges = countExchanges(group.speeches);

    // 主要答弁者（最初の答弁者）
    const primaryAnswerer = answerSpeeches[0];

    // AI要約
    console.log("  🤖 AI要約生成中...");
    let questionSummary = "";
    let answerSummary = "";

    if (!isDryRun) {
      try {
        const raw = callClaude(
          buildSummaryPrompt(
            questionText.slice(0, 2000),
            answerText.slice(0, 2000)
          )
        );
        // JSONをパース
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          questionSummary = parsed.question_summary ?? "";
          answerSummary = parsed.answer_summary ?? "";
        } else {
          console.log("  ⚠️  JSONパース失敗、rawレスポンス:", raw.slice(0, 100));
        }
      } catch (e) {
        console.error("  ❌ AI要約エラー:", e);
      }
    } else {
      questionSummary = "[DRY RUN] 質問要約";
      answerSummary = "[DRY RUN] 答弁要約";
    }

    // 各議案に対してレコードを挿入
    for (const billNum of group.billNumbers) {
      const normalizedNum = billNum.replace(/^0+/, "");
      const billId = billMap.get(normalizedNum);

      if (!billId) {
        console.log(`  ⚠️  議案第${billNum}号 → DB未登録またはunpublished → スキップ`);
        skipCount++;
        continue;
      }

      const record = {
        bill_id: billId,
        session_day: SESSION_DAY,
        questioner_name: group.questionerName,
        questioner_number: group.questionerNumber,
        questioner_party: party,
        question_summary: questionSummary,
        question_raw: questionText,
        answerer_role: primaryAnswerer?.speakerRole ?? null,
        answerer_name: primaryAnswerer?.speakerName ?? null,
        answer_summary: answerSummary,
        answer_raw: answerText,
        exchange_count: exchanges,
      };

      if (isDryRun) {
        console.log(
          `  [DRY RUN] 議案第${billNum}号（${billId}）→ upsert対象:`,
          {
            questioner: group.questionerName,
            party,
            exchanges,
            answererRole: primaryAnswerer?.speakerRole,
          }
        );
        insertCount++;
        continue;
      }

      const { error } = await supabase
        .from("bill_discussions")
        .upsert(record, {
          onConflict: "bill_id,questioner_name",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`  ❌ 議案第${billNum}号 upsertエラー:`, error.message);
      } else {
        console.log(`  ✅ 議案第${billNum}号 → upsert完了`);
        insertCount++;
      }
    }
  }

  console.log("\n🎉 完了");
  console.log(`  挿入/更新: ${insertCount} 件`);
  console.log(`  スキップ: ${skipCount} 件`);
}

main().catch(console.error);
