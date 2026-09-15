import { describe, expect, it } from "vitest";
import { formatContactorName, formatPolicyReviewPhrase } from "./party-text";

describe("formatPolicyReviewPhrase", () => {
  it("政党名が設定されている場合はデフォルトの助詞「の」で連結する", () => {
    expect(formatPolicyReviewPhrase("チームみらい")).toBe(
      "チームみらいの政策検討"
    );
  });

  it("助詞「での」を指定できる", () => {
    expect(formatPolicyReviewPhrase("チームみらい", "での")).toBe(
      "チームみらいでの政策検討"
    );
  });

  it("助詞「における」を指定できる", () => {
    expect(formatPolicyReviewPhrase("チームみらい", "における")).toBe(
      "チームみらいにおける政策検討"
    );
  });

  it("政党名が空文字列の場合は政党名を省いた汎用表現を返す", () => {
    expect(formatPolicyReviewPhrase("")).toBe("政策検討");
  });

  it("政党名が空文字列なら助詞を指定しても汎用表現を返す", () => {
    expect(formatPolicyReviewPhrase("", "における")).toBe("政策検討");
  });
});

describe("formatContactorName", () => {
  it("政党名が設定されている場合は政党名を優先する", () => {
    expect(formatContactorName("チームみらい", "バクモン")).toBe(
      "チームみらい"
    );
  });

  it("政党名が空文字列の場合は運営者名を返す", () => {
    expect(formatContactorName("", "バクモン")).toBe("バクモン");
  });

  it("どちらも空文字列の場合は「運営者」にフォールバックする", () => {
    expect(formatContactorName("", "")).toBe("運営者");
  });
});
