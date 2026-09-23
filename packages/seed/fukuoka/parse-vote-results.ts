/**
 * parse-vote-results.ts
 *
 * 福岡県議会ホームページの採決結果ページ（saiketsu-*.html）をパースする純粋関数群。
 *
 * 採決結果は個別議案ごとの結果表ではなく、可決範囲を述べた宣言文で書かれている。
 * したがってここで得られるのは「可決レンジに入っているか否か」であり、
 * 個別の議決種別（可決／同意／承認）は判別できない。
 *
 * 詳細は docs/20260922_1650_議案スクレイプ設計.md §4.3 / §5.2 を参照。
 */

import {
  type ExpandedBillNumbers,
  expandBillNumberRange,
} from "./expand-bill-number-range";
import { htmlToLines } from "./parse-bill-list";
import type { ParsedBillType } from "./parse-bill-list";

/** 可決を宣言した一文とその展開結果 */
export type VoteDeclaration = {
  /** 宣言文の原文。bills.status_note へそのまま格納する */
  sentence: string;
  numbers: ExpandedBillNumbers;
};

export type ParseVoteResultsResult = {
  declarations: VoteDeclaration[];
  /** 可決扱いの知事提出議案番号（全宣言文の合算） */
  approvedBillNumbers: Set<number>;
  /** 可決扱いの議員・委員会提出議案番号（全宣言文の合算） */
  approvedMemberBillNumbers: Set<number>;
  warnings: string[];
};

/**
 * 可決扱いを宣言している文の判定。
 *
 * 語尾の揺れが大きい。実データで確認できた表現:
 *   …原案のとおり可決されました。
 *   …いずれも原案のとおり可決または同意されました。
 *   …いずれも原案のとおり可決・承認または同意されました。
 *   …原案のとおり同意されました。          ← 人事議案（副知事の選任等）
 *
 * **「可決」だけを条件にすると人事議案を取りこぼす。** 令和7年4月臨時会の
 * 第80号議案（副知事の選任）は「同意されました」のみで可決の語が無い。
 */
const POSITIVE_OUTCOME_RE = /(?:可決|同意|承認|認定|採択)[^。]*されました。?$/;

/**
 * 可決扱いにしてはいけない表現。
 *
 * `POSITIVE_OUTCOME_RE` の「採択」は「**不**採択」にも一致してしまうため、
 * 否定表現を別途弾く必要がある。
 */
const NEGATIVE_OUTCOME_RE = /否決|不採択|不同意|不承認/;

/** 議案番号を含まない宣言（諮問など）は対象外 */
const HAS_BILL_NUMBER_RE = /第\d+号議案/;

/**
 * 採決結果ページをパースする。
 *
 * 可決宣言文ごとに議案番号を展開し、全体を合算して返す。
 * 件数表記と展開結果が合わない宣言文は `expandBillNumberRange` が例外を投げるため、
 * ここでは捕捉して warnings に残し、その宣言文を採用しない。
 * **誤った議決結果をDBへ入れるより、status を submitted のまま残して
 * 人が確認するほうが安全** という方針（設計書 §5.2）。
 */
export function parseVoteResults(html: string): ParseVoteResultsResult {
  const lines = htmlToLines(html);
  const declarations: VoteDeclaration[] = [];
  const warnings: string[] = [];
  const approvedBillNumbers = new Set<number>();
  const approvedMemberBillNumbers = new Set<number>();

  for (const line of lines) {
    if (!POSITIVE_OUTCOME_RE.test(line)) continue;
    if (NEGATIVE_OUTCOME_RE.test(line)) {
      warnings.push(`否決・不採択を含む宣言文を検出しました（要確認）: ${line}`);
      continue;
    }
    if (!HAS_BILL_NUMBER_RE.test(line)) continue;

    try {
      const numbers = expandBillNumberRange(line);
      declarations.push({ sentence: line, numbers });
      for (const n of numbers.bill) approvedBillNumbers.add(n);
      for (const n of numbers.memberBill) approvedMemberBillNumbers.add(n);
    } catch (error) {
      warnings.push(
        `採決結果の展開に失敗したため採用しません: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (declarations.length === 0) {
    warnings.push("可決を宣言する文が見つかりませんでした");
  }

  return {
    declarations,
    approvedBillNumbers,
    approvedMemberBillNumbers,
    warnings,
  };
}

/** bills.status に入れる値（bill_status_enum の部分集合） */
export type ResolvedBillStatus = "approved" | "submitted";

export type ResolvedStatus = {
  status: ResolvedBillStatus;
  /** bills.status_note。判定根拠を残す */
  statusNote: string;
};

/**
 * 1議案の議決結果を決める。
 *
 * - 可決レンジに含まれる → approved（status_note に宣言文の原文）
 * - 採決結果ページが存在しない → submitted（`voteResults` が null）
 * - ページはあるがレンジ外 → submitted（要確認）
 *
 * **レンジ外を rejected と断定しない。** 否決・継続審査・撤回・未採決の
 * いずれもレンジ外に現れるため、人が確認する対象として submitted に留める。
 */
export function resolveBillStatus(
  billNumber: number,
  billType: ParsedBillType,
  voteResults: ParseVoteResultsResult | null
): ResolvedStatus {
  if (voteResults === null) {
    return {
      status: "submitted",
      statusNote: "採決結果ページ未掲載",
    };
  }

  const approved =
    billType === "member_bill"
      ? voteResults.approvedMemberBillNumbers
      : voteResults.approvedBillNumbers;

  if (!approved.has(billNumber)) {
    return {
      status: "submitted",
      statusNote: "採決結果ページに記載なし（要確認）",
    };
  }

  const source = voteResults.declarations.find((d) =>
    billType === "member_bill"
      ? d.numbers.memberBill.includes(billNumber)
      : d.numbers.bill.includes(billNumber)
  );

  return {
    status: "approved",
    statusNote: source?.sentence ?? "可決（採決結果ページより）",
  };
}
