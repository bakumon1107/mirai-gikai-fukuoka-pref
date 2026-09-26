import { describe, expect, it } from "vitest";
import {
  hasAnyMilestone,
  mergeSessionMilestones,
} from "./merge-session-milestones";
import type { SessionMilestones } from "./parse-session-schedule";

const EMPTY: SessionMilestones = {
  representativeQuestions: null,
  generalQuestions: null,
  standingCommittees: null,
  billVote: null,
};

// 令和8年9月定例会の実日程
const FULL: SessionMilestones = {
  representativeQuestions: { from: "2026-09-15", to: "2026-09-17" },
  generalQuestions: { from: "2026-09-18", to: "2026-09-25" },
  standingCommittees: { from: "2026-09-28", to: "2026-09-30" },
  billVote: "2026-10-01",
};

describe("mergeSessionMilestones", () => {
  it("新しく取れた値で更新する", () => {
    expect(mergeSessionMilestones(null, FULL)).toEqual(FULL);
  });

  it("全項目が null の結果で既存値を消さない", () => {
    // 日程ページは取れたが中身が空、というケース。
    // 「取れた」と扱うと一度入った正しい節目を全部失う
    expect(mergeSessionMilestones(FULL, EMPTY)).toEqual(FULL);
  });

  it("取れなかった項目だけ既存値を残す", () => {
    const partial: SessionMilestones = {
      ...EMPTY,
      billVote: "2026-10-02",
    };

    const merged = mergeSessionMilestones(FULL, partial);

    // 取れた項目は更新
    expect(merged?.billVote).toBe("2026-10-02");
    // 取れなかった項目は既存のまま
    expect(merged?.representativeQuestions).toEqual(
      FULL.representativeQuestions
    );
    expect(merged?.standingCommittees).toEqual(FULL.standingCommittees);
  });

  it("スクレイプ結果が null なら既存値をそのまま返す", () => {
    expect(mergeSessionMilestones(FULL, null)).toEqual(FULL);
  });

  it("既存も新規も無ければ null", () => {
    expect(mergeSessionMilestones(null, null)).toBeNull();
  });

  it("既存が空で新規も空なら null（空オブジェクトを書かない）", () => {
    expect(mergeSessionMilestones(EMPTY, EMPTY)).toBeNull();
  });

  it("会期が進んで節目が増えるケースを積み上げられる", () => {
    // 開会直後は採決日が未掲載、あとから載る
    const early: SessionMilestones = {
      representativeQuestions: { from: "2026-09-15", to: "2026-09-17" },
      generalQuestions: null,
      standingCommittees: null,
      billVote: null,
    };
    const later: SessionMilestones = {
      representativeQuestions: { from: "2026-09-15", to: "2026-09-17" },
      generalQuestions: { from: "2026-09-18", to: "2026-09-25" },
      standingCommittees: null,
      billVote: "2026-10-01",
    };

    const merged = mergeSessionMilestones(early, later);

    expect(merged?.generalQuestions).toEqual(later.generalQuestions);
    expect(merged?.billVote).toBe("2026-10-01");
    expect(merged?.representativeQuestions).toEqual(
      early.representativeQuestions
    );
  });
});

describe("hasAnyMilestone", () => {
  it("1項目でも値があれば true", () => {
    expect(hasAnyMilestone({ ...EMPTY, billVote: "2026-10-01" })).toBe(true);
  });

  it("全部 null なら false", () => {
    expect(hasAnyMilestone(EMPTY)).toBe(false);
  });
});
