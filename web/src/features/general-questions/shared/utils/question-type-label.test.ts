import { describe, expect, it } from "vitest";
import { questionMetaLabel, questionTypeLabel } from "./question-type-label";

describe("questionTypeLabel", () => {
  it("representative は代表質問", () => {
    expect(questionTypeLabel("representative")).toBe("代表質問");
  });

  it("general は一般質問", () => {
    expect(questionTypeLabel("general")).toBe("一般質問");
  });

  it("null や未知の値は一般質問として扱う", () => {
    expect(questionTypeLabel(null)).toBe("一般質問");
    expect(questionTypeLabel("unknown")).toBe("一般質問");
  });
});

describe("questionMetaLabel", () => {
  it("種別・日・順番を中黒でつなぐ", () => {
    expect(questionMetaLabel("representative", 5, 1)).toBe(
      "代表質問・第5日・1番目"
    );
    expect(questionMetaLabel("general", 10, 6)).toBe("一般質問・第10日・6番目");
  });
});
