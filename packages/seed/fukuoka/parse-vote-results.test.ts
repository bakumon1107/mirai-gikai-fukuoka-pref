import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseVoteResults, resolveBillStatus } from "./parse-vote-results";

function fixture(name: string): string {
  return readFileSync(join(__dirname, "__fixtures__", name), "utf-8");
}

describe("parseVoteResults", () => {
  describe("令和7年12月定例会（saiketsu-0712.html・単一レンジ）", () => {
    const result = parseVoteResults(fixture("saiketsu-0712.html"));

    it("可決宣言文を1件取得する", () => {
      expect(result.declarations).toHaveLength(1);
      expect(result.declarations[0].sentence).toContain(
        "第188号議案から第226号議案の39件"
      );
    });

    it("第188号から第226号までを可決扱いにする", () => {
      expect(result.approvedBillNumbers.size).toBe(39);
      expect(result.approvedBillNumbers.has(188)).toBe(true);
      expect(result.approvedBillNumbers.has(226)).toBe(true);
      expect(result.approvedBillNumbers.has(187)).toBe(false);
      expect(result.approvedBillNumbers.has(227)).toBe(false);
    });

    it("警告は出ない", () => {
      expect(result.warnings).toEqual([]);
    });
  });

  describe("令和7年2月定例会（saiketsu-0702.html・複数宣言文＋委員会提出）", () => {
    const result = parseVoteResults(fixture("saiketsu-0702.html"));

    it("可決宣言文を2件取得する（2月7日分と2月20日分）", () => {
      expect(result.declarations).toHaveLength(2);
    });

    it("2つの宣言文の議案番号を合算する", () => {
      // 2月7日: 第20号・第21号 ／ 2月20日: 第1〜19号・第22〜79号（77件）
      expect(result.approvedBillNumbers.size).toBe(79);
      expect(result.approvedBillNumbers.has(20)).toBe(true);
      expect(result.approvedBillNumbers.has(21)).toBe(true);
      expect(result.approvedBillNumbers.has(1)).toBe(true);
      expect(result.approvedBillNumbers.has(79)).toBe(true);
      expect(result.approvedBillNumbers.has(80)).toBe(false);
    });

    it("委員会提出議案を別番号体系として取得する", () => {
      expect([...result.approvedMemberBillNumbers].sort((a, b) => a - b)).toEqual(
        [2, 3]
      );
    });

    it("諮問に関する文は議案として拾わない", () => {
      // 「また、諮問1件は、審査請求を棄却する旨答申することに決定しました。」
      const mentionsShimon = result.declarations.some((d) =>
        d.sentence.includes("諮問")
      );
      expect(mentionsShimon).toBe(false);
    });

    it("警告は出ない", () => {
      expect(result.warnings).toEqual([]);
    });
  });

  it("可決宣言が無いHTMLでは警告を返す", () => {
    const result = parseVoteResults(
      '<div id="main"><p>本会議は開会されました。</p></div>'
    );

    expect(result.declarations).toEqual([]);
    expect(result.warnings).toContain("可決を宣言する文が見つかりませんでした");
  });

  it("件数が合わない宣言文は採用せず警告に残す", () => {
    // 188〜226 は39件だが、宣言を40件に改変したケース
    const result = parseVoteResults(
      '<div id="main"><p>第188号議案から第226号議案の40件については、いずれも原案のとおり可決されました。</p></div>'
    );

    expect(result.declarations).toEqual([]);
    expect(result.approvedBillNumbers.size).toBe(0);
    expect(result.warnings.some((w) => w.includes("件数が一致しません"))).toBe(
      true
    );
  });
});

describe("resolveBillStatus", () => {
  const voteResults = parseVoteResults(fixture("saiketsu-0712.html"));

  it("可決レンジ内なら approved にし status_note に宣言文の原文を入れる", () => {
    const resolved = resolveBillStatus(200, "bill", voteResults);

    expect(resolved.status).toBe("approved");
    expect(resolved.statusNote).toContain("第188号議案から第226号議案の39件");
  });

  it("レンジ外は rejected と断定せず submitted に留める", () => {
    const resolved = resolveBillStatus(999, "bill", voteResults);

    expect(resolved.status).toBe("submitted");
    expect(resolved.statusNote).toBe("採決結果ページに記載なし（要確認）");
  });

  it("採決結果ページが無い会期は submitted にし理由を残す", () => {
    // 令和7年5月臨時会は saiketsu-0705.html が404
    const resolved = resolveBillStatus(81, "bill", null);

    expect(resolved.status).toBe("submitted");
    expect(resolved.statusNote).toBe("採決結果ページ未掲載");
  });

  it("番号体系を混同しない（知事提出の番号で議員提出を可決扱いにしない）", () => {
    const results = parseVoteResults(fixture("saiketsu-0702.html"));

    // 第2号は知事提出でも委員会提出でも可決レンジに存在する
    expect(resolveBillStatus(2, "bill", results).status).toBe("approved");
    expect(resolveBillStatus(2, "member_bill", results).status).toBe("approved");

    // 第79号は知事提出のみ。議員提出側では可決扱いにならない
    expect(resolveBillStatus(79, "bill", results).status).toBe("approved");
    expect(resolveBillStatus(79, "member_bill", results).status).toBe(
      "submitted"
    );
  });
});
