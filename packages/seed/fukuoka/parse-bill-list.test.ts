import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractDeclaredBillCount,
  parseBillList,
  warekiToYear,
} from "./parse-bill-list";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "__fixtures__", name), "utf-8");
}

describe("warekiToYear", () => {
  it("令和を西暦へ変換する", () => {
    expect(warekiToYear("令和", 8)).toBe(2026);
    expect(warekiToYear("令和", 1)).toBe(2019);
  });

  it("平成を西暦へ変換する", () => {
    expect(warekiToYear("平成", 31)).toBe(2019);
  });

  it("未対応の元号は例外を投げる", () => {
    expect(() => warekiToYear("昭和", 60)).toThrow(/未対応の元号/);
  });
});

describe("parseBillList", () => {
  describe("令和8年9月定例会（gian-0809.html）", () => {
    const result = parseBillList(fixture("gian-0809.html"));

    it("会期名を見出しから取得する", () => {
      expect(result.sessionName).toBe("令和8年9月定例会");
    });

    it("知事提出議案を第122号から連番で取得する", () => {
      const govBills = result.bills.filter((b) => b.billType === "bill");
      expect(govBills[0].billNumber).toBe("第122号");
      expect(govBills[0].name).toBe("令和8年度福岡県一般会計補正予算（第3号）");
    });

    it("提出日見出しが複数ある場合、直近の見出しを各議案へ適用する", () => {
      const b122 = result.bills.find((b) => b.billNumber === "第122号");
      const b158 = result.bills.find((b) => b.billNumber === "第158号");

      // 当初提出（9月9日）と追加提出（9月17日）が同一ページに並ぶ
      expect(b122?.submittedDate).toBe("2026-09-09");
      expect(b158?.submittedDate).toBe("2026-09-17");
    });

    it("件名中の半角山括弧をタグと誤認せず保持する", () => {
      // 実ページの件名に `<第2号>` がエスケープされずに含まれている。
      // 素朴な /<[^>]+>/ でタグ除去すると `<第2号>` が消え、
      // 改行へ置換した場合は直後の `）` が次行へ落ちて件名が切れる。
      const b131 = result.bills.find((b) => b.billNumber === "第131号");
      expect(b131?.name).toBe(
        "専決処分について（令和8年度福岡県一般会計補正予算<第2号>）"
      );
    });

    it("議員提出議案を別番号体系として bill_type = member_bill で取得する", () => {
      const memberBills = result.bills.filter(
        (b) => b.billType === "member_bill"
      );
      expect(memberBills).toHaveLength(1);
      expect(memberBills[0].billNumber).toBe("第3号");
      expect(memberBills[0].name).toContain(
        "地方自治法第100条の2の規定に基づく専門的知見の活用"
      );
    });

    it("知事提出の「第3号」が存在しないことで番号衝突が起きないのを確認する", () => {
      // このページの知事提出は第122号以降なので衝突しないが、
      // bill_type をキーに含めているため仮に衝突しても分離される
      const conflicting = result.bills.filter((b) => b.billNumber === "第3号");
      expect(conflicting).toHaveLength(1);
      expect(conflicting[0].billType).toBe("member_bill");
    });

    it("件名が空の議案を拾わない", () => {
      expect(result.bills.every((b) => b.name.length > 0)).toBe(true);
    });

    it("当初提出議案が知事議案説明要旨の件数と一致する", () => {
      const declared = extractDeclaredBillCount(fixture("chiji-0809.html"));
      const initial = result.bills.filter(
        (b) => b.billType === "bill" && b.submittedDate === "2026-09-09"
      );

      expect(declared).toBe(36);
      expect(initial).toHaveLength(36);
      expect(initial[0].billNumber).toBe("第122号");
      expect(initial.at(-1)?.billNumber).toBe("第157号");
    });
  });

  describe("令和7年5月臨時会（gian-0705.html・提出日見出しなし）", () => {
    const result = parseBillList(fixture("gian-0705.html"));

    it("会期名に臨時会を含めて取得する", () => {
      expect(result.sessionName).toBe("令和7年5月臨時会");
    });

    it("提出日見出しが無い場合 submittedDate は null になる", () => {
      expect(result.bills.length).toBeGreaterThan(0);
      expect(result.bills.every((b) => b.submittedDate === null)).toBe(true);
    });

    it("議案4件を取得する", () => {
      expect(result.bills).toHaveLength(4);
      expect(result.bills.map((b) => b.billNumber)).toEqual([
        "第81号",
        "第82号",
        "第83号",
        "第84号",
      ]);
    });

    it("括弧を含む件名をそのまま取得する", () => {
      const b82 = result.bills.find((b) => b.billNumber === "第82号");
      expect(b82?.name).toBe(
        "専決処分について（令和7年度福岡県一般会計暫定補正予算＜第1号＞）"
      );
    });
  });
});

describe("extractDeclaredBillCount", () => {
  it("知事議案説明要旨から議案件数を取得する", () => {
    expect(extractDeclaredBillCount(fixture("chiji-0809.html"))).toBe(36);
  });

  it("件数の記載が無いページでは null を返す", () => {
    expect(extractDeclaredBillCount(fixture("gian-0705.html"))).toBeNull();
  });
});
