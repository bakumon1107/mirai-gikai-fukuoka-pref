import Link from "next/link";
import { ArrowRight, BarChart2 } from "lucide-react";

type BudgetOverviewBannerProps = {
  sessionSlug: string;
  sessionName: string;
};

function toFiscalYearLabel(sessionName: string): string {
  const match = sessionName.match(/令和(\d+)年/);
  return match ? `令和${match[1]}年度` : sessionName;
}

export function BudgetOverviewBanner({
  sessionSlug,
  sessionName,
}: BudgetOverviewBannerProps) {
  const fiscalYear = toFiscalYearLabel(sessionName);
  const monthMatch = sessionName.match(/(\d{1,2})月/);
  const isShoki = monthMatch ? Number(monthMatch[1]) === 2 : false;

  return (
    <Link
      href={`/budget/${sessionSlug}`}
      className="flex items-center justify-between gap-4 bg-card border border-border rounded-lg px-5 py-4 hover:border-primary transition-colors"
    >
      <div className="flex items-start gap-3">
        <BarChart2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-mirai-text">
            {isShoki
              ? `${fiscalYear} 当初予算の概要`
              : `${fiscalYear} 各局の重点施策`}
          </p>
          <p className="mt-0.5 text-sm text-mirai-text-secondary">
            {isShoki
              ? "予算編成の考え方と各テーマの主要施策をまとめています"
              : "各局の予算の方向性と主要施策をわかりやすく解説します"}
          </p>
        </div>
      </div>
      <ArrowRight className="w-5 h-5 text-mirai-text-muted shrink-0" />
    </Link>
  );
}
