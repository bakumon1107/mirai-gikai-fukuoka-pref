import "server-only";
import { ExternalLink } from "lucide-react";
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
  /** 事務事業評価の最新年度 slug */
  jimuJigyoSlug: string;
  billSummary: BillStatusSummary;
  /** 議案一覧への入口（件数を数えた会期の slug） */
  billsSessionSlug: string | null;
  /**
   * 件数を数えた会期が開会中か。サイト全体の会期状態ではない。
   * 見出しで「いま」と言ってよいかの判断にだけ使う
   */
  isInSession: boolean;
};

/** 税金の使い道マップ（外部サイト） */
const TAX_MAP_URL =
  "https://inshatancountry-jpn-tax-map.com/local-tax/?pref=40&entity=400009";

/**
 * 下段のカード（設計書 5.9 節 / デザイン v4「3b 整理後」）。
 *
 * 「議員から探す」は議員マスタがDBに無いため出さない（設計書 5.9 節で決定済み）。
 * そのため PC でも2カード構成になる。
 *
 * **事務事業評価と税金の使い道マップは「県のお金」カードの中に入れる。**
 * 以前は下に別のアコーディオン（`BannerAccordion`）で置いていたが、
 * 角丸・枠線・幅がカードと別物で浮いており、内容も「県のお金」と
 * 重複していた。カードの並びだけで完結させる。
 *
 * カード全体を1つの `<a>` にはしない。上部（予算ページ）と下部の2リンクで
 * 行き先が違うため、リンクを入れ子にできない。
 */
export function BottomCards({
  budgetSlug,
  budgetLabel,
  jimuJigyoSlug,
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
        <div className="flex flex-col rounded-[28px] bg-white p-6">
          <Link
            href={`/budget/${budgetSlug}`}
            className="flex flex-col gap-2.5 rounded-2xl hover:bg-pref-surface-tint"
          >
            <span className="text-xs font-medium text-pref-accent">
              県のお金
            </span>
            <span className="font-rounded text-lg font-bold leading-relaxed text-mirai-text">
              {budgetLabel ?? "予算をテーマでたどる"}
            </span>
            <span className="text-xs leading-relaxed text-mirai-text-secondary">
              予算の概要と重点施策
            </span>
          </Link>

          <div className="mt-4 flex flex-col gap-2 border-t border-pref-divider pt-4">
            <Link
              href={`/jimu-jigyo/${jimuJigyoSlug}`}
              className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-pref-surface-tint"
            >
              <span className="text-sm font-medium text-mirai-text">
                事務事業評価
              </span>
              <span className="shrink-0 text-xs text-mirai-text-secondary">
                事業の見直し区分・KPI
              </span>
            </Link>

            {/* 外部リンクは文字ラベルとアイコンの両方で示す（デザイン v4） */}
            <a
              href={TAX_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-pref-surface-tint"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-mirai-text">
                お金の使い道マップ
                <ExternalLink className="size-3.5 text-mirai-text-secondary" />
              </span>
              <span className="shrink-0 text-xs text-mirai-text-secondary">
                外部サイト
              </span>
            </a>
          </div>
        </div>
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
