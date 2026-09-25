import { describe, expect, it } from "vitest";
import {
  formatConferenceHeading,
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
