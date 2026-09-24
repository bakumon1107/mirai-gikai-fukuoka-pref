import { describe, expect, it } from "vitest";
import type { BillStatusEnum } from "../types";
import {
  buildBillSummaryHeadline,
  summarizeBillStatuses,
} from "./summarize-bill-statuses";

const repeat = (status: BillStatusEnum, n: number): BillStatusEnum[] =>
  Array.from({ length: n }, () => status);

describe("summarizeBillStatuses", () => {
  it("空配列は total 0 でチップなし", () => {
    const summary = summarizeBillStatuses([]);
    expect(summary.total).toBe(0);
    expect(summary.chips).toEqual([]);
    expect(summary.isUniform).toBe(false);
  });

  it("審議中の3ステータスを「議会審議中」1つに畳んで合算する", () => {
    const summary = summarizeBillStatuses([
      ...repeat("submitted", 30),
      ...repeat("in_committee", 20),
      ...repeat("plenary_session", 6),
    ]);
    expect(summary.chips).toEqual([{ label: "議会審議中", count: 56 }]);
    expect(summary.total).toBe(56);
    expect(summary.isUniform).toBe(true);
  });

  it("令和8年9月定例会の実データ相当（審議中56・可決2）を集計できる", () => {
    const summary = summarizeBillStatuses([
      ...repeat("submitted", 56),
      ...repeat("approved", 2),
    ]);
    expect(summary.total).toBe(58);
    expect(summary.chips).toEqual([
      { label: "議会審議中", count: 56 },
      { label: "可決", count: 2 },
    ]);
    expect(summary.isUniform).toBe(false);
  });

  it("件数の多い順に並べる", () => {
    const summary = summarizeBillStatuses([
      ...repeat("approved", 2),
      ...repeat("rejected", 5),
    ]);
    expect(summary.chips.map((c) => c.label)).toEqual(["否決", "可決"]);
  });

  it("全件可決なら isUniform が true", () => {
    const summary = summarizeBillStatuses(repeat("approved", 34));
    expect(summary.chips).toEqual([{ label: "可決", count: 34 }]);
    expect(summary.isUniform).toBe(true);
  });
});

describe("buildBillSummaryHeadline", () => {
  it("件数0なら見出しを出さない", () => {
    expect(
      buildBillSummaryHeadline(summarizeBillStatuses([]), false)
    ).toBeNull();
  });

  it("会期中は審議中の件数を出す", () => {
    const summary = summarizeBillStatuses([
      ...repeat("submitted", 56),
      ...repeat("approved", 2),
    ]);
    expect(buildBillSummaryHeadline(summary, true)).toBe("いま58件を審議中");
  });

  it("閉会後で全件同一なら「すべて◯◯」", () => {
    const summary = summarizeBillStatuses(repeat("approved", 34));
    expect(buildBillSummaryHeadline(summary, false)).toBe(
      "前回の議案はすべて可決"
    );
  });

  it("閉会後で混在なら可決件数を出す", () => {
    const summary = summarizeBillStatuses([
      ...repeat("approved", 80),
      ...repeat("rejected", 7),
    ]);
    expect(buildBillSummaryHeadline(summary, false)).toBe("87件中80件が可決");
  });

  it("閉会後で混在かつ可決が無い場合も文言が壊れない", () => {
    const summary = summarizeBillStatuses([
      ...repeat("rejected", 3),
      ...repeat("reported", 1),
    ]);
    expect(buildBillSummaryHeadline(summary, false)).toBe("前回の議案は4件");
  });
});
