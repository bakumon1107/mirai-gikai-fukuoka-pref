import "server-only";
import Link from "next/link";
import { ExternalLink, ArrowLeft } from "lucide-react";
import type { BudgetOverviewWithThemes } from "../../shared/types";

type BudgetOverviewDetailProps = {
  overview: BudgetOverviewWithThemes;
  sessionSlug: string;
};

export function BudgetOverviewDetail({
  overview,
  sessionSlug,
}: BudgetOverviewDetailProps) {
  return (
    <div>
      {/* ナビゲーション */}
      <Link
        href={`/budget/${sessionSlug}`}
        className="inline-flex items-center gap-1 text-sm text-mirai-text-muted hover:text-mirai-text mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        予算一覧に戻る
      </Link>

      {/* ヘッダー */}
      <div className="bg-card rounded-lg border border-border p-6 mb-6">
        <h1 className="text-2xl font-bold text-mirai-text">
          {overview.department_name}
        </h1>
        <h2 className="text-base text-mirai-text-secondary mt-1">
          令和8年度 重点施策
        </h2>

        {overview.direction && (
          <p className="mt-4 text-sm text-mirai-text-secondary leading-relaxed">
            {overview.direction}
          </p>
        )}

        {overview.source_url && (
          <Link
            href={overview.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-4 text-xs text-mirai-text-muted hover:text-mirai-text"
          >
            <ExternalLink className="w-3 h-3" />
            予算書PDF（福岡県公式サイト）
          </Link>
        )}
      </div>
    </div>
  );
}
