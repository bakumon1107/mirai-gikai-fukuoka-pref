import { describe, expect, it } from "vitest";
import type { BillPublishStatus, BillStatusEnum } from "../types";
import {
  type BillStatusEntry,
  buildBillSummaryHeadline,
  buildComingSoonNote,
  summarizeBillStatuses,
} from "./summarize-bill-statuses";

const repeat = (
  status: BillStatusEnum,
  publishStatus: BillPublishStatus,
  n: number
): BillStatusEntry[] =>
  Array.from({ length: n }, () => ({ status, publishStatus }));

describe("summarizeBillStatuses", () => {
  it("空配列は total 0 でチップなし", () => {
    const summary = summarizeBillStatuses([]);
    expect(summary.total).toBe(0);
    expect(summary.chips).toEqual([]);
    expect(summary.isUniform).toBe(false);
  });

  it("審議中の3ステータスを「議会審議中」1つに畳んで合算する", () => {
    const summary = summarizeBillStatuses([
      ...repeat("submitted", "published", 30),
      ...repeat("in_committee", "published", 20),
      ...repeat("plenary_session", "published", 6),
    ]);
    expect(summary.chips).toEqual([{ label: "議会審議中", count: 56 }]);
    expect(summary.total).toBe(56);
    expect(summary.isUniform).toBe(true);
  });

  it("令和8年9月定例会の実データ相当（審議中56・可決2）を集計できる", () => {
    const summary = summarizeBillStatuses([
      ...repeat("submitted", "published", 56),
      ...repeat("approved", "published", 2),
    ]);
    expect(summary.total).toBe(58);
    expect(summary.chips).toEqual([
      { label: "議会審議中", count: 56 },
      { label: "可決", count: 2 },
    ]);
  });

  it("deliberatingCount は審議中の3ステータスだけを数える", () => {
    const summary = summarizeBillStatuses([
      ...repeat("submitted", "published", 30),
      ...repeat("in_committee", "published", 20),
      ...repeat("plenary_session", "published", 6),
      ...repeat("approved", "published", 40),
      ...repeat("rejected", "published", 2),
      ...repeat("reported", "published", 1),
    ]);
    expect(summary.deliberatingCount).toBe(56);
    expect(summary.total).toBe(99);
  });

  it("件数の多い順に並べる", () => {
    const summary = summarizeBillStatuses([
      ...repeat("approved", "published", 2),
      ...repeat("rejected", "published", 5),
    ]);
    expect(summary.chips.map((c) => c.label)).toEqual(["否決", "可決"]);
  });

  it("coming_soon も件数に含める（中身が紙でまだスキャンされていない議案）", () => {
    const summary = summarizeBillStatuses([
      ...repeat("submitted", "coming_soon", 40),
      ...repeat("submitted", "published", 10),
    ]);
    expect(summary.total).toBe(50);
    expect(summary.publishedCount).toBe(10);
    expect(summary.comingSoonCount).toBe(40);
  });

  it("全件が掲載待ちでも件数は出る", () => {
    const summary = summarizeBillStatuses(
      repeat("submitted", "coming_soon", 57)
    );
    expect(summary.total).toBe(57);
    expect(summary.publishedCount).toBe(0);
    expect(summary.comingSoonCount).toBe(57);
  });
});

describe("buildBillSummaryHeadline", () => {
  it("件数0なら見出しを出さない", () => {
    expect(
      buildBillSummaryHeadline(summarizeBillStatuses([]), false)
    ).toBeNull();
  });

  it("会期中は、可決済みを除いた審議中の件数を出す", () => {
    const summary = summarizeBillStatuses([
      ...repeat("submitted", "published", 56),
      ...repeat("approved", "published", 2),
    ]);
    // 総数58ではなく審議中の56。可決済み2件を「審議中」と言わない
    expect(buildBillSummaryHeadline(summary, true)).toBe("いま56件を審議中");
  });

  it("会期中でも全件可決済みなら「審議中」と言わない", () => {
    const summary = summarizeBillStatuses(repeat("approved", "published", 34));
    expect(buildBillSummaryHeadline(summary, true)).toBe(
      "この会期の議案はすべて可決"
    );
  });

  it("会期中で採決が済み混在していれば可決件数を出す", () => {
    const summary = summarizeBillStatuses([
      ...repeat("approved", "published", 80),
      ...repeat("rejected", "published", 7),
    ]);
    expect(buildBillSummaryHeadline(summary, true)).toBe("87件中80件が可決");
  });

  it("会期中は「前回」と呼ばない", () => {
    const summary = summarizeBillStatuses([
      ...repeat("rejected", "published", 3),
      ...repeat("reported", "published", 1),
    ]);
    expect(buildBillSummaryHeadline(summary, true)).toBe("この会期の議案は4件");
  });

  it("上程前の議案は審議中に数えない", () => {
    const summary = summarizeBillStatuses([
      ...repeat("draft" as BillStatusEnum, "coming_soon", 12),
    ]);
    expect(summary.deliberatingCount).toBe(0);
    expect(buildBillSummaryHeadline(summary, true)).toBe(
      "この会期の議案はすべて議案上程前"
    );
  });

  it("会期序盤で全件が掲載待ちでも、会期中の見出しが出る", () => {
    const summary = summarizeBillStatuses(
      repeat("submitted", "coming_soon", 57)
    );
    expect(buildBillSummaryHeadline(summary, true)).toBe("いま57件を審議中");
  });

  it("閉会後で全件同一なら「すべて◯◯」", () => {
    const summary = summarizeBillStatuses(repeat("approved", "published", 34));
    expect(buildBillSummaryHeadline(summary, false)).toBe(
      "前回の議案はすべて可決"
    );
  });

  it("閉会後で混在なら可決件数を出す", () => {
    const summary = summarizeBillStatuses([
      ...repeat("approved", "published", 80),
      ...repeat("rejected", "published", 7),
    ]);
    expect(buildBillSummaryHeadline(summary, false)).toBe("87件中80件が可決");
  });

  it("閉会後で混在かつ可決が無い場合も文言が壊れない", () => {
    const summary = summarizeBillStatuses([
      ...repeat("rejected", "published", 3),
      ...repeat("reported", "published", 1),
    ]);
    expect(buildBillSummaryHeadline(summary, false)).toBe("前回の議案は4件");
  });
});

describe("buildComingSoonNote", () => {
  it("全件掲載済みなら補足を出さない", () => {
    const summary = summarizeBillStatuses(repeat("approved", "published", 34));
    expect(buildComingSoonNote(summary)).toBeNull();
  });

  it("全件が掲載待ちなら準備中である旨を出す", () => {
    const summary = summarizeBillStatuses(
      repeat("submitted", "coming_soon", 57)
    );
    expect(buildComingSoonNote(summary)).toBe(
      "内容は準備でき次第、順次掲載します"
    );
  });

  it("一部だけ掲載済みなら読める件数を出す", () => {
    const summary = summarizeBillStatuses([
      ...repeat("submitted", "published", 12),
      ...repeat("submitted", "coming_soon", 45),
    ]);
    expect(buildComingSoonNote(summary)).toBe(
      "うち12件の内容を掲載中（残りは順次掲載します）"
    );
  });
});
