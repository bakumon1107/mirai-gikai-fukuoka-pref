/**
 * parse-bill-index.ts
 *
 * 福岡県議会ホームページの提出議案件名一覧（list43*.html）をパースする純粋関数群。
 *
 * **URLを推測せず索引を辿る。** 命名は `gian-<元号年2桁><月2桁>.html` だが、
 * 平成31年2月は `gian-3102.html`、令和元年5月は `gian-0105.html` と
 * 元号をまたぐため、年と月から機械的に組み立てると衝突・破綻する。
 *
 * 詳細は docs/20260922_1650_議案スクレイプ設計.md §4.1 を参照。
 */

const SITE_ORIGIN = "https://www.gikai.pref.fukuoka.lg.jp";
const HONKAIGI_PATH = "/site/honkaigi";

/** 年次索引ページ（list43.html → 各年の list43-NNN.html） */
export type YearIndexEntry = {
  /** 表示名（例「令和7年」） */
  label: string;
  /** ページのファイル名（例「list43-205」） */
  page: string;
  url: string;
};

/** 各年の索引から得られる会期 */
export type SessionIndexEntry = {
  /** 会期名（例「令和7年6月定例会」）。リンクテキストから取る */
  sessionName: string;
  /** 会期キー（例「0706」）。関連ページのURL生成に使う */
  sessionKey: string;
  /** 提出議案件名ページのURL */
  billListUrl: string;
  /** 採決結果ページのURL（存在しない会期もある。実在確認は取得側で行う） */
  voteResultUrl: string;
  /** 会期日程ページのURL */
  scheduleUrl: string;
  /** 会期メニューページのURL。council_sessions.council_url に入れる */
  menuUrl: string;
};

function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_ORIGIN}${path}`;
}

/** 「/site/honkaigi/list43-205.html">令和7年（提出議案件名）」を拾う */
const YEAR_LINK_RE =
  /href="([^"]*\/(list43-\d+)\.html)"[^>]*>\s*((?:令和|平成)(?:\d+|元)年(?:（[^<）]*）)?)[^<]*/g;

/** 「/site/honkaigi/gian-0706.html">令和7年6月定例会の提出議案件名」を拾う */
const SESSION_LINK_RE =
  /href="([^"]*\/gian-(\d{4})\.html)"[^>]*>\s*((?:令和|平成)(?:\d+|元)年\d+月(?:定例会|臨時会))の提出議案件名/g;

/**
 * 年次索引（list43.html）から各年のページを抽出する。
 *
 * リンクテキストは「令和7年（提出議案件名）」の形式。
 * **末尾の括弧を一律に落としてはいけない。** 令和元年のリンクは
 * 「令和元年（平成31年）（提出議案件名）」で、改元をまたぐ年であることを
 * 括弧で示しているため、`（提出議案件名）` だけを除去する。
 */
export function parseYearIndex(html: string): YearIndexEntry[] {
  const entries: YearIndexEntry[] = [];
  const seen = new Set<string>();

  for (const m of html.matchAll(YEAR_LINK_RE)) {
    const page = m[2];
    if (seen.has(page)) continue;
    seen.add(page);

    entries.push({
      label: m[3].replace(/（提出議案件名）\s*$/, "").trim(),
      page,
      url: absoluteUrl(m[1]),
    });
  }

  return entries;
}

/**
 * 各年の索引（list43-NNN.html）から会期を抽出する。
 *
 * 会期キー（gian-0706 の「0706」）から採決結果・日程・メニューの各URLを
 * 組み立てる。これらは同じキーを共有するため、索引から得たキーを使えば
 * 元号をまたぐ命名の問題を回避できる。
 */
export function parseSessionIndex(html: string): SessionIndexEntry[] {
  const entries: SessionIndexEntry[] = [];
  const seen = new Set<string>();

  for (const m of html.matchAll(SESSION_LINK_RE)) {
    const sessionKey = m[2];
    if (seen.has(sessionKey)) continue;
    seen.add(sessionKey);

    entries.push({
      sessionName: m[3],
      sessionKey,
      billListUrl: absoluteUrl(m[1]),
      voteResultUrl: `${SITE_ORIGIN}${HONKAIGI_PATH}/saiketsu-${sessionKey}.html`,
      scheduleUrl: `${SITE_ORIGIN}${HONKAIGI_PATH}/gikainittei-${sessionKey}.html`,
      menuUrl: `${SITE_ORIGIN}${HONKAIGI_PATH}/menu-${sessionKey}.html`,
    });
  }

  return entries;
}

/**
 * 会期名をDBの表記へ正規化する。
 *
 * 公式サイトは `令和8年6月定例会`（スペースなし）だが、
 * council_sessions は `令和8年 6月定例会`（年のあとに半角スペース）で
 * 登録されている。既存4件がすべてこの表記なので合わせる。
 */
export function toDbSessionName(sessionName: string): string {
  return sessionName.replace(
    /^((?:令和|平成)(?:\d+|元)年)(\d+月)/,
    "$1 $2"
  );
}

/**
 * 会期名の比較用キー。空白（半角・全角）を落として突合する。
 * DB表記とサイト表記の食い違いを吸収するため。
 */
export function sessionNameKey(sessionName: string): string {
  return sessionName.replace(/[\s　]/g, "");
}
