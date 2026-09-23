import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSessionSchedule } from "./parse-session-schedule";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "__fixtures__", name), "utf-8");
}

describe("parseSessionSchedule", () => {
  it("令和8年9月定例会の開会日と閉会日を取得する", () => {
    const result = parseSessionSchedule(fixture("gikainittei-0809.html"));

    // 9月9日開会・10月16日閉会（月をまたぐ会期）
    expect(result.startDate).toBe("2026-09-09");
    expect(result.endDate).toBe("2026-10-16");
    expect(result.warnings).toEqual([]);
  });

  it("令和7年12月定例会がDB登録値と一致する", () => {
    const result = parseSessionSchedule(fixture("gikainittei-0712.html"));

    // council_sessions の r7-12 は start=2025-12-01 / end=2025-12-19
    expect(result.startDate).toBe("2025-12-01");
    expect(result.endDate).toBe("2025-12-19");
    expect(result.warnings).toEqual([]);
  });

  it("臨時会の見出し表記でも年を取得する", () => {
    // 見出しが「令和7年5月第11回福岡県議会臨時会会期日程」で
    // 定例会と異なり「福岡県議会」が挟まる
    const result = parseSessionSchedule(fixture("gikainittei-0705.html"));

    expect(result.startDate).toBe("2025-05-16");
    expect(result.endDate).toBe("2025-05-16");
    expect(result.warnings).toEqual([]);
  });

  it("見出しが無いHTMLでは警告を返す", () => {
    const result = parseSessionSchedule(
      '<div id="main"><p>日程は未定です。</p></div>'
    );

    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
    expect(result.warnings).toContain(
      "会期日程の見出しから年を取得できませんでした"
    );
  });

  it("「閉会」の記載が無ければ会期中として警告する", () => {
    const html = `<div id="main">
      <p>令和8年9月第18回定例会会期日程</p>
      <p>9月9日(水曜日)</p><p>本会議</p><p>開会</p>
      <p>9月10日(木曜日)</p><p>考案日</p>
    </div>`;

    const result = parseSessionSchedule(html);

    expect(result.startDate).toBe("2026-09-09");
    expect(result.endDate).toBeNull();
    expect(result.warnings).toContain(
      "日程表に「閉会」の記載がありません（会期中の可能性）"
    );
  });

  it("「閉 会」のように空白が入っていても閉会日として扱う", () => {
    // 実ページの臨時会は「開 会」「閉 会」と全角空白入りで書かれている
    const html = `<div id="main">
      <p>令和7年5月第11回福岡県議会臨時会会期日程</p>
      <p>5月16日(金曜日)</p><p>開 会</p><p>閉 会</p>
    </div>`;

    const result = parseSessionSchedule(html);

    expect(result.endDate).toBe("2025-05-16");
  });

  it("月が戻る会期は翌年へ繰り上げる", () => {
    const html = `<div id="main">
      <p>令和7年12月第15回定例会会期日程</p>
      <p>12月1日(月曜日)</p><p>開会</p>
      <p>1月15日(木曜日)</p><p>閉会</p>
    </div>`;

    const result = parseSessionSchedule(html);

    expect(result.startDate).toBe("2025-12-01");
    expect(result.endDate).toBe("2026-01-15");
  });
});
