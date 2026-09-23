import { describe, expect, it } from "vitest";
import { expandBillNumberRange } from "./expand-bill-number-range";

describe("expandBillNumberRange", () => {
  // 以下のケースはすべて実際の採決結果ページ（saiketsu-*.html）の文面。
  // 設計書 docs/20260922_1650_議案スクレイプ設計.md §4.3 の表と対応する。

  it("単一レンジを展開し件数表記と一致する（令和7年12月定例会）", () => {
    const result = expandBillNumberRange(
      "令和7年12月19日、第188号議案から第226号議案の39件については、いずれも原案のとおり可決または同意されました。"
    );

    expect(result.bill).toHaveLength(39);
    expect(result.bill[0]).toBe(188);
    expect(result.bill.at(-1)).toBe(226);
    expect(result.memberBill).toEqual([]);
  });

  it("カンマ区切りの単独表現を展開する（令和7年2月定例会・2月7日分）", () => {
    const result = expandBillNumberRange(
      "令和7年2月7日、第20号議案、第21号議案については、いずれも原案のとおり可決されました。"
    );

    expect(result.bill).toEqual([20, 21]);
    expect(result.memberBill).toEqual([]);
  });

  it("複数レンジと委員会提出議案が混在する文を分離する（令和7年2月定例会・2月20日分）", () => {
    const result = expandBillNumberRange(
      "令和7年2月20日、第1号議案から第19号議案、第22号議案から第79号議案の77件及び委員会提出議案第2号議案、第3号議案の2件については、いずれも原案のとおり可決または同意されました。"
    );

    // 1〜19（19件）＋22〜79（58件）＝77件
    expect(result.bill).toHaveLength(77);
    expect(result.bill).toContain(1);
    expect(result.bill).toContain(19);
    expect(result.bill).toContain(22);
    expect(result.bill).toContain(79);
    // レンジの隙間（20・21）は2月7日分で別に採決されているため含まない
    expect(result.bill).not.toContain(20);
    expect(result.bill).not.toContain(21);

    expect(result.memberBill).toEqual([2, 3]);
  });

  it("レンジと委員会提出が混在し件数表記が無い文を展開する（令和元年6月定例会）", () => {
    const result = expandBillNumberRange(
      "令和元年7月12日、第67号議案から第109号議案、委員会提出第1号議案については、いずれも原案のとおり可決・承認または同意されました。"
    );

    expect(result.bill).toHaveLength(43);
    expect(result.bill[0]).toBe(67);
    expect(result.bill.at(-1)).toBe(109);
    expect(result.memberBill).toEqual([1]);
  });

  it("議員提出議案のみの文を memberBill 側へ振り分ける（令和8年9月定例会）", () => {
    const result = expandBillNumberRange(
      "令和8年9月17日、議員提出第3号議案については、原案のとおり可決されました。"
    );

    expect(result.bill).toEqual([]);
    expect(result.memberBill).toEqual([3]);
  });

  it("知事提出議案1件のみの文を展開する（令和8年9月定例会）", () => {
    const result = expandBillNumberRange(
      "令和8年9月18日、第158号議案については、原案のとおり可決されました。"
    );

    expect(result.bill).toEqual([158]);
    expect(result.memberBill).toEqual([]);
  });

  it("レンジの端点を単独表現として二重に拾わない", () => {
    const result = expandBillNumberRange("第10号議案から第12号議案の3件");

    expect(result.bill).toEqual([10, 11, 12]);
  });

  it("議案番号を含まない文では空配列を返す", () => {
    const result = expandBillNumberRange(
      "また、諮問1件は、審査請求を棄却する旨答申することに決定しました。"
    );

    expect(result.bill).toEqual([]);
    expect(result.memberBill).toEqual([]);
  });

  describe("件数の検算", () => {
    it("件数表記と展開結果が一致しなければ例外を投げる", () => {
      // 188〜226 は実際には39件。宣言を40件に改変したケース。
      expect(() =>
        expandBillNumberRange("第188号議案から第226号議案の40件については、")
      ).toThrow(/件数が一致しません/);
    });

    it("例外メッセージに宣言件数と展開件数の両方を含む", () => {
      expect(() =>
        expandBillNumberRange("第1号議案から第5号議案の99件については、")
      ).toThrow(/宣言99件 \/ 展開5件/);
    });

    it("件数表記が無い文では検算をスキップする", () => {
      expect(() =>
        expandBillNumberRange("第1号議案から第5号議案については、")
      ).not.toThrow();
    });
  });

  it("レンジが逆順なら例外を投げる", () => {
    expect(() =>
      expandBillNumberRange("第226号議案から第188号議案については、")
    ).toThrow(/レンジが逆順/);
  });
});
