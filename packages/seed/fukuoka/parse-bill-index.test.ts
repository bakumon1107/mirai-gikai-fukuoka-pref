import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseSessionIndex,
  parseYearIndex,
  sessionNameKey,
  toDbSessionName,
} from "./parse-bill-index";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "__fixtures__", name), "utf-8");
}

describe("parseYearIndex", () => {
  const entries = parseYearIndex(fixture("list43.html"));

  it("令和元年から令和8年までの8年分を取得する", () => {
    expect(entries).toHaveLength(8);
  });

  it("ラベルから「（提出議案件名）」だけを落とし改元の注記は残す", () => {
    expect(entries.map((e) => e.label)).toEqual([
      "令和8年",
      "令和7年",
      "令和6年",
      "令和5年",
      "令和4年",
      "令和3年",
      "令和2年",
      "令和元年（平成31年）",
    ]);
  });

  it("ページ名と絶対URLを組み立てる", () => {
    const r8 = entries.find((e) => e.label === "令和8年");
    expect(r8?.page).toBe("list43-216");
    expect(r8?.url).toBe(
      "https://www.gikai.pref.fukuoka.lg.jp/site/honkaigi/list43-216.html"
    );
  });

  it("令和7年の索引ページを特定できる", () => {
    const r7 = entries.find((e) => e.label === "令和7年");
    expect(r7?.page).toBe("list43-205");
  });
});

describe("parseSessionIndex", () => {
  describe("令和8年（list43-216.html）", () => {
    const entries = parseSessionIndex(fixture("list43-216.html"));

    it("4会期を取得する", () => {
      expect(entries.map((e) => e.sessionName)).toEqual([
        "令和8年9月定例会",
        "令和8年8月臨時会",
        "令和8年6月定例会",
        "令和8年2月定例会",
      ]);
    });

    it("臨時会も定例会と同じく取得する", () => {
      const rinji = entries.find((e) => e.sessionName === "令和8年8月臨時会");
      expect(rinji?.sessionKey).toBe("0808");
    });

    it("会期キーから関連ページのURLを組み立てる", () => {
      const r89 = entries.find((e) => e.sessionName === "令和8年9月定例会");

      expect(r89).toMatchObject({
        sessionKey: "0809",
        billListUrl:
          "https://www.gikai.pref.fukuoka.lg.jp/site/honkaigi/gian-0809.html",
        voteResultUrl:
          "https://www.gikai.pref.fukuoka.lg.jp/site/honkaigi/saiketsu-0809.html",
        scheduleUrl:
          "https://www.gikai.pref.fukuoka.lg.jp/site/honkaigi/gikainittei-0809.html",
        menuUrl:
          "https://www.gikai.pref.fukuoka.lg.jp/site/honkaigi/menu-0809.html",
      });
    });
  });

  describe("令和7年（list43-205.html）", () => {
    const entries = parseSessionIndex(fixture("list43-205.html"));

    it("定例会4件と臨時会2件の計6会期をページ掲載順（新しい順）で取得する", () => {
      expect(entries).toHaveLength(6);
      expect(entries.map((e) => e.sessionKey)).toEqual([
        "0712",
        "0709",
        "0706",
        "0705",
        "0704",
        "0702",
      ]);
    });

    it("採決結果ページが存在しない会期もURLは組み立てる（実在確認は取得側の責務）", () => {
      // saiketsu-0705.html は404だが、索引段階では判定しない
      const r705 = entries.find((e) => e.sessionKey === "0705");
      expect(r705?.sessionName).toBe("令和7年5月臨時会");
      expect(r705?.voteResultUrl).toContain("saiketsu-0705.html");
    });
  });

  it("会期リンクが無いHTMLでは空配列を返す", () => {
    expect(parseSessionIndex("<html><body>なし</body></html>")).toEqual([]);
  });
});

describe("toDbSessionName", () => {
  it("年のあとに半角スペースを入れてDB表記に合わせる", () => {
    // council_sessions の既存4件はすべて「令和8年 6月定例会」形式
    expect(toDbSessionName("令和8年6月定例会")).toBe("令和8年 6月定例会");
    expect(toDbSessionName("令和7年12月定例会")).toBe("令和7年 12月定例会");
  });

  it("臨時会も同じ規則で変換する", () => {
    expect(toDbSessionName("令和8年8月臨時会")).toBe("令和8年 8月臨時会");
  });

  it("既にスペースがある表記は二重に入れない", () => {
    expect(toDbSessionName("令和8年 6月定例会")).toBe("令和8年 6月定例会");
  });
});

describe("sessionNameKey", () => {
  it("サイト表記とDB表記が同じキーに正規化される", () => {
    expect(sessionNameKey("令和8年6月定例会")).toBe(
      sessionNameKey("令和8年 6月定例会")
    );
  });

  it("全角スペースも落とす", () => {
    expect(sessionNameKey("令和8年　6月定例会")).toBe("令和8年6月定例会");
  });
});
