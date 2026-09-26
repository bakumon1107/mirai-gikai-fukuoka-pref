import { describe, expect, it } from "vitest";
import { parseSessionMilestones } from "./parse-session-milestones";

// 令和8年9月定例会の実日程
const R8_9 = {
  representativeQuestions: { from: "2026-09-15", to: "2026-09-17" },
  generalQuestions: { from: "2026-09-18", to: "2026-09-25" },
  standingCommittees: { from: "2026-09-28", to: "2026-09-30" },
  billVote: "2026-10-01",
};

describe("parseSessionMilestones", () => {
  it("実データの形をそのまま読める", () => {
    expect(parseSessionMilestones(R8_9)).toEqual(R8_9);
  });

  it("採決日だけでも読める（臨時会など質問が無い会期）", () => {
    const result = parseSessionMilestones({ billVote: "2025-05-16" });

    expect(result?.billVote).toBe("2025-05-16");
    expect(result?.representativeQuestions).toBeNull();
  });

  it("null / undefined は null", () => {
    expect(parseSessionMilestones(null)).toBeNull();
    expect(parseSessionMilestones(undefined)).toBeNull();
  });

  it("配列や文字列など想定外の形は null", () => {
    expect(parseSessionMilestones([])).toBeNull();
    expect(parseSessionMilestones("2026-09-09")).toBeNull();
    expect(parseSessionMilestones(42)).toBeNull();
  });

  it("全項目が読めなければ null（空オブジェクト）", () => {
    expect(parseSessionMilestones({})).toBeNull();
  });

  it("日付の形になっていない値は捨てる", () => {
    const result = parseSessionMilestones({
      billVote: "10月1日",
      generalQuestions: R8_9.generalQuestions,
    });

    expect(result?.billVote).toBeNull();
    expect(result?.generalQuestions).toEqual(R8_9.generalQuestions);
  });

  it("from か to が欠けた範囲は捨てる", () => {
    const result = parseSessionMilestones({
      generalQuestions: { from: "2026-09-18" },
      billVote: "2026-10-01",
    });

    expect(result?.generalQuestions).toBeNull();
    expect(result?.billVote).toBe("2026-10-01");
  });

  it("from が to より後の範囲は壊れた値として捨てる", () => {
    const result = parseSessionMilestones({
      generalQuestions: { from: "2026-09-25", to: "2026-09-18" },
      billVote: "2026-10-01",
    });

    expect(result?.generalQuestions).toBeNull();
  });

  it("from と to が同じ1日の範囲は通す", () => {
    const result = parseSessionMilestones({
      standingCommittees: { from: "2025-05-16", to: "2025-05-16" },
    });

    expect(result?.standingCommittees).toEqual({
      from: "2025-05-16",
      to: "2025-05-16",
    });
  });

  it("知らないキーが混ざっていても落ちない", () => {
    const result = parseSessionMilestones({ ...R8_9, unknownKey: "x" });

    expect(result?.billVote).toBe("2026-10-01");
  });
});
