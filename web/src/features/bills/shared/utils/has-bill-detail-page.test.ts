import { describe, expect, it } from "vitest";
import { hasBillDetailPage } from "./has-bill-detail-page";

describe("hasBillDetailPage", () => {
  it("published はリンクを張る", () => {
    expect(hasBillDetailPage("published")).toBe(true);
  });

  it("coming_soon はリンクを張らない（詳細ページが404になる）", () => {
    expect(hasBillDetailPage("coming_soon")).toBe(false);
  });

  it("draft もリンクを張らない", () => {
    expect(hasBillDetailPage("draft")).toBe(false);
  });
});
