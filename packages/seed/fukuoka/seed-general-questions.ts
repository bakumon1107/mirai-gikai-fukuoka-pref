/**
 * seed-general-questions.ts
 *
 * パーサーが出力した原文JSONに、AI生成の summary / topics パッチを重ねて
 * general_questions に投入する。
 *
 * - 原文JSON: docs/data/general-questions/<session-slug>/day<N>.json
 * - AIパッチ: docs/data/general-questions/<session-slug>/ai/day<N>.json
 *   （question_order をキーに summary / topics を差し込む。ユーザー確認済みのもの）
 * - 冪等性: council_session_id + session_day + question_order が一致する既存行は
 *   UPDATE、無ければ INSERT する
 * - publish_status は既定 draft。公開は --publish で published にする
 *
 * 使い方:
 *   cd packages/seed
 *   npx tsx --env-file=../../.env fukuoka/seed-general-questions.ts --session r8-6
 *   npx tsx --env-file=../../.env.production fukuoka/seed-general-questions.ts --session r8-6 --publish
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminClient } from "../shared/helper";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = resolve(__dirname, "../../../docs/data/general-questions");

type Topic = {
  title: string;
  question_summary: string;
  answer_summary: string;
  answerer_role: string;
  answerer_name: string;
  questioner_follow_up?: string | null;
};

/** パーサーが出力する原文JSONのシェイプ（1議員の1登壇＝1レコード） */
type ParsedQuestion = {
  session_id: string;
  session_day: number;
  question_type: "general" | "representative";
  question_order: number;
  questioner_number: number | null;
  questioner_name: string;
  questioner_party: string | null;
  raw_text: string;
  answer_raw_text: string | null;
  source_url: string | null;
};

/** AI生成パッチのシェイプ（question_order で原文レコードに対応づける） */
type AiPatch = {
  question_order: number;
  summary: string;
  topics: Topic[];
};

function loadAiPatches(dataDir: string, file: string): Map<number, AiPatch> {
  const path = join(dataDir, "ai", file);
  if (!existsSync(path)) return new Map();
  const patches: AiPatch[] = JSON.parse(readFileSync(path, "utf-8"));
  return new Map(patches.map((p) => [p.question_order, p]));
}

function parseArg(name: string): string | null {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? (process.argv[idx + 1] ?? null) : null;
}

async function main(): Promise<void> {
  const sessionSlug = parseArg("session");
  if (!sessionSlug) {
    throw new Error(
      "--session に定例会スラッグを指定してください（例: --session r8-6）"
    );
  }
  const publish = process.argv.includes("--publish");
  const publishStatus = publish ? "published" : "draft";

  const supabase = createAdminClient();

  const { data: session, error: sessionError } = await supabase
    .from("council_sessions")
    .select("id, name")
    .eq("slug", sessionSlug)
    .single();
  if (sessionError || !session) {
    throw new Error(
      `定例会が見つかりません (${sessionSlug}): ${sessionError?.message ?? "not found"}`
    );
  }
  console.log(`対象定例会: ${session.name}（${sessionSlug}）`);

  const dataDir = join(DATA_ROOT, sessionSlug);
  const files = readdirSync(dataDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  console.log(`対象ファイル: ${files.length}件 / publish_status=${publishStatus}`);

  let insertedCount = 0;
  let updatedCount = 0;

  let missingPatchCount = 0;

  for (const file of files) {
    const records: ParsedQuestion[] = JSON.parse(
      readFileSync(join(dataDir, file), "utf-8")
    );
    const patches = loadAiPatches(dataDir, file);

    for (const rec of records) {
      const patch = patches.get(rec.question_order);
      if (!patch) {
        // AI生成が未確認のレコードは要約なしで入れる（後から再実行で上書きできる）
        missingPatchCount++;
        console.warn(
          `AIパッチなし: ${file} 第${rec.session_day}日 ${rec.question_order}番目 ${rec.questioner_name}`
        );
      }

      const row = {
        council_session_id: session.id,
        session_day: rec.session_day,
        question_order: rec.question_order,
        question_type: rec.question_type,
        questioner_name: rec.questioner_name,
        questioner_party: rec.questioner_party,
        questioner_number: rec.questioner_number,
        summary: patch?.summary ?? null,
        topics: patch?.topics ?? [],
        raw_text: rec.raw_text,
        answer_raw_text: rec.answer_raw_text,
        source_url: rec.source_url,
        publish_status: publishStatus,
      };

      const { data: existing, error: existingError } = await supabase
        .from("general_questions")
        .select("id")
        .eq("council_session_id", session.id)
        .eq("session_day", rec.session_day)
        .eq("question_order", rec.question_order)
        .maybeSingle();
      if (existingError) {
        throw new Error(
          `既存確認に失敗 (${file} 第${rec.session_day}日 ${rec.question_order}番目): ${existingError.message}`
        );
      }

      if (existing) {
        const { error } = await supabase
          .from("general_questions")
          .update(row)
          .eq("id", existing.id);
        if (error) {
          throw new Error(
            `更新に失敗 (${rec.questioner_name}): ${error.message}`
          );
        }
        updatedCount++;
      } else {
        const { error } = await supabase.from("general_questions").insert(row);
        if (error) {
          throw new Error(
            `投入に失敗 (${rec.questioner_name}): ${error.message}`
          );
        }
        insertedCount++;
      }
    }
    console.log(`処理: ${file}（${records.length}件）`);
  }

  console.log(
    `完了: 新規${insertedCount}件 / 更新${updatedCount}件 / AIパッチなし${missingPatchCount}件`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
