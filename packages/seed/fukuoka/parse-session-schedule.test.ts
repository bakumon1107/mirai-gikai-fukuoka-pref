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

describe("parseSessionSchedule の節目抽出", () => {
  it("令和8年9月定例会の節目を実日程どおりに取る", () => {
    const { milestones } = parseSessionSchedule(
      fixture("gikainittei-0809.html")
    );

    expect(milestones.representativeQuestions).toEqual({
      from: "2026-09-15",
      to: "2026-09-17",
    });
    expect(milestones.generalQuestions).toEqual({
      from: "2026-09-18",
      to: "2026-09-25",
    });
    expect(milestones.standingCommittees).toEqual({
      from: "2026-09-28",
      to: "2026-09-30",
    });
    expect(milestones.billVote).toBe("2026-10-01");
  });

  it("採決日と閉会日が別の日である会期を取り違えない", () => {
    // 令和8年9月定例会は採決 10/1 のあと決算特別委員会が続き 10/16 に閉会する。
    // 「閉会日＝採決日」と決め打ちすると、議案がいつ決まったかを誤って伝える
    const result = parseSessionSchedule(fixture("gikainittei-0809.html"));

    expect(result.milestones.billVote).toBe("2026-10-01");
    expect(result.endDate).toBe("2026-10-16");
    expect(result.milestones.billVote).not.toBe(result.endDate);
  });

  it("採決日と閉会日が同じ日の会期も扱える", () => {
    // 令和7年12月定例会は 12/19 に採決と閉会を同日で行う
    const result = parseSessionSchedule(fixture("gikainittei-0712.html"));

    expect(result.milestones.billVote).toBe("2025-12-19");
    expect(result.endDate).toBe("2025-12-19");
  });

  it("令和7年12月定例会の質問日程を取る", () => {
    const { milestones } = parseSessionSchedule(
      fixture("gikainittei-0712.html")
    );

    expect(milestones.representativeQuestions).toEqual({
      from: "2025-12-05",
      to: "2025-12-08",
    });
    expect(milestones.generalQuestions).toEqual({
      from: "2025-12-10",
      to: "2025-12-12",
    });
  });

  it("質問を行わない臨時会では質問の節目が null になる", () => {
    const { milestones } = parseSessionSchedule(
      fixture("gikainittei-0705.html")
    );

    expect(milestones.representativeQuestions).toBeNull();
    expect(milestones.generalQuestions).toBeNull();
    expect(milestones.billVote).toBe("2025-05-16");
  });

  it("ページ下部のナビにある「代表質問」リンクを日程として数えない", () => {
    // 表の下に「日程｜提出議案｜…｜代表質問｜一般質問」というナビが並ぶ。
    // 打ち切らないと最終日（閉会日）の議事日程として数えられ、
    // 質問の範囲が閉会日まで伸びる
    const { milestones, endDate } = parseSessionSchedule(
      fixture("gikainittei-0809.html")
    );

    expect(endDate).toBe("2026-10-16");
    expect(milestones.representativeQuestions?.to).not.toBe(endDate);
    expect(milestones.generalQuestions?.to).not.toBe(endDate);
  });

  it("「決算関係議案報告上程」を議案採決と取り違えない", () => {
    // 部分一致で判定すると 9/17 の「決算関係議案報告上程」が
    // 議案採決に、「決算特別委員長報告・採決」が採決に引っかかる
    const { milestones } = parseSessionSchedule(
      fixture("gikainittei-0809.html")
    );

    expect(milestones.billVote).not.toBe("2026-09-17");
  });

  it("年が取れないページでは節目が空になる", () => {
    const result = parseSessionSchedule("<div id=\"main\"><p>不明</p></div>");

    expect(result.milestones.representativeQuestions).toBeNull();
    expect(result.milestones.billVote).toBeNull();
  });

  it("議案採決が無ければ warning を出す", () => {
    const html = `<div id="main">
      <p>令和8年9月第18回定例会会期日程</p>
      <p>9月9日(水曜日)</p><p>開会</p>
    </div>`;

    const result = parseSessionSchedule(html);

    expect(result.warnings).toContain("日程表に「議案採決」の記載がありません");
  });
});
