import { describe, expect, it } from "vitest";
import {
  buildInSessionHeadline,
  buildSessionSteps,
  calcSessionProgress,
  formatSessionRange,
  formatStepDate,
} from "./session-progress";

// 令和8年9月定例会の実日程（設計書 5.3.3 節）
const R8_9_START = "2026-09-09";
const R8_9_END = "2026-10-16";

describe("calcSessionProgress", () => {
  it("設計書の例（9/9〜10/16、9/24時点）が16日目／全38日になる", () => {
    const progress = calcSessionProgress(R8_9_START, R8_9_END, "2026-09-24");
    expect(progress).not.toBeNull();
    expect(progress?.dayNumber).toBe(16);
    expect(progress?.totalDays).toBe(38);
  });

  it("開会日は1日目（両端を含めて数える）", () => {
    expect(
      calcSessionProgress(R8_9_START, R8_9_END, R8_9_START)?.dayNumber
    ).toBe(1);
  });

  it("閉会日は最終日と一致する", () => {
    const progress = calcSessionProgress(R8_9_START, R8_9_END, R8_9_END);
    expect(progress?.dayNumber).toBe(38);
    expect(progress?.totalDays).toBe(38);
    expect(progress?.percent).toBe(100);
  });

  it("1日だけの会期でも 1日目／全1日 になる", () => {
    const progress = calcSessionProgress(
      "2026-08-03",
      "2026-08-03",
      "2026-08-03"
    );
    expect(progress?.dayNumber).toBe(1);
    expect(progress?.totalDays).toBe(1);
  });

  it("会期前の日付は1日目に丸める（バーが負にならない）", () => {
    expect(
      calcSessionProgress(R8_9_START, R8_9_END, "2026-09-01")?.dayNumber
    ).toBe(1);
  });

  it("会期後の日付は最終日に丸める（バーがはみ出さない）", () => {
    const progress = calcSessionProgress(R8_9_START, R8_9_END, "2026-12-01");
    expect(progress?.dayNumber).toBe(38);
    expect(progress?.percent).toBe(100);
  });

  it("閉会日が無ければ null（全日数が決まらないため）", () => {
    expect(calcSessionProgress(R8_9_START, null, "2026-09-24")).toBeNull();
  });

  it("閉会日が開会日より前なら null", () => {
    expect(
      calcSessionProgress("2026-10-16", "2026-09-09", "2026-09-24")
    ).toBeNull();
  });

  it("月をまたいでも日数がずれない", () => {
    // 9/9 から 10/1 は 23日間（9月は30日）
    expect(
      calcSessionProgress(R8_9_START, R8_9_END, "2026-10-01")?.dayNumber
    ).toBe(23);
  });

  it("年をまたぐ会期でも数えられる", () => {
    const progress = calcSessionProgress(
      "2026-12-01",
      "2027-01-10",
      "2027-01-05"
    );
    expect(progress?.totalDays).toBe(41);
    expect(progress?.dayNumber).toBe(36);
  });
});

describe("formatStepDate", () => {
  it("ゼロ埋めを外して和文にする", () => {
    expect(formatStepDate("2026-09-09")).toBe("9月9日");
    expect(formatStepDate("2026-10-16")).toBe("10月16日");
  });

  it("想定外の形式はそのまま返す", () => {
    expect(formatStepDate("不明")).toBe("不明");
  });
});

describe("buildSessionSteps", () => {
  it("開会・閉会の2行を返す（中間ステップは日程表が無いので出さない）", () => {
    const steps = buildSessionSteps(R8_9_START, R8_9_END, "2026-09-24");
    expect(steps).toHaveLength(2);
    expect(steps[0].label).toBe("開会・議案の説明");
    expect(steps[1].label).toBe("閉会");
  });

  it("閉会の行に「採決」を含めない（採決日と閉会日は別の日）", () => {
    const steps = buildSessionSteps(R8_9_START, R8_9_END, "2026-09-24");
    expect(steps[1].label).not.toContain("採決");
  });

  it("会期中は開会が done、閉会が upcoming", () => {
    const steps = buildSessionSteps(R8_9_START, R8_9_END, "2026-09-24");
    expect(steps[0].status).toBe("done");
    expect(steps[1].status).toBe("upcoming");
  });

  it("開会当日は開会が current", () => {
    const steps = buildSessionSteps(R8_9_START, R8_9_END, R8_9_START);
    expect(steps[0].status).toBe("current");
  });

  it("閉会日以降は閉会も done", () => {
    const steps = buildSessionSteps(R8_9_START, R8_9_END, R8_9_END);
    expect(steps[1].status).toBe("done");
  });

  it("閉会日が無ければ開会の1行だけ", () => {
    const steps = buildSessionSteps(R8_9_START, null, "2026-09-24");
    expect(steps).toHaveLength(1);
    expect(steps[0].label).toBe("開会・議案の説明");
  });
});

// 令和8年9月定例会の実日程（パーサーの抽出結果と同じ）
const R8_9_MILESTONES = {
  representativeQuestions: { from: "2026-09-15", to: "2026-09-17" },
  generalQuestions: { from: "2026-09-18", to: "2026-09-25" },
  standingCommittees: { from: "2026-09-28", to: "2026-09-30" },
  billVote: "2026-10-01",
};

