import { describe, expect, it } from "vitest";
import {
  buildPlenaryFileName,
  buildPlenaryText,
  extractDocDate,
  extractSessionDay,
  extractVoiceTexts,
  formatJapaneseDate,
  stripDocNameSuffix,
} from "./parse-plenary-minutes";

describe("extractDocDate", () => {
  it("command__date から開催日を取り出す", () => {
    const html = `<div class="command__date">2026-06-12</div>`;
    expect(extractDocDate(html)).toBe("2026-06-12");
  });

  it("開催日が無ければ null", () => {
    expect(extractDocDate("<div>本文</div>")).toBeNull();
  });
});

describe("extractVoiceTexts", () => {
  it("話者ラベルを残したまま発言ブロックを抽出する", () => {
    const html = `
      <div data-voice_code="1"><p class="voice__text">◯議長（藏内　勇夫）　会議を開きます。<br />　代表質問を行います。<br />＊佐藤議員質問<br /><br /></p></div>
      <div data-voice_code="2"><p class="voice__text">◯十六番（佐藤　楓）登壇　おはようございます。<br />　まず初めに。</p></div>
    `;
    expect(extractVoiceTexts(html)).toEqual([
      "◯議長（藏内　勇夫）　会議を開きます。\n　代表質問を行います。\n＊佐藤議員質問",
      "◯十六番（佐藤　楓）登壇　おはようございます。\n　まず初めに。",
    ]);
  });

  it("空の発言ブロックは捨てる", () => {
    const html = `<div data-voice_code="9"><p class="voice__text"><br /></p></div>`;
    expect(extractVoiceTexts(html)).toEqual([]);
  });

  it("HTML実体参照をデコードする", () => {
    const html = `<div data-voice_code="1"><p class="voice__text">Ａ&amp;Ｂ</p></div>`;
    expect(extractVoiceTexts(html)).toEqual(["Ａ&Ｂ"]);
  });
});

describe("extractSessionDay", () => {
  it.each([
    ["令和８年６月定例会（第５日）　本文", 5],
    ["令和８年６月定例会（第10日）　本文", 10],
    ["令和８年６月定例会（第１２日）　本文", 12],
    ["令和７年12月定例会（第十一日）　本文", 11],
    ["令和７年12月定例会（第二十日）　本文", 20],
  ])("%s → %i", (docName, expected) => {
    expect(extractSessionDay(docName)).toBe(expected);
  });

  it("日数が無ければ null", () => {
    expect(extractSessionDay("令和８年　文教委員会　本文")).toBeNull();
  });

  it("漢数字と算用数字が混ざった表記は null（誤った日数を返さない）", () => {
    expect(extractSessionDay("令和８年６月定例会（第十1日）　本文")).toBeNull();
    expect(extractSessionDay("令和８年６月定例会（第1十日）　本文")).toBeNull();
  });

  it("全角と半角が混ざった算用数字は正規化して読む", () => {
    expect(extractSessionDay("令和８年６月定例会（第１0日）　本文")).toBe(10);
  });

  it("〇日のような0は null", () => {
    expect(extractSessionDay("令和８年６月定例会（第〇日）　本文")).toBeNull();
  });
});

describe("stripDocNameSuffix / buildPlenaryFileName", () => {
  it("末尾の「本文」を落とす", () => {
    expect(stripDocNameSuffix("令和８年６月定例会（第５日）　本文")).toBe(
      "令和８年６月定例会（第５日）"
    );
  });

  it("ファイル名は .txt を付ける", () => {
    expect(buildPlenaryFileName("令和８年６月定例会（第10日）　本文")).toBe(
      "令和８年６月定例会（第10日）.txt"
    );
  });
});

describe("formatJapaneseDate", () => {
  it("ゼロ埋めを外して和風表記にする", () => {
    expect(formatJapaneseDate("2026-06-08")).toBe("2026年6月8日");
  });

  it("不正な日付は例外", () => {
    expect(() => formatJapaneseDate("2026/06/08")).toThrow();
  });
});

describe("buildPlenaryText", () => {
  it("1行目に日付＋会議名、以降は空行区切りの発言", () => {
    const text = buildPlenaryText(
      "令和８年６月定例会（第５日）　本文",
      "2026-06-12",
      ["◯議長（藏内　勇夫）　会議を開きます。", "◯十六番（佐藤　楓）登壇　はい。"]
    );
    expect(text).toBe(
      "2026年6月12日：令和８年６月定例会（第５日）　本文\n\n" +
        "◯議長（藏内　勇夫）　会議を開きます。\n\n" +
        "◯十六番（佐藤　楓）登壇　はい。\n"
    );
  });
});
