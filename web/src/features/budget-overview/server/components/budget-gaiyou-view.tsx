import "server-only";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { BudgetOverviewWithThemes } from "../../shared/types";
import { BudgetThemeCard } from "../../client/components/budget-theme-card";

type BudgetGaiyouViewProps = {
  overviews: BudgetOverviewWithThemes[];
};

export function BudgetGaiyouView({ overviews }: BudgetGaiyouViewProps) {
  if (overviews.length === 0) {
    return (
      <p className="text-mirai-text-muted text-center py-10">
        公開中の予算概要はありません。
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {overviews.map((overview) => (
        <section key={overview.id}>
          {/* 柱ヘッダー */}
          <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b-2 border-primary">
            <h2 className="text-lg font-bold text-mirai-text">
              {overview.department_name}
            </h2>
            {overview.source_url && (
              <Link
                href={overview.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-mirai-text-muted hover:text-mirai-text shrink-0 mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                PDF
              </Link>
            )}
          </div>

          {/* テーマカード一覧 */}
          {overview.themes.length === 0 ? (
            <p className="text-sm text-mirai-text-muted">
              テーマ情報がありません。
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {overview.themes.map((theme) => (
                <li key={theme.id}>
                  <BudgetThemeCard theme={theme} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
