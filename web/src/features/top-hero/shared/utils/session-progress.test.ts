import { describe, expect, it } from "vitest";
import {
  buildInSessionLead,
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

describe("buildInSessionLead", () => {
  it("会期名から「いまは◯月定例会。」を作る", () => {
    expect(buildInSessionLead("令和8年 9月定例会")).toBe("いまは9月定例会。");
  });

  it("臨時会を「定例会」と言い換えない", () => {
    expect(buildInSessionLead("令和8年 8月臨時会")).toBe("いまは8月臨時会。");
  });

  it("種別が取れない会期名では文ごと出さない", () => {
    expect(buildInSessionLead("会期")).toBeNull();
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
