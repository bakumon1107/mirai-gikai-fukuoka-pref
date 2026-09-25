import { describe, expect, it } from "vitest";
import { assignCategory } from "@/features/general-questions/shared/utils/build-topic-groups";
import {
  OTHER_KEYWORDS_HREF,
  QUESTION_CATEGORIES,
  TOP_THEMES,
  splitThemeLabel,
  themeForQuestionCategory,
  themeHref,
} from "./theme-mapping";

describe("TOP_THEMES", () => {
  it("8テーマある", () => {
    expect(TOP_THEMES).toHaveLength(8);
  });

  it("slug が重複しない", () => {
    const slugs = TOP_THEMES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("漢字アイコンは一文字", () => {
    for (const theme of TOP_THEMES) {
      expect([...theme.kanji], theme.label).toHaveLength(1);
    }
  });

  it("配色は紫・ベージュ・コーラルの3系統を交互に当てる", () => {
    expect(TOP_THEMES.map((t) => t.tone)).toEqual([
      "coral",
      "purple",
      "beige",
      "purple",
      "beige",
      "coral",
      "purple",
      "beige",
    ]);
  });
});

describe("一般質問の分類との対応", () => {
  it("11分類がすべていずれかのテーマに写る", () => {
    const unmapped = QUESTION_CATEGORIES.filter(
      (category) => themeForQuestionCategory(category) === null
    );
    expect(unmapped).toEqual([]);
  });

  it("1つの分類が複数テーマに重複して割り当てられていない", () => {
    const assigned = TOP_THEMES.flatMap((t) => t.questionCategories);
    expect(new Set(assigned).size).toBe(assigned.length);
  });

  it("テーマ側に、存在しない分類ラベルが混ざっていない", () => {
    const known = new Set<string>(QUESTION_CATEGORIES);
    for (const theme of TOP_THEMES) {
      for (const category of theme.questionCategories) {
        expect(known.has(category), `${theme.label} / ${category}`).toBe(true);
      }
    }
  });

  it("実装側の CATEGORY_MAP が返すラベルと一致している", () => {
    // build-topic-groups.ts のキーワード判定が返す実際のラベルを突き合わせる。
    // 片方だけ分類名を変えたときに落ちる。
    const samples: [string, string][] = [
      ["保育所の整備について", "子育て・教育"],
      ["地域医療の確保について", "健康・医療"],
      ["高齢者の介護予防について", "高齢者・福祉"],
      ["県内の観光振興について", "観光・地域振興"],
    ];
    for (const [title, expectedCategory] of samples) {
      const { label } = assignCategory(title);
      expect(label, title).toBe(expectedCategory);
      expect(themeForQuestionCategory(label), title).not.toBeNull();
    }
  });

  it("どのテーマにも属さないラベルは null を返す", () => {
    expect(themeForQuestionCategory("その他")).toBeNull();
    expect(themeForQuestionCategory("")).toBeNull();
  });

  it("CATEGORY_MAP のフォールバック「その他」は8テーマに入らない", () => {
    const { label } = assignCategory("まったく該当しない議題タイトル");
    expect(label).toBe("その他");
    expect(themeForQuestionCategory(label)).toBeNull();
  });
});

describe("themeHref", () => {
  it("検索ページへ検索語つきで飛ばす", () => {
    const kosodate = TOP_THEMES[0];
    expect(themeHref(kosodate)).toBe("/search?q=%E5%AD%90%E8%82%B2%E3%81%A6");
  });

  it("全テーマが検索語を持つ", () => {
    for (const theme of TOP_THEMES) {
      expect(theme.searchQuery.length, theme.label).toBeGreaterThan(0);
    }
  });

  it("「ほかのキーワードで探す」は検索語なしの検索ページ", () => {
    expect(OTHER_KEYWORDS_HREF).toBe("/search");
  });
});

describe("splitThemeLabel", () => {
  it("「・」で2行に割り、区切り文字は落とす", () => {
    expect(splitThemeLabel("子育て・教育")).toEqual({
      head: "子育て",
      tail: "教育",
    });
  });

  it("最長のラベルも2行に収まる", () => {
    expect(splitThemeLabel("環境・エネルギー")).toEqual({
      head: "環境",
      tail: "エネルギー",
    });
  });

  it("「・」が無いラベルは1行のまま", () => {
    expect(splitThemeLabel("県政")).toEqual({ head: "県政", tail: null });
  });

  it("全テーマが2行に割れ、各行は5文字以内に収まる", () => {
    for (const theme of TOP_THEMES) {
      const { head, tail } = splitThemeLabel(theme.label);
      expect(tail, theme.label).not.toBeNull();
      expect([...head].length, theme.label).toBeLessThanOrEqual(5);
      expect([...(tail ?? "")].length, theme.label).toBeLessThanOrEqual(5);
    }
  });
});
