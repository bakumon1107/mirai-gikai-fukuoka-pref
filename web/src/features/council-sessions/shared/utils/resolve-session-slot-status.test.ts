import { describe, expect, it } from "vitest";
import type { CouncilSession } from "../types";
import {
  isRegularSession,
  resolveSessionSlots,
} from "./resolve-session-slot-status";

const makeSession = (
  overrides: Partial<CouncilSession> & { name: string; start_date: string }
): CouncilSession => ({
  id: `id-${overrides.start_date}`,
  slug: null,
  council_url: null,
  end_date: null,
  is_active: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

/** 令和8年の実データ（設計書 5.5.1 節の表） */
const r8 = {
  feb: makeSession({
    name: "令和8年2月定例会",
    start_date: "2026-02-20",
    end_date: "2026-03-24",
  }),
  jun: makeSession({
    name: "令和8年6月定例会",
    start_date: "2026-06-08",
    end_date: "2026-06-25",
  }),
  augExtra: makeSession({
    name: "令和8年8月臨時会",
    start_date: "2026-08-17",
    end_date: "2026-08-17",
  }),
  sep: makeSession({
    name: "令和8年9月定例会",
    start_date: "2026-09-09",
    end_date: "2026-10-16",
  }),
};

describe("isRegularSession", () => {
  it("定例会を残す", () => {
    expect(isRegularSession(r8.feb)).toBe(true);
  });

  it("臨時会を除外する", () => {
    expect(isRegularSession(r8.augExtra)).toBe(false);
  });
});

describe("resolveSessionSlots", () => {
  it("常に2月・6月・9月・12月の4枠を返す", () => {
    const slots = resolveSessionSlots([], "2026-09-24");
    expect(slots.map((s) => s.month)).toEqual([2, 6, 9, 12]);
  });

  it("臨時会を枠に混入させない", () => {
    const slots = resolveSessionSlots(
      [r8.feb, r8.jun, r8.augExtra, r8.sep],
      "2026-09-24"
    );
    const names = slots.map((s) => s.session?.name ?? null);
    expect(names).not.toContain("令和8年8月臨時会");
    expect(names).toEqual([
      "令和8年2月定例会",
      "令和8年6月定例会",
      "令和8年9月定例会",
      null,
    ]);
  });

  it("会期中は開会中の回だけを強調し「つぎはここ」を出さない", () => {
    // 2026-09-24 は令和8年9月定例会（9/9〜10/16）の会期中
    const slots = resolveSessionSlots(
      [r8.feb, r8.jun, r8.augExtra, r8.sep],
      "2026-09-24"
    );
    expect(slots.map((s) => s.status)).toEqual([
      "finished",
      "finished",
      "in_session",
      "upcoming",
    ]);
    expect(slots.filter((s) => s.status === "next")).toHaveLength(0);
  });

  it("閉会中は次に開会する回だけが「つぎはここ」になる", () => {
    // 2026-07-01 は6月定例会の閉会後、9月定例会の開会前
    const slots = resolveSessionSlots(
      [r8.feb, r8.jun, r8.augExtra, r8.sep],
      "2026-07-01"
    );
    expect(slots.map((s) => s.status)).toEqual([
      "finished",
      "finished",
      "next",
      "upcoming",
    ]);
  });

  it("強調枠は常に1つ以下になる", () => {
    for (const today of [
      "2026-01-05",
      "2026-02-20",
      "2026-03-24",
      "2026-05-01",
      "2026-06-25",
      "2026-09-09",
      "2026-10-16",
      "2026-12-01",
    ]) {
      const slots = resolveSessionSlots(
        [r8.feb, r8.jun, r8.augExtra, r8.sep],
        today
      );
      const highlighted = slots.filter(
        (s) => s.status === "in_session" || s.status === "next"
      );
      expect(highlighted.length, `today=${today}`).toBeLessThanOrEqual(1);
    }
  });

  it("開会日・閉会日の当日は会期中として扱う", () => {
    const onOpen = resolveSessionSlots([r8.sep], "2026-09-09");
    expect(onOpen[2].status).toBe("in_session");

    const onClose = resolveSessionSlots([r8.sep], "2026-10-16");
    expect(onClose[2].status).toBe("in_session");

    const afterClose = resolveSessionSlots([r8.sep], "2026-10-17");
    expect(afterClose[2].status).toBe("finished");
  });

  it("日程が未掲載の回は session が null のまま「これから」になる", () => {
    // 令和8年12月定例会は公式に日程未掲載（設計書 5.5.1 節）
    const slots = resolveSessionSlots([r8.feb, r8.jun, r8.sep], "2026-09-24");
    const december = slots[3];
    expect(december.session).toBeNull();
    expect(december.status).toBe("upcoming");
  });

  it("end_date が無い会期は、開会済みなら会期中とみなす", () => {
    const openEnded = makeSession({
      name: "令和8年9月定例会",
      start_date: "2026-09-09",
      end_date: null,
    });
    const slots = resolveSessionSlots([openEnded], "2026-09-24");
    expect(slots[2].status).toBe("in_session");
  });

  it("end_date が無い過去の会期は、次の会期が始まったら会期中にしない", () => {
    // 閉会日を取り損ねた古い会期が永久に「会期中」になると、
    // 強調枠が2つ並んでどちらが「いま」か分からなくなる
    const slots = resolveSessionSlots(
      [
        makeSession({
          name: "令和8年2月定例会",
          start_date: "2026-02-20",
          end_date: null,
        }),
        r8.sep,
      ],
      "2026-09-24"
    );
    expect(slots[0].status).not.toBe("in_session");
    expect(slots[2].status).toBe("in_session");
    expect(
      slots.filter((s) => s.status === "in_session" || s.status === "next")
    ).toHaveLength(1);
  });

  it("end_date が無い会期が複数あっても強調は1つに収まる", () => {
    const slots = resolveSessionSlots(
      [
        makeSession({
          name: "令和8年2月定例会",
          start_date: "2026-02-20",
          end_date: null,
        }),
        makeSession({
          name: "令和8年6月定例会",
          start_date: "2026-06-08",
          end_date: null,
        }),
        makeSession({
          name: "令和8年9月定例会",
          start_date: "2026-09-09",
          end_date: null,
        }),
      ],
      "2026-09-24"
    );
    expect(slots.map((s) => s.status)).toEqual([
      "finished",
      "finished",
      "in_session",
      "upcoming",
    ]);
  });

  it("各枠に固定の説明文が付く", () => {
    const slots = resolveSessionSlots([], "2026-09-24");
    expect(slots[0].description).toBe("新しい年度の予算を決める");
    expect(slots.every((s) => s.description.length > 0)).toBe(true);
  });
});
