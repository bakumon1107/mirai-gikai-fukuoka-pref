/**
 * トップページ「気になるテーマから」の8テーマ定義（設計書 5.8 節）。
 *
 * このファイルが唯一の定義元。テーマ・アイコン文字・配色系統・検索語・
 * 既存分類との対応をすべてここから引く。
 *
 * テーマページ（`/themes/[slug]`）を作るときは {@link themeHref} だけ差し替える。
 */

/** 配色の系統（設計書 5.8.2 節） */
export type ThemeTone = "purple" | "beige" | "coral";

export type ThemeSlug =
  | "kosodate-kyoiku"
  | "fukushi-iryo"
  | "bosai-anzen"
  | "machi-kotsu"
  | "kankyo-energy"
  | "shigoto-nogyo"
  | "kanko-bunka"
  | "kensei-okane";

export type TopTheme = {
  slug: ThemeSlug;
  label: string;
  /** タイルの漢字一文字アイコン */
  kanji: string;
  tone: ThemeTone;
  /** 当面のリンク先に使う検索語（設計書 5.8.1 節） */
  searchQuery: string;
  /**
   * 一般質問側の分類（`build-topic-groups.ts` の `CATEGORY_MAP` のラベル）。
   * 11分類がすべてどれかに収まる。
   */
  questionCategories: string[];
};

/** 一般質問側の11分類（`build-topic-groups.ts` の `CATEGORY_MAP` と対応） */
export const QUESTION_CATEGORIES = [
  "子育て・教育",
  "健康・医療",
  "防災・安全",
  "高齢者・福祉",
  "交通・まちづくり",
  "環境・脱炭素",
  "スポーツ・文化",
  "観光・地域振興",
  "産業・農林水産",
  "警察・人権",
  "行政・県政",
] as const;

export const TOP_THEMES: TopTheme[] = [
  {
    slug: "kosodate-kyoiku",
    label: "子育て・教育",
    kanji: "育",
    tone: "coral",
    searchQuery: "子育て",
    questionCategories: ["子育て・教育"],
  },
  {
    slug: "fukushi-iryo",
    label: "福祉・医療",
    kanji: "医",
    tone: "purple",
    searchQuery: "医療",
    questionCategories: ["健康・医療", "高齢者・福祉"],
  },
  {
    slug: "bosai-anzen",
    label: "防災・安全",
    kanji: "防",
    tone: "beige",
    searchQuery: "防災",
    questionCategories: ["防災・安全", "警察・人権"],
  },
  {
    slug: "machi-kotsu",
    label: "まち・交通",
    kanji: "街",
    tone: "purple",
    searchQuery: "交通",
    questionCategories: ["交通・まちづくり"],
  },
  {
    slug: "kankyo-energy",
    label: "環境・エネルギー",
    kanji: "環",
    tone: "beige",
    searchQuery: "環境",
    questionCategories: ["環境・脱炭素"],
  },
  {
    slug: "shigoto-nogyo",
    label: "しごと・農業",
    kanji: "農",
    tone: "coral",
    searchQuery: "農業",
    questionCategories: ["産業・農林水産"],
  },
  {
    slug: "kanko-bunka",
    label: "観光・文化",
    kanji: "観",
    tone: "purple",
    searchQuery: "観光",
    questionCategories: ["観光・地域振興", "スポーツ・文化"],
  },
  {
    slug: "kensei-okane",
    label: "県政・お金",
    kanji: "県",
    tone: "beige",
    searchQuery: "県政",
    questionCategories: ["行政・県政"],
  },
];

/**
 * テーマタイルのリンク先。
 *
 * 当面は検索ページへ飛ばす（設計書 5.8.4 節）。
 * テーマページを作るときはここだけ `/themes/${theme.slug}` に差し替える。
 */
export function themeHref(theme: TopTheme): string {
  return `/search?q=${encodeURIComponent(theme.searchQuery)}`;
}

/**
 * 「ほかのキーワードで探す」の遷移先。
 *
 * どのテーマにも入らない項目の導線（設計書 5.8.3 節）。
 * 「その他」タイルは作らない。
 */
export const OTHER_KEYWORDS_HREF = "/search";

/**
 * 一般質問の分類ラベルから対応するテーマを引く。
 *
 * `CATEGORY_MAP` のフォールバック「その他」など、
 * どのテーマにも属さないラベルは null を返す。
 */
export function themeForQuestionCategory(
  categoryLabel: string
): TopTheme | null {
  return (
    TOP_THEMES.find((theme) =>
      theme.questionCategories.includes(categoryLabel)
    ) ?? null
  );
}
