/**
 * scrape-bills.ts
 *
 * 福岡県議会ホームページから提出議案・採決結果・会期日程を取得し、
 * 中間JSON（docs/data/bills/<会期キー>.json）へ書き出す。
 *
 * **DBには一切触らない。** 投入は seed-bills-from-scrape.ts が行う。
 * 中間JSONを挟むのは、目視レビューをDBに触らずに行うため（設計書 §6）。
 *
 * 使い方:
 *   cd packages/seed
 *   # 索引から対象会期を出すだけ（取得はしない）
 *   npx tsx fukuoka/scrape-bills.ts --list
 *   # 令和7〜8年の全会期
 *   npx tsx fukuoka/scrape-bills.ts --years 7,8
 *   # 会期キーで絞る
 *   npx tsx fukuoka/scrape-bills.ts --session 0809
 *   # 既存JSONがあっても取り直す
 *   npx tsx fukuoka/scrape-bills.ts --session 0809 --force
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  type SessionIndexEntry,
  parseSessionIndex,
  parseYearIndex,
  toDbSessionName,
} from "./parse-bill-index";
import {
  type ParsedBill,
  extractDeclaredBillCount,
  parseBillList,
} from "./parse-bill-list";
import { parseSessionSchedule } from "./parse-session-schedule";
import {
  type ParseVoteResultsResult,
  parseVoteResults,
  resolveBillStatus,
} from "./parse-vote-results";

const SITE_ORIGIN = "https://www.gikai.pref.fukuoka.lg.jp";
const YEAR_INDEX_URL = `${SITE_ORIGIN}/site/honkaigi/list43.html`;

/** リクエスト間隔。相手サイトへの負荷を抑える（scrape-committee-minutes.ts と同値） */
const WAIT_MS = 2000;
/** 429/503・タイムアウト時のリトライ待ち時間（秒） */
const RETRY_DELAYS_SEC = [30, 60, 120];
const REQUEST_TIMEOUT_MS = 30000;

const USER_AGENT =
  "mirai-gikai-fukuoka-pref scraper (contact: GitHub bakumon1107)";

/** 出力先。packages/seed から見た相対パス */
const OUT_DIR = join("..", "..", "docs", "data", "bills");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** fetch の結果。404 は「ページ未掲載」として正常系で扱う */
type FetchResult =
  | { kind: "ok"; html: string }
  | { kind: "notFound" };

/**
 * GETリクエスト。2秒待ってから投げ、429/503とタイムアウトはリトライする。
 *
 * 404 は例外にしない。採決結果ページは存在しない会期があり
 * （令和7年5月臨時会の saiketsu-0705.html）、それは異常ではないため。
 */
async function fetchHtml(url: string): Promise<FetchResult> {
  for (let attempt = 0; ; attempt++) {
    await sleep(WAIT_MS);
    let res: Response;
    // 本文の読み取りまで同じ try に入れる。fetch() はヘッダー受信で解決し、
    // res.text() はその後のタイムアウトで reject されうるため、
    // 読み取りを外に出すとリトライを迂回してCLI全体が落ちる。
    let bodyText: string | null = null;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      // リトライ判定に必要なステータスを見る前に本文を読むと、
      // 429/503 応答の本文取得で無駄に待つ。ステータスが成功のときだけ読む。
      if (res.ok) bodyText = await res.text();
    } catch (e) {
      if (attempt < RETRY_DELAYS_SEC.length) {
        const waitSec = RETRY_DELAYS_SEC[attempt];
        console.warn(
          `  リクエスト失敗（${e instanceof Error ? e.name : e}）。${waitSec}秒待って再試行します（${attempt + 1}/${RETRY_DELAYS_SEC.length}）`
        );
        await sleep(waitSec * 1000);
        continue;
      }
      throw e;
    }

    if (
      (res.status === 429 || res.status === 503) &&
      attempt < RETRY_DELAYS_SEC.length
    ) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitSec =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter
          : RETRY_DELAYS_SEC[attempt];
      console.warn(
        `  HTTP ${res.status} を受信。${waitSec}秒待って再試行します（${attempt + 1}/${RETRY_DELAYS_SEC.length}）`
      );
      await sleep(waitSec * 1000);
      continue;
    }

    if (res.status === 404) return { kind: "notFound" };
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    if (bodyText === null) {
      throw new Error(`本文を読み取れませんでした: ${url}`);
    }

    return { kind: "ok", html: bodyText };
  }
}

/** 中間JSONの議案1件 */
type OutputBill = ParsedBill & {
  status: "approved" | "submitted";
  statusNote: string;
  sourceUrl: string;
};

/** 中間JSONの形 */
type SessionOutput = {
  sessionName: string;
  /** council_sessions の表記に合わせた会期名 */
  dbSessionName: string;
  sessionKey: string;
  startDate: string | null;
  endDate: string | null;
  councilUrl: string;
  sourceUrl: string;
  voteResultUrl: string | null;
  scrapedAt: string;
  billCount: number;
  /** 知事議案説明要旨に書かれた当初提出議案の件数。検算用 */
  declaredInitialCount: number | null;
  bills: OutputBill[];
  warnings: string[];
};