describe("buildSessionSteps（節目あり）", () => {
  it("採決日と閉会日が別の日なら、行を分ける", () => {
    const steps = buildSessionSteps(
      R8_9_START,
      R8_9_END,
      "2026-09-24",
      R8_9_MILESTONES
    );

    const labels = steps.map((s) => s.label);
    expect(labels).toEqual([
      "開会・議案の説明",
      "代表質問・一般質問",
      "委員会でくわしく審査",
      "議案の採決",
      "閉会",
    ]);

    // 採決は 10/1、閉会は 10/16。混ぜると議案がいつ決まったかを誤って伝える
    expect(steps[3].date).toBe("10月1日");
    expect(steps[4].date).toBe("10月16日");
  });

  it("採決日と閉会日が同じ日なら1行に畳む", () => {
    // 令和7年12月定例会は 12/19 に採決と閉会を同日で行う
    const steps = buildSessionSteps("2025-12-01", "2025-12-19", "2025-12-10", {
      representativeQuestions: { from: "2025-12-05", to: "2025-12-08" },
      generalQuestions: { from: "2025-12-10", to: "2025-12-12" },
      standingCommittees: { from: "2025-12-15", to: "2025-12-17" },
      billVote: "2025-12-19",
    });

    const labels = steps.map((s) => s.label);
    expect(labels).toContain("議案の採決・閉会");
    expect(labels).not.toContain("議案の採決");
    expect(labels.filter((l) => l.includes("閉会"))).toHaveLength(1);
  });

  it("質問期間は代表質問と一般質問をまとめて1行にする", () => {
    const steps = buildSessionSteps(
      R8_9_START,
      R8_9_END,
      "2026-09-24",
      R8_9_MILESTONES
    );
    const q = steps.find((s) => s.label === "代表質問・一般質問");

    // 9/15（代表質問の開始）〜 9/25（一般質問の終了）
    expect(q?.date).toBe("9月15日〜25日");
  });

  it("月をまたぐ期間は月を省略しない", () => {
    const steps = buildSessionSteps("2026-09-09", "2026-10-16", "2026-09-24", {
      ...R8_9_MILESTONES,
      standingCommittees: { from: "2026-09-28", to: "2026-10-02" },
    });
    const c = steps.find((s) => s.label === "委員会でくわしく審査");

    expect(c?.date).toBe("9月28日〜10月2日");
  });

  it("進行中の段階が current、過ぎた段階が done になる", () => {
    // 9/24 は一般質問の期間内（9/18〜9/25）
    const steps = buildSessionSteps(
      R8_9_START,
      R8_9_END,
      "2026-09-24",
      R8_9_MILESTONES
    );

    expect(steps.find((s) => s.label === "開会・議案の説明")?.status).toBe(
      "done"
    );
    expect(steps.find((s) => s.label === "代表質問・一般質問")?.status).toBe(
      "current"
    );
    expect(steps.find((s) => s.label === "委員会でくわしく審査")?.status).toBe(
      "upcoming"
    );
    expect(steps.find((s) => s.label === "議案の採決")?.status).toBe(
      "upcoming"
    );
  });

  it("current は常に1つ以下", () => {
    for (const day of [
      "2026-09-09",
      "2026-09-16",
      "2026-09-24",
      "2026-09-29",
      "2026-10-01",
      "2026-10-16",
    ]) {
      const steps = buildSessionSteps(
        R8_9_START,
        R8_9_END,
        day,
        R8_9_MILESTONES
      );
      const current = steps.filter((s) => s.status === "current");
      expect(
        current.length,
        `${day} で current が ${current.length} 件`
      ).toBeLessThanOrEqual(1);
    }
  });

  it("取れていない節目の行は出さない", () => {
    const steps = buildSessionSteps(R8_9_START, R8_9_END, "2026-09-24", {
      representativeQuestions: null,
      generalQuestions: null,
      standingCommittees: null,
      billVote: "2026-10-01",
    });

    expect(steps.map((s) => s.label)).toEqual([
      "開会・議案の説明",
      "議案の採決",
      "閉会",
    ]);
  });

  it("節目が null なら開会・閉会の2行に退化する", () => {
    const steps = buildSessionSteps(R8_9_START, R8_9_END, "2026-09-24", null);

    expect(steps.map((s) => s.label)).toEqual(["開会・議案の説明", "閉会"]);
  });

  it("臨時会のように1日で終わる会期も壊れない", () => {
    const steps = buildSessionSteps("2025-05-16", "2025-05-16", "2025-05-16", {
      representativeQuestions: null,
      generalQuestions: null,
      standingCommittees: { from: "2025-05-16", to: "2025-05-16" },
      billVote: "2025-05-16",
    });

    expect(steps.map((s) => s.label)).toEqual([
      "開会・議案の説明",
      "委員会でくわしく審査",
      "議案の採決・閉会",
    ]);
  });
});

describe("buildInSessionHeadline", () => {
  it("会期名から「◯月定例会」を取って見出しにする", () => {
    expect(buildInSessionHeadline("令和8年 9月定例会")).toBe(
      "9月定例会、いま何を決めてる？"
    );
  });

  it("臨時会を「定例会」と言い換えない", () => {
    expect(buildInSessionHeadline("令和8年 8月臨時会")).toBe(
      "8月臨時会、いま何を決めてる？"
    );
  });

  it("種別が取れない会期名でも文言が壊れない", () => {
    expect(buildInSessionHeadline("会期")).toBe("いま何を決めてる？");
  });
});

describe("formatSessionRange", () => {
  it("開会日〜閉会日を並べる", () => {
    expect(formatSessionRange(R8_9_START, R8_9_END)).toBe("9月9日〜10月16日");
  });

  it("閉会日が無ければ「◯月◯日から」", () => {
    expect(formatSessionRange(R8_9_START, null)).toBe("9月9日から");
  });
});
