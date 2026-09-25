import { describe, expect, it } from "vitest";
import {
  MOBILE_NAV_ITEMS,
  type NavItem,
  PC_NAV_ITEMS,
  isNavItemActive,
} from "./nav-items";

const item = (href: string, extra: Partial<NavItem> = {}): NavItem => ({
  href,
  label: href,
  ...extra,
});

/** ラベルで項目を引く（テストの意図を読みやすくするため） */
const pc = (label: string): NavItem => {
  const found = PC_NAV_ITEMS.find((i) => i.label === label);
  if (!found) throw new Error(`PCナビに「${label}」がありません`);
  return found;
};

describe("isNavItemActive", () => {
  it("ホームは完全一致のときだけ現在地になる", () => {
    expect(isNavItemActive(item("/"), "/")).toBe(true);
    expect(isNavItemActive(item("/"), "/committees")).toBe(false);
    expect(isNavItemActive(item("/"), "/budget/r8-6")).toBe(false);
  });

  it("配下のページも現在地として扱う", () => {
    expect(isNavItemActive(item("/committees"), "/committees")).toBe(true);
    expect(isNavItemActive(item("/committees"), "/committees/nourin")).toBe(
      true
    );
    expect(isNavItemActive(item("/committees"), "/committees/nourin/123")).toBe(
      true
    );
  });

  it("前方一致だけで誤判定しない", () => {
    expect(isNavItemActive(item("/budget"), "/budgets")).toBe(false);
    expect(isNavItemActive(item("/budget"), "/budget-overview")).toBe(false);
  });

  it("別の項目を現在地にしない", () => {
    expect(isNavItemActive(item("/sessions"), "/committees")).toBe(false);
    expect(isNavItemActive(item("/questions"), "/press-conferences")).toBe(
      false
    );
  });

  it("alsoActiveOn にマッチすれば現在地になる", () => {
    const withAlso = item("/questions", { alsoActiveOn: /^\/foo\// });
    expect(isNavItemActive(withAlso, "/foo/bar")).toBe(true);
  });

  it("excludes にマッチすれば前方一致でも現在地にしない", () => {
    const withExcludes = item("/sessions", { excludes: /^\/sessions\/x\// });
    expect(isNavItemActive(withExcludes, "/sessions/x/y")).toBe(false);
    expect(isNavItemActive(withExcludes, "/sessions/z/y")).toBe(true);
  });
});

describe("リダイレクト先での現在地（回帰）", () => {
  // /questions は最新会期の /sessions/[slug]/questions へリダイレクトされる。
  // 素朴な前方一致だと着地後に「議案」が点灯してしまっていた
  const landed = "/sessions/r8-9/questions";

  it("質問ページに着地したら「質問」が現在地になる", () => {
    expect(isNavItemActive(pc("質問"), landed)).toBe(true);
  });

  it("質問ページで「議案」は現在地にならない", () => {
    expect(isNavItemActive(pc("議案"), landed)).toBe(false);
  });

  it("議案ページでは「議案」が現在地のまま", () => {
    expect(isNavItemActive(pc("議案"), "/sessions/r8-9/bills")).toBe(true);
    expect(isNavItemActive(pc("議案"), "/sessions")).toBe(true);
  });

  it("スマホは質問も議案も「定例会」に畳む（設計どおり）", () => {
    const teireikai = MOBILE_NAV_ITEMS.find((i) => i.label === "定例会");
    if (!teireikai) throw new Error("定例会がありません");
    expect(isNavItemActive(teireikai, landed)).toBe(true);
    expect(isNavItemActive(teireikai, "/sessions/r8-9/bills")).toBe(true);
  });
});

describe("ナビ項目の定義", () => {
  it("PCは6項目", () => {
    expect(PC_NAV_ITEMS).toHaveLength(6);
  });

  it("スマホは5枠（ボトムナビの等分レイアウトの前提）", () => {
    expect(MOBILE_NAV_ITEMS).toHaveLength(5);
  });

  it("リンク先が重複しない", () => {
    for (const items of [PC_NAV_ITEMS, MOBILE_NAV_ITEMS]) {
      const hrefs = items.map((i) => i.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  it("どのパスでも現在地は1つ以下になる", () => {
    const paths = [
      "/",
      "/questions",
      "/committees",
      "/committees/nourin/1",
      "/sessions",
      "/sessions/r8-9",
      "/sessions/r8-9/bills",
      "/sessions/r8-9/questions",
      "/press-conferences",
      "/press-conferences/2026-09-02",
      "/budget",
      "/budget/r8-6",
      "/search",
      "/faq",
      "/jimu-jigyo",
    ];
    for (const path of paths) {
      for (const items of [PC_NAV_ITEMS, MOBILE_NAV_ITEMS]) {
        const active = items.filter((i) => isNavItemActive(i, path));
        expect(active.length, `${path}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("ラベルはピルに収まる短さにする", () => {
    for (const navItem of PC_NAV_ITEMS) {
      expect([...navItem.label].length, navItem.label).toBeLessThanOrEqual(5);
    }
  });
});
