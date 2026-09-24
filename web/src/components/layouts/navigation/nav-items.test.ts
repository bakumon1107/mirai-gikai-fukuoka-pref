import { describe, expect, it } from "vitest";
import { MOBILE_NAV_ITEMS, PC_NAV_ITEMS, isNavItemActive } from "./nav-items";

describe("isNavItemActive", () => {
  it("ホームは完全一致のときだけ現在地になる", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/", "/committees")).toBe(false);
    expect(isNavItemActive("/", "/budget/r8-6")).toBe(false);
  });

  it("配下のページも現在地として扱う", () => {
    expect(isNavItemActive("/committees", "/committees")).toBe(true);
    expect(isNavItemActive("/committees", "/committees/nourin")).toBe(true);
    expect(isNavItemActive("/committees", "/committees/nourin/123")).toBe(true);
  });

  it("前方一致だけで誤判定しない", () => {
    // /budget が /budgets や /budget-foo を拾わないこと
    expect(isNavItemActive("/budget", "/budgets")).toBe(false);
    expect(isNavItemActive("/budget", "/budget-overview")).toBe(false);
  });

  it("別の項目を現在地にしない", () => {
    expect(isNavItemActive("/sessions", "/committees")).toBe(false);
    expect(isNavItemActive("/questions", "/press-conferences")).toBe(false);
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
      "/sessions/r8-9/bills",
      "/press-conferences",
      "/press-conferences/2026-09-02",
      "/budget",
      "/budget/r8-6",
      "/search",
      "/faq",
    ];
    for (const path of paths) {
      for (const items of [PC_NAV_ITEMS, MOBILE_NAV_ITEMS]) {
        const active = items.filter((i) => isNavItemActive(i.href, path));
        expect(active.length, `${path}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("ラベルはピルに収まる短さにする", () => {
    for (const item of PC_NAV_ITEMS) {
      expect([...item.label].length, item.label).toBeLessThanOrEqual(5);
    }
  });
});
