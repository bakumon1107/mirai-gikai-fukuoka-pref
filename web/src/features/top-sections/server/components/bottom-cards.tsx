import "server-only";
import Link from "next/link";
import type { BillStatusSummary } from "@/features/bills/shared/utils/summarize-bill-statuses";
import {
  buildBillSummaryHeadline,
  buildComingSoonNote,
} from "@/features/bills/shared/utils/summarize-bill-statuses";

type Props = {
  /** 予算ページへの入口。会期 slug が無ければカードを出さない */
  budgetSlug: string | null;
  budgetLabel: string | null;
  billSummary: BillStatusSummary;
  /** 議案一覧への入口（最新会期の slug） */
  billsSessionSlug: string | null;
  isInSession: boolean;
};

/**
 * 下段のカード（設計書 5.9 節）。
 *
 * 「議員から探す」は議員マスタがDBに無いため出さない（設計書 5.9 節で決定済み）。
 * そのため PC でも2カード構成になる。
 */
export function BottomCards({
  budgetSlug,
  budgetLabel,
  billSummary,
  billsSessionSlug,
  isInSession,
}: Props) {
  const billHeadline = buildBillSummaryHeadline(billSummary, isInSession);
  const comingSoonNote = buildComingSoonNote(billSummary);

  if (!budgetSlug && !billHeadline) return null;

  return (
    <section className="mx-4 mt-10 grid gap-3.5 pc:mx-16 pc:mt-12 pc:grid-cols-2 pc:gap-5">
      {budgetSlug && (
        <Link
          href={`/budget/${budgetSlug}`}
          className="flex flex-col gap-2.5 rounded-[28px] bg-white p-6 hover:bg-pref-surface-tint"
        >
          <span className="text-xs font-medium text-pref-accent">県のお金</span>
          <span className="font-rounded text-lg font-bold leading-relaxed text-mirai-text">
            {budgetLabel ?? "予算をテーマでたどる"}
          </span>
          <span className="text-xs leading-relaxed text-mirai-text-secondary">
            予算の概要、事務事業評価、財政の状況もまとめて
          </span>
        </Link>
      )}

      {billHeadline && (
        <Link
          href={
            billsSessionSlug
              ? `/sessions/${billsSessionSlug}/bills`
              : "/sessions"
          }
          className="flex flex-col gap-2.5 rounded-[28px] bg-white p-6 hover:bg-pref-surface-tint"
        >
          <span className="text-xs font-medium text-pref-accent">議案</span>
          <span className="font-rounded text-lg font-bold text-mirai-text">
            {billHeadline}
          </span>

          <span className="flex flex-wrap gap-1.5">
            {billSummary.chips.map((chip) => (
              <span
                key={chip.label}
                className="rounded-full bg-pref-surface-sub px-2.5 py-1 text-xs text-mirai-text-secondary"
              >
                {chip.label} {chip.count}
              </span>
            ))}
          </span>

          {/* 件数と実際に読める数が食い違う理由を説明する（設計書 5.9.1.1節） */}
          {comingSoonNote && (
            <span className="text-xs text-mirai-text-secondary">
              {comingSoonNote}
            </span>
          )}
        </Link>
      )}
    </section>
  );
}
