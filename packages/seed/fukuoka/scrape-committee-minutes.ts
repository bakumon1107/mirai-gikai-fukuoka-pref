/**
 * scrape-committee-minutes.ts
 *
 * 福岡県議会 会議録検索システム（dbsr.jp）から現行委員会の議事録を取得し、
 * docs/data/committee-minutes/<年>/ にJSONで保存する。
 *
 * 実行例:
 *   cd packages/seed
 *   npx tsx fukuoka/scrape-committee-minutes.ts                 # 2026年・全現行委員会
 *   npx tsx fukuoka/scrape-committee-minutes.ts --year 2026
 *   npx tsx fukuoka/scrape-committee-minutes.ts --committee sc,nr  # 委員会コード指定
 *
 * 新サイト（Laravel版・2026年リニューアル）の取得フロー:
 * 1. GET /                    … cookie（XSRF-TOKEN, laravel_session）を受け取る
 * 2. GET /?Template=search-top … 検索フォームのCSRFトークン(_token)を得る
 * 3. POST /100000            … CabinetName[]=<コード> で委員会を絞り込み一覧を得る。
 *                              レスポンス内のリンクにセッションパス(/106343…)が入る
 * 4. GET /<session>?Template=document&Id=<Id> … 本文HTMLを得る
 *
 * 注意:
 * - リクエスト間に2秒のウェイトを入れる（サーバー負荷への配慮）
 * - 旧サイトからのリニューアルでDocumentIdの採番が変わったため、取得済み判定は
 *   DocumentIdではなく「開催日＋委員会slug」で行う（同一会議の重複保存を防ぐ）
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildNewSourceUrl,
  buildRawText,
  CURRENT_COMMITTEES,
  extractCsrfToken,
  extractDocName,
  extractSessionPath,
  NEW_SITE_COMMITTEES,
  NEW_SITE_ID_OFFSET,
  parseDocumentPage,
  parseSearchListPage,
  type Speech,
} from "./parse-committee-minutes";

const BASE_URL = "https://www.pref.fukuoka.dbsr.jp";
const WAIT_MS = 2000;
/** 429/503・タイムアウト時のリトライ回数と待ち時間（秒） */
const RETRY_DELAYS_SEC = [30, 60, 120];
const REQUEST_TIMEOUT_MS = 30_000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");