/** 索引を辿って対象会期の一覧を得る */
async function collectSessions(
  years: number[] | null
): Promise<SessionIndexEntry[]> {
  const indexRes = await fetchHtml(YEAR_INDEX_URL);
  if (indexRes.kind === "notFound") {
    throw new Error(`年次索引が見つかりません: ${YEAR_INDEX_URL}`);
  }

  const yearEntries = parseYearIndex(indexRes.html);
  if (yearEntries.length === 0) {
    throw new Error("年次索引から年を抽出できませんでした");
  }

  const targets =
    years === null
      ? yearEntries
      : yearEntries.filter((e) =>
          years.some((y) => e.label.startsWith(`令和${y}年`))
        );

  if (targets.length === 0) {
    const available = yearEntries.map((e) => e.label).join(" / ");
    throw new Error(
      `指定年に該当する索引がありません。索引にある年: ${available}`
    );
  }

  const sessions: SessionIndexEntry[] = [];
  for (const year of targets) {
    console.log(`索引を取得: ${year.label}（${year.page}）`);
    const res = await fetchHtml(year.url);
    if (res.kind === "notFound") {
      console.warn(`  索引ページが404でした: ${year.url}`);
      continue;
    }
    sessions.push(...parseSessionIndex(res.html));
  }

  return sessions;
}

/** 1会期分を取得して中間JSONの内容を組み立てる */
async function scrapeSession(
  entry: SessionIndexEntry
): Promise<SessionOutput> {
  console.log(`\n=== ${entry.sessionName}（${entry.sessionKey}） ===`);

  const billRes = await fetchHtml(entry.billListUrl);
  if (billRes.kind === "notFound") {
    // 索引に載っているページが404なのは異常。採決結果ページの404（未掲載）と
    // 違って想定内ではないため、読み飛ばして「完了」にせず失敗として扱う。
    throw new Error(
      `提出議案ページが404でした（索引には掲載されています）: ${entry.billListUrl}`
    );
  }

  const parsed = parseBillList(billRes.html);
  const warnings = [...parsed.warnings];
  console.log(`  提出議案: ${parsed.bills.length}件`);

  // 採決結果。存在しない会期があるため404を許容する
  let voteResults: ParseVoteResultsResult | null = null;
  let voteResultUrl: string | null = null;
  const voteRes = await fetchHtml(entry.voteResultUrl);
  if (voteRes.kind === "notFound") {
    warnings.push(`採決結果ページが未掲載です: ${entry.voteResultUrl}`);
    console.log("  採決結果: 未掲載（404）");
  } else {
    voteResults = parseVoteResults(voteRes.html);
    voteResultUrl = entry.voteResultUrl;
    warnings.push(...voteResults.warnings);
    console.log(
      `  採決結果: 宣言${voteResults.declarations.length}件 / 可決 知事提出${voteResults.approvedBillNumbers.size}件・議員提出${voteResults.approvedMemberBillNumbers.size}件`
    );
  }

  // 会期日程（start_date / end_date）
  const scheduleRes = await fetchHtml(entry.scheduleUrl);
  let startDate: string | null = null;
  let endDate: string | null = null;
  if (scheduleRes.kind === "notFound") {
    warnings.push(`会期日程ページが未掲載です: ${entry.scheduleUrl}`);
    console.log("  会期日程: 未掲載（404）");
  } else {
    const schedule = parseSessionSchedule(scheduleRes.html);
    startDate = schedule.startDate;
    endDate = schedule.endDate;
    warnings.push(...schedule.warnings);
    console.log(`  会期日程: ${startDate ?? "?"} 〜 ${endDate ?? "（会期中）"}`);
  }

  // 知事議案説明要旨の件数（検算用）
  const chijiUrl = `${SITE_ORIGIN}/site/honkaigi/chiji-${entry.sessionKey}.html`;
  let declaredInitialCount: number | null = null;
  const chijiRes = await fetchHtml(chijiUrl);
  if (chijiRes.kind === "ok") {
    declaredInitialCount = extractDeclaredBillCount(chijiRes.html);
  }

  const bills: OutputBill[] = parsed.bills.map((bill) => {
    const number = Number(bill.billNumber.replace(/[^\d]/g, ""));
    const { status, statusNote } = resolveBillStatus(
      number,
      bill.billType,
      voteResults
    );
    return { ...bill, status, statusNote, sourceUrl: entry.billListUrl };
  });

  // 検算: 当初提出議案（最初の提出日の知事提出議案）の件数を突き合わせる
  if (declaredInitialCount !== null) {
    const firstDate = bills.find((b) => b.billType === "bill")?.submittedDate;
    const initial = bills.filter(
      (b) => b.billType === "bill" && b.submittedDate === firstDate
    );
    if (initial.length !== declaredInitialCount) {
      warnings.push(
        `当初提出議案の件数が知事議案説明要旨と一致しません: 要旨${declaredInitialCount}件 / 取得${initial.length}件`
      );
    } else {
      console.log(`  検算OK: 当初提出 ${initial.length}件（要旨と一致）`);
    }
  }

  // 可決レンジに入らなかった議案は、否決・継続審査・撤回・未採決のいずれか。
  // 機械的に判別できないため件数を警告に残し、目視レビューの入口にする。
  const unresolved = bills.filter((b) => b.status === "submitted");
  if (unresolved.length > 0) {
    const numbers = unresolved
      .map((b) => `${b.billType === "member_bill" ? "議員提出" : ""}${b.billNumber}`)
      .join("・");
    warnings.push(
      `議決結果が確定しない議案 ${unresolved.length}件（要確認）: ${numbers}`
    );
    console.log(
      `  ⚠ 議決結果が確定しない議案 ${unresolved.length}件（目視確認が必要）`
    );
  }

  return {
    sessionName: entry.sessionName,
    dbSessionName: toDbSessionName(entry.sessionName),
    sessionKey: entry.sessionKey,
    startDate,
    endDate,
    councilUrl: entry.menuUrl,
    sourceUrl: entry.billListUrl,
    voteResultUrl,
    scrapedAt: new Date().toISOString(),
    billCount: bills.length,
    declaredInitialCount,
    bills,
    warnings,
  };
}

