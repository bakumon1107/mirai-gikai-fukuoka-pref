import { describe, expect, it } from "vitest";
import type { CouncilSession } from "../types";
import {
  formatSessionPeriod,
  groupSessionsByYear,
} from "./group-sessions-by-year";

const makeSession = (
  overrides: Partial<CouncilSession> & { start_date: string }
): CouncilSession => ({
  id: "id-1",
  name: "第1回定例会",
  slug: "session-1",
  council_url: null,
  end_date: null,
  is_active: false,
  schedule_milestones: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("groupSessionsByYear", () => {
  it("年別にグループ化し新しい順に返す", () => {
    const sessions: CouncilSession[] = [
      makeSession({ id: "1", start_date: "2025-09-01" }),
      makeSession({ id: "2", start_date: "2026-02-01" }),
      makeSession({ id: "3", start_date: "2025-12-01" }),
    ];

    const result = groupSessionsByYear(sessions);

    expect(result).toHaveLength(2);
    expect(result[0].year).toBe(2026);
    expect(result[1].year).toBe(2025);
    expect(result[1].sessions).toHaveLength(2);
  });

  it("空配列のとき空を返す", () => {
    expect(groupSessionsByYear([])).toEqual([]);
  });
});

describe("formatSessionPeriod", () => {
  it("開始・終了が異なる月の場合 'YYYY.M〜M' を返す", () => {
    const session = makeSession({
      start_date: "2026-02-01",
      end_date: "2026-03-31",
    });
    expect(formatSessionPeriod(session)).toBe("2026.2〜3");
  });

  it("開始・終了が同じ月の場合 'YYYY.M' を返す", () => {
    const session = makeSession({
      start_date: "2025-12-01",
      end_date: "2025-12-20",
    });
    expect(formatSessionPeriod(session)).toBe("2025.12");
  });

  it("end_dateがない場合 'YYYY.M' を返す", () => {
    const session = makeSession({ start_date: "2025-09-01", end_date: null });
    expect(formatSessionPeriod(session)).toBe("2025.9");
  });
});