/** 保存するJSONのシェイプ */
type MeetingJson = {
  documentId: number;
  title: string;
  committee: {
    dbsrName: string;
    currentName: string;
    slug: string;
    type: string;
    cabinetId: number;
  };
  meetingDate: string;
  sourceUrl: string;
  scrapedAt: string;
  speechCount: number;
  speeches: Speech[];
  rawText: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** cookieを維持しつつ2秒間隔でHTMLを取得する簡易クライアント */
class DbsrClient {
  /** name → value のcookieジャー（XSRF-TOKEN, laravel_session 等を保持） */
  private cookies = new Map<string, string>();

  private cookieHeader(): string {
    return [...this.cookies.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  private storeCookies(res: Response): void {
    // Node 18+ の getSetCookie() で複数の Set-Cookie を個別に受け取る
    for (const line of res.headers.getSetCookie()) {
      const pair = line.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      this.cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }

  private async request(url: string, body?: URLSearchParams): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      await sleep(WAIT_MS);
      let res: Response;
      try {
        res = await fetch(url, {
          method: body ? "POST" : "GET",
          headers: {
            ...(this.cookies.size ? { Cookie: this.cookieHeader() } : {}),
            ...(body
              ? { "Content-Type": "application/x-www-form-urlencoded" }
              : {}),
            "User-Agent":
              "mirai-gikai-fukuoka-pref scraper (contact: GitHub bakumon1107)",
          },
          body,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (e) {
        // タイムアウト・一時的な接続断はリトライする
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

      // 一時的なレート制限はRetry-After（なければ既定値）だけ待って再試行する
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

  private csrfToken = "";

  /** トップページと検索フォームにアクセスし、cookieとCSRFトークンを得る */
  async init(): Promise<void> {
    await this.request(`${BASE_URL}/`);
    const searchTop = await this.request(`${BASE_URL}/?Template=search-top`);
    const token = extractCsrfToken(searchTop);
    if (!token) {
      throw new Error("CSRFトークン(_token)を取得できませんでした");
    }
    this.csrfToken = token;
  }

  /**
   * 委員会コード(CabinetName)で本文を絞り込み検索する。
   * レスポンスHTMLとセッションパスを返す。
   */
  async searchCommittee(
    code: string
  ): Promise<{ html: string; sessionPath: string | null }> {
    const params = new URLSearchParams();
    params.set("_token", this.csrfToken);
    params.set("QueryType", "new");
    params.set("Template", "list");
    params.set("ListType", "text");
    params.set("Phrase", "");
    params.append("CabinetName[]", code);
    const html = await this.request(`${BASE_URL}/100000`, params);
    return { html, sessionPath: extractSessionPath(html) };
  }

  /** セッションパス配下の文書ページ（本文）HTMLを取得する */
  async fetchDocument(
    sessionPath: string,
    documentId: number
  ): Promise<string> {
    return this.request(
      `${BASE_URL}/${sessionPath}?Template=document&Id=${documentId}`
    );
  }
}

/**
 * 取得済み会議の一覧を「<slug>_<date>」の集合として復元する。
 * ファイル名は `<date>_<slug>_<documentId>.json`。
 * リニューアルでDocumentIdが変わったため、日付＋slugで重複判定する。
 */
function loadScrapedKeys(outDir: string): Set<string> {
  if (!existsSync(outDir)) return new Set();
  const keys = new Set<string>();
  for (const name of readdirSync(outDir)) {
    const m = name.match(/^(\d{4}-\d{2}-\d{2})_(.+)_\d+\.json$/);
    if (m) keys.add(`${m[2]}_${m[1]}`);
  }
  return keys;
}

async function main(): Promise<void> {
  const yearArgIndex = process.argv.indexOf("--year");
  const year =
    yearArgIndex >= 0 ? Number(process.argv[yearArgIndex + 1]) : 2026;
  if (!Number.isInteger(year) || year < 1995) {
    throw new Error(`不正な年指定です: ${process.argv[yearArgIndex + 1]}`);
  }

  // --committee sc,nr のように対象委員会コードを絞れる（省略時は全現行委員会）
  const commArgIndex = process.argv.indexOf("--committee");
  if (commArgIndex >= 0 && !process.argv[commArgIndex + 1]) {
    throw new Error(
      "--committee には委員会コードを指定してください（例: --committee sc,nr）"
    );
  }
  const targetCodes =
    commArgIndex >= 0
      ? new Set(
          process.argv[commArgIndex + 1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      : null;
  if (targetCodes) {
    const known = new Set(NEW_SITE_COMMITTEES.map((c) => c.code));
    for (const code of targetCodes) {
      if (!known.has(code)) {
        console.warn(`未知の委員会コードを無視します: ${code}`);
      }
    }
  }
  const committees = targetCodes
    ? NEW_SITE_COMMITTEES.filter((c) => targetCodes.has(c.code))
    : NEW_SITE_COMMITTEES;
  if (committees.length === 0) {
    throw new Error("対象の委員会コードがありません");
  }

  const outDir = join(REPO_ROOT, "docs/data/committee-minutes", String(year));
  mkdirSync(outDir, { recursive: true });
  const scrapedKeys = loadScrapedKeys(outDir);

  const client = new DbsrClient();
  await client.init();
  console.log("セッション開始（cookie・CSRFトークン取得）");

  let saved = 0;
  let skipped = 0;
  for (const committee of committees) {
    const { html, sessionPath } = await client.searchCommittee(committee.code);
    if (!sessionPath) {
      console.warn(
        `セッションパスを取得できませんでした: ${committee.dbsrName}（コード=${committee.code}）`
      );
      continue;
    }
    const docs = parseSearchListPage(html).filter((d) =>
      d.date.startsWith(`${year}-`)
    );
    console.log(
      `${committee.dbsrName}: ${year}年の文書 ${docs.length}件（セッション=${sessionPath}）`
    );

    // cabinetIdはMeetingJson互換のため既存メタ（slug一致）から補完する
    const cabinetId =
      CURRENT_COMMITTEES.find((c) => c.slug === committee.slug)?.cabinetId ?? 0;

    for (const doc of docs) {
      const key = `${committee.slug}_${doc.date}`;
      if (scrapedKeys.has(key)) {
        console.log(
          `スキップ（取得済み）: ${committee.slug} ${doc.date} (Id=${doc.documentId})`
        );
        skipped++;
        continue;
      }

      const pageHtml = await client.fetchDocument(sessionPath, doc.documentId);
      const speeches = parseDocumentPage(pageHtml);
      if (speeches.length === 0) {
        console.warn(
          `発言が取得できませんでした: ${committee.dbsrName} ${doc.date} (Id=${doc.documentId})`
        );
        continue;
      }

      // 実Id（source_url用）と、旧id空間との衝突を避けたsource_document_id
      const rawId = doc.documentId;
      const documentId = rawId + NEW_SITE_ID_OFFSET;
      // 文書ページの実際の会議名を優先。取れなければ年＋委員会名で合成する
      const title =
        extractDocName(pageHtml) ??
        `令和${year - 2018}年　${committee.dbsrName}　本文`;

      const json: MeetingJson = {
        documentId,
        title,
        committee: {
          dbsrName: committee.dbsrName,
          currentName: committee.currentName,
          slug: committee.slug,
          type: committee.type,
          cabinetId,
        },
        meetingDate: doc.date,
        sourceUrl: buildNewSourceUrl(rawId),
        scrapedAt: new Date().toISOString(),
        speechCount: speeches.length,
        speeches,
        rawText: buildRawText(speeches),
      };

      const fileName = `${doc.date}_${committee.slug}_${documentId}.json`;
      writeFileSync(
        join(outDir, fileName),
        `${JSON.stringify(json, null, 2)}\n`
      );
      scrapedKeys.add(key);
      saved++;
      console.log(`保存: ${fileName}（${speeches.length}発言）`);
    }
  }

  console.log(`完了: 新規${saved}件 / スキップ（取得済み）${skipped}件`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
