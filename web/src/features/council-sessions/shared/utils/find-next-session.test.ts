import { describe, expect, it } from "vitest";
import type { CouncilSession } from "../types";
import { findNextRegularSession } from "./find-next-session";

const makeSession = (
  overrides: Partial<CouncilSession> & { name: string; start_date: string }
): CouncilSession => ({
  id: `id-${overrides.start_date}`,
  slug: null,
  council_url: null,
  end_date: null,
  is_active: false,
  schedule_milestones: null,
  created_at: "",
  updated_at: "",
  ...overrides,
});

/** 本番の実データ相当（設計書 5.5.1 節） */
const sessions = [
  makeSession({
    name: "令和8年 6月定例会",
    start_date: "2026-06-08",
    end_date: "2026-06-25",
  }),
  makeSession({
    name: "令和8年 8月臨時会",
    start_date: "2026-08-17",
    end_date: "2026-08-17",
  }),
  makeSession({
    name: "令和8年 9月定例会",
    start_date: "2026-09-09",
    end_date: "2026-10-16",
  }),
];

describe("findNextRegularSession", () => {
  it("次に開会する定例会を返す", () => {
    const next = findNextRegularSession(sessions, "2026-07-01");
    expect(next?.name).toBe("令和8年 9月定例会");
  });

  it("臨時会は拾わない", () => {
    // 8月臨時会のほうが日付は近いが、ピルの文言が「定例会」なので拾わない
    const next = findNextRegularSession(sessions, "2026-07-01");
    expect(next?.name).not.toBe("令和8年 8月臨時会");
  });

  it("開会当日は「次」に含めない（もう始まっている）", () => {
    const next = findNextRegularSession(sessions, "2026-09-09");
    expect(next).toBeNull();
  });

  it("先の会期が無ければ null", () => {
    expect(findNextRegularSession(sessions, "2026-12-31")).toBeNull();
    expect(findNextRegularSession([], "2026-07-01")).toBeNull();
  });

  it("順不同で渡しても最も早いものを選ぶ", () => {
    const shuffled = [sessions[2], sessions[0], sessions[1]];
    const next = findNextRegularSession(shuffled, "2026-01-01");
    expect(next?.name).toBe("令和8年 6月定例会");
  });
});
