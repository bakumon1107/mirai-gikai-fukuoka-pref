import type { BillStatusEnum } from "../types";
import { getCardStatusLabel } from "./bill-status";

/**
 * トップページの議案件数チップ1つぶん（設計書 5.9.1 節）。
 *
 * ラベルは既存の {@link getCardStatusLabel} を使う。
 * `submitted` / `in_committee` / `plenary_session` は
 * 「議会審議中」の1ラベルに畳まれるため、**畳んだ後のラベル単位で合算する**。
 */
export type BillStatusChip = {
  label: string;
  count: number;
};

export type BillStatusSummary = {
  total: number;
  chips: BillStatusChip[];
  /** 全件が同じラベルに収まるか（見出しの文言分岐に使う） */
  isUniform: boolean;
};

/**
 * 議案の審議状況を集計する。
 *
 * 表示順は件数の多い順。同数ならラベル名で安定させる。
 */
export function summarizeBillStatuses(
  statuses: BillStatusEnum[]
): BillStatusSummary {
  const counts = new Map<string, number>();

  for (const status of statuses) {
    const label = getCardStatusLabel(status);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const chips = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    total: statuses.length,
    chips,
    isUniform: chips.length === 1,
  };
}

/**
 * 件数要約の見出し文言（設計書 5.9.1 節）。
 *
 * - 会期中: 「いまN件を審議中」
 * - 閉会後・全件同一: 「前回の議案はすべて可決」
 * - 閉会後・混在: 「N件中M件が可決」
 */
export function buildBillSummaryHeadline(
  summary: BillStatusSummary,
  isInSession: boolean
): string | null {
  if (summary.total === 0) return null;

  if (isInSession) {
    return `いま${summary.total}件を審議中`;
  }

  if (summary.isUniform) {
    return `前回の議案はすべて${summary.chips[0].label}`;
  }

  const approved = summary.chips.find((chip) => chip.label === "可決");
  if (approved) {
    return `${summary.total}件中${approved.count}件が可決`;
  }

  return `前回の議案は${summary.total}件`;
}
