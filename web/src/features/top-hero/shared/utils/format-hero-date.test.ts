import { describe, expect, it } from "vitest";
import {
  extractSessionLabel,
  formatConferenceHeading,
  formatCurrentSessionPill,
  formatNextSessionPill,
  formatShortDate,
} from "./format-hero-date";

describe("formatConferenceHeading", () => {
  it("曜日つきで整形する", () => {
    expect(formatConferenceHeading("2026-09-02")).toBe("9月2日（水）の会見");
    expect(formatConferenceHeading("2026-08-21")).toBe("8月21日（金）の会見");
  });

  it("日時つきの文字列でも日付部分だけ見る", () => {
    expect(formatConferenceHeading("2026-09-02T10:00:00+09:00")).toBe(
      "9月2日（水）の会見"
    );
  });

  it("タイムゾーンに依存しない（UTC解釈で前日にずれない）", () => {
    // new Date("2026-01-01") は UTC 解釈になるため、素朴な実装だと
    // JST 以外の環境で 12月31日 になりうる
    expect(formatConferenceHeading("2026-01-01")).toBe("1月1日（木）の会見");
  });

  it("不正な日付はそのまま返す", () => {
    expect(formatConferenceHeading("invalid")).toBe("invalid");
    expect(formatConferenceHeading("")).toBe("");
  });
});

describe("formatShortDate", () => {
  it("月日だけを返す", () => {
    expect(formatShortDate("2026-08-21")).toBe("8月21日");
    expect(formatShortDate("2026-07-29")).toBe("7月29日");
  });

  it("ゼロ埋めしない", () => {
    expect(formatShortDate("2026-01-05")).toBe("1月5日");
  });

  it("不正な日付はそのまま返す", () => {
    expect(formatShortDate("invalid")).toBe("invalid");
  });
});

describe("formatNextSessionPill", () => {
  it("開会日から文言を組み立てる", () => {
    expect(formatNextSessionPill("2026-12-01")).toBe("次の定例会 12月1日から");
  });

  it("日付が無ければ null（ピルごと非表示にする）", () => {
    expect(formatNextSessionPill(null)).toBeNull();
    expect(formatNextSessionPill("")).toBeNull();
    expect(formatNextSessionPill("invalid")).toBeNull();
  });
});

describe("extractSessionLabel", () => {
  it("会期名から「◯月定例会」を取り出す", () => {
    expect(extractSessionLabel("令和8年 9月定例会")).toBe("9月定例会");
    expect(extractSessionLabel("令和7年 12月定例会")).toBe("12月定例会");
  });

  it("臨時会も種別ごと取り出す（定例会と言い換えない）", () => {
    expect(extractSessionLabel("令和8年 8月臨時会")).toBe("8月臨時会");
  });

  it("取り出せなければ null", () => {
    expect(extractSessionLabel("令和8年度予算")).toBeNull();
    expect(extractSessionLabel("")).toBeNull();
  });
});

describe("formatCurrentSessionPill", () => {
  it("PCは会期名つき、スマホは日付だけ", () => {
    const pill = formatCurrentSessionPill("令和8年 9月定例会", "2026-10-16");
    expect(pill).toEqual({
      full: "9月定例会 10月16日まで",
      short: "10月16日まで",
    });
  });

  it("臨時会でも「定例会」と言わない", () => {
    // 月から文言を組み立てると「8月定例会」になってしまう。
    // 会期名から取るので種別が保たれる
    const pill = formatCurrentSessionPill("令和8年 8月臨時会", "2026-08-17");
    expect(pill?.full).toBe("8月臨時会 8月17日まで");
  });

  it("閉会日が未定ならピルごと出さない", () => {
    expect(formatCurrentSessionPill("令和8年 9月定例会", null)).toBeNull();
    expect(formatCurrentSessionPill("令和8年 9月定例会", "invalid")).toBeNull();
  });

  it("会期名から種別を取れない場合は日付だけ出す", () => {
    const pill = formatCurrentSessionPill("臨時の会議", "2026-10-16");
    expect(pill).toEqual({
      full: "10月16日まで",
      short: "10月16日まで",
    });
  });
});
