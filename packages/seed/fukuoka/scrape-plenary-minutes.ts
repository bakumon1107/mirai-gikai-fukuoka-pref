/**
 * scrape-plenary-minutes.ts
 *
 * 福岡県議会 会議録検索システム（dbsr.jp）から本会議（代表質問・一般質問）の
 * 会議録を取得し、docs/data/<会議名>.txt にUTF-8のプレーンテキストで保存する。
 * 保存したテキストは parse-general-questions.py の入力になる。
 *
 * 実行例:
 *   cd packages/seed
 *   npx tsx fukuoka/scrape-plenary-minutes.ts --ids 7614,7618,7622
 *
 * 取得フロー（委員会スクレイパーと同じLaravel版サイト）:
 * 1. GET /                                   … cookie（XSRF-TOKEN, laravel_session）を受け取る
 * 2. GET /100000?Template=document&Id=<Id>   … 本文HTML
 *
 * 委員会と違い、対象の文書Idはユーザーから渡されたURLで分かっているため検索はしない。
 * リクエスト間に2秒のウェイトを入れ、429/503はリトライする（サーバー負荷への配慮）。
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractDocName } from "./parse-committee-minutes";
import {
  buildPlenaryFileName,
  buildPlenaryText,
  extractDocDate,
  extractSessionDay,
  extractVoiceTexts,
} from "./parse-plenary-minutes";

const BASE_URL = "https://www.pref.fukuoka.dbsr.jp";
const WAIT_MS = 2000;
const RETRY_DELAYS_SEC = [30, 60, 120];
const REQUEST_TIMEOUT_MS = 30_000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** cookieを維持しつつ2秒間隔でHTMLを取得する簡易クライアント */
class DbsrClient {
  private cookies = new Map<string, string>();

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private storeCookies(res: Response): void {
    for (const line of res.headers.getSetCookie()) {
      const pair = line.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      this.cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }

  private async request(url: string): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      await sleep(WAIT_MS);
      let res: Response;
      try {
        res = await fetch(url, {
          headers: {
            ...(this.cookies.size ? { Cookie: this.cookieHeader() } : {}),
            "User-Agent":
              "mirai-gikai-fukuoka-pref scraper (contact: GitHub bakumon1107)",
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (e) {
        if (attempt < RETRY_DELAYS_SEC.length) {
          const waitSec = RETRY_DELAYS_SEC[attempt];
          console.warn(
            `リクエスト失敗（${e instanceof Error ? e.name : e}）。${waitSec}秒待って再試行します（${attempt + 1}/${RETRY_DELAYS_SEC.length}）`
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
          `HTTP ${res.status} を受信。${waitSec}秒待って再試行します（${attempt + 1}/${RETRY_DELAYS_SEC.length}）`
        );
        await sleep(waitSec * 1000);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      this.storeCookies(res);
      return res.text();
    }
  }

  /** トップページにアクセスしてcookieを得る */
  async init(): Promise<void> {
    await this.request(`${BASE_URL}/`);
  }

  async fetchDocument(documentId: number): Promise<string> {
    return this.request(`${BASE_URL}/100000?Template=document&Id=${documentId}`);
  }
}

function parseIdsArg(): number[] {
  const idx = process.argv.indexOf("--ids");
  if (idx < 0 || !process.argv[idx + 1]) {
    throw new Error(
      "--ids に文書Idをカンマ区切りで指定してください（例: --ids 7614,7618）"
    );
  }
  const ids = process.argv[idx + 1]
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) {
    throw new Error(`不正な --ids 指定です: ${process.argv[idx + 1]}`);
  }
  return ids;
}

async function main(): Promise<void> {
  const ids = parseIdsArg();
  const outDir = join(REPO_ROOT, "docs/data");
  mkdirSync(outDir, { recursive: true });

  const client = new DbsrClient();
  await client.init();
  console.log("セッション開始（cookie取得）");

  for (const id of ids) {
    const html = await client.fetchDocument(id);
    const docName = extractDocName(html);
    const date = extractDocDate(html);
    if (!docName || !date) {
      console.warn(`会議名または開催日を取得できませんでした: Id=${id}`);
      continue;
    }
    const voices = extractVoiceTexts(html);
    if (voices.length === 0) {
      console.warn(`発言が取得できませんでした: ${docName} (Id=${id})`);
      continue;
    }

    const fileName = buildPlenaryFileName(docName);
    writeFileSync(
      join(outDir, fileName),
      buildPlenaryText(docName, date, voices),
      "utf-8"
    );
    console.log(
      `保存: docs/data/${fileName}（${date} / ${voices.length}発言 / 第${extractSessionDay(docName)}日 / Id=${id}）`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
