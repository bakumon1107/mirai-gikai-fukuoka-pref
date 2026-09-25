import type { BillPublishStatus, BillStatusEnum } from "../types";
import { getCardStatusLabel } from "./bill-status";

/** 集計の入力。件数チップと「掲載待ち」の表示に使う */
export type BillStatusEntry = {
  status: BillStatusEnum;
  publishStatus: BillPublishStatus;
};

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
  /** 件数チップの合計（published + coming_soon） */
  total: number;
  chips: BillStatusChip[];
  /** 中身が読める議案の数。0 なら詳細への導線を出さない */
  publishedCount: number;
  /** 中身が未掲載（紙をスキャン中）の議案の数 */
  comingSoonCount: number;
  /** 全件が同じラベルに収まるか（見出しの文言分岐に使う） */
  isUniform: boolean;
};

/**
 * 議案の審議状況を集計する。
 *
 * 表示順は件数の多い順。同数ならラベル名で安定させる。
 */
export function summarizeBillStatuses(
  entries: BillStatusEntry[]
): BillStatusSummary {
  const counts = new Map<string, number>();
  let publishedCount = 0;
  let comingSoonCount = 0;

  for (const entry of entries) {
    const label = getCardStatusLabel(entry.status);
    counts.set(label, (counts.get(label) ?? 0) + 1);

    if (entry.publishStatus === "published") publishedCount++;
    if (entry.publishStatus === "coming_soon") comingSoonCount++;
  }

  const chips = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    total: entries.length,
    chips,
    publishedCount,
    comingSoonCount,
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

/**
 * 中身が未掲載の議案がある場合の補足文言。
 *
 * 議案本文は紙で配布されスキャンして掲載するため、会期の序盤は
 * 件数だけ分かって中身が読めない状態になる。件数と実際に読める数が
 * 食い違う理由を利用者に伝える。
 *
 * 全件が掲載済みなら null（何も出さない）。
 */
export function buildComingSoonNote(summary: BillStatusSummary): string | null {
  if (summary.comingSoonCount === 0) return null;

  if (summary.publishedCount === 0) {
    return "内容は準備でき次第、順次掲載します";
  }

  return `うち${summary.publishedCount}件の内容を掲載中（残りは順次掲載します）`;
}