type Options = {
  years: number[] | null;
  sessionKeys: string[] | null;
  listOnly: boolean;
  force: boolean;
};

function parseArgs(argv: string[]): Options {
  const get = (name: string): string | null => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  };

  const yearsRaw = get("--years");
  const sessionRaw = get("--session");

  return {
    years: yearsRaw
      ? yearsRaw.split(",").map((s) => Number(s.trim())).filter(Number.isFinite)
      : null,
    sessionKeys: sessionRaw ? sessionRaw.split(",").map((s) => s.trim()) : null,
    listOnly: argv.includes("--list"),
    force: argv.includes("--force"),
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  // 既定は令和7〜8年（設計書 §2 の対象範囲）。
  // --session 指定時も既定年から探し、見つからなければ全年へ広げる。
  // いきなり全年の索引を取ると不要なリクエストが8回増えるため。
  const years = options.years ?? [7, 8];
  let all = await collectSessions(years);

  const pick = (sessions: SessionIndexEntry[]): SessionIndexEntry[] =>
    options.sessionKeys
      ? sessions.filter((s) => options.sessionKeys?.includes(s.sessionKey))
      : sessions;

  let targets = pick(all);

  if (targets.length === 0 && options.sessionKeys && options.years === null) {
    console.log(
      "\n既定年（令和7〜8年）に該当が無いため、索引全体を探します"
    );
    all = await collectSessions(null);
    targets = pick(all);
  }

  // 指定したキーの一部しか索引に無い場合、filter は残りを黙って捨てる。
  // 「完了」と表示して取り逃がしに気づけないため、欠落を明示して失敗させる。
  if (options.sessionKeys) {
    const found = new Set(targets.map((t) => t.sessionKey));
    const missing = options.sessionKeys.filter((k) => !found.has(k));
    if (missing.length > 0) {
      console.error(
        `指定した会期キーが索引に見つかりません: ${missing.join(", ")}`
      );
      console.error(
        `索引にある会期キー: ${all.map((s) => s.sessionKey).join(", ")}`
      );
      process.exitCode = 1;
      return;
    }
  }

  if (targets.length === 0) {
    console.error("対象会期がありません。--list で索引の内容を確認してください");
    process.exitCode = 1;
    return;
  }

  console.log(`\n対象会期 ${targets.length}件:`);
  for (const t of targets) {
    console.log(`  ${t.sessionKey}  ${t.sessionName}`);
  }

  if (options.listOnly) {
    console.log("\n--list のため取得は行いません");
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  let skipped = 0;
  const allWarnings: string[] = [];
  const failures: string[] = [];

  for (const entry of targets) {
    const outPath = join(OUT_DIR, `${entry.sessionKey}.json`);
    if (!options.force && existsSync(outPath)) {
      console.log(
        `\n=== ${entry.sessionName}（${entry.sessionKey}） === 既存JSONがあるためスキップ（--force で上書き）`
      );
      skipped++;
      continue;
    }

    // 1会期の失敗で他の会期を落とさない。ただし最後に失敗として報告し、
    // 終了コードを立てる（読み飛ばして「完了」と表示しないため）。
    let output: SessionOutput;
    try {
      output = await scrapeSession(entry);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ 取得失敗: ${message}`);
      failures.push(`[${entry.sessionKey}] ${entry.sessionName}: ${message}`);
      continue;
    }

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf-8");
    console.log(`  → ${outPath}`);
    written++;

    for (const w of output.warnings) {
      allWarnings.push(`[${entry.sessionKey}] ${w}`);
    }
  }

  console.log(
    `\n完了: 書き出し${written}件 / スキップ${skipped}件 / 失敗${failures.length}件 / 警告${allWarnings.length}件`
  );

  if (allWarnings.length > 0) {
    console.log("\n--- 警告（目視レビューで確認すること）---");
    for (const w of allWarnings) console.log(`  ${w}`);
  }

  if (failures.length > 0) {
    console.error("\n--- 取得失敗 ---");
    for (const f of failures) console.error(`  ${f}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
