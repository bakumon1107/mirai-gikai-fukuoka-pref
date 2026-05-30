import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { getCouncilSessionBySlug } from "@/features/council-sessions/server/loaders/get-council-session-by-slug";
import { findPreviousCouncilSession } from "@/features/council-sessions/server/repositories/council-session-repository";
import { getBudgetOverviewsWithThemes } from "@/features/budget-overview/server/loaders/get-budget-overviews-with-themes";
import { hasPublishedOverviewsBySession } from "@/features/budget-overview/server/repositories/budget-repository";
import { BudgetOverviewList } from "@/features/budget-overview/server/components/budget-overview-list";
import { BudgetGaiyouView } from "@/features/budget-overview/server/components/budget-gaiyou-view";
import { BudgetChatClient } from "@/features/budget-overview/client/components/budget-chat-client";
import { siteConfig } from "@/config/site.config";

interface BudgetListPageProps {
  params: Promise<{
    session_slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: BudgetListPageProps): Promise<Metadata> {
  const { session_slug } = await params;
  const session = await getCouncilSessionBySlug(session_slug);

  if (!session) {
    return { title: "会期が見つかりません" };
  }

  const overviews = await getBudgetOverviewsWithThemes(session.id);
  const isGaiyouStyle = isBudgetGaiyouStyle(overviews);

  return {
    title: isGaiyouStyle
      ? `${toFiscalYearLabel(session.name)} 当初予算の概要`
      : `${session.name} 各局の重点施策`,
    description: isGaiyouStyle
      ? `${toFiscalYearLabel(session.name)}の当初予算の概要・主要施策をまとめています。`
      : `${session.name}の各局予算の重点施策・方向性をわかりやすく解説します。`,
  };
}

function toFiscalYearLabel(sessionName: string): string {
  const match = sessionName.match(/令和(\d+)年/);
  return match ? `令和${match[1]}年度` : sessionName;
}

/** 全概要が同じdirectionを持つ場合＝予算概要スタイル */
function isBudgetGaiyouStyle(
  overviews: { direction: string | null }[]
): boolean {
  if (overviews.length === 0) return false;
  const dir = overviews[0].direction;
  return !!dir && overviews.every((o) => o.direction === dir);
}

export default async function BudgetListPage({ params }: BudgetListPageProps) {
  const { session_slug } = await params;

  const [session, currentDifficulty] = await Promise.all([
    getCouncilSessionBySlug(session_slug),
    getDifficultyLevel(),
  ]);
  if (!session) {
    notFound();
  }

  const [overviews, prevSession] = await Promise.all([
    getBudgetOverviewsWithThemes(session.id),
    findPreviousCouncilSession(session.start_date),
  ]);

  // 前回のセッションに budget_overviews があるか確認
  const prevSessionWithBudget = prevSession?.slug
    ? await hasPublishedOverviewsBySession(prevSession.id).then((has) =>
        has ? prevSession : null
      )
    : null;

  const gaiyouStyle = isBudgetGaiyouStyle(overviews);
  const budgetHeadline = gaiyouStyle ? overviews[0].direction : null;
  const fiscalYear = toFiscalYearLabel(session.name);

  return (
    <Container className="py-10 pb-28">
      <div className="mb-8">
        {gaiyouStyle ? (
          <>
            <p className="text-xs font-medium text-mirai-text-muted uppercase tracking-wide mb-1">
              {fiscalYear}当初予算編成の考え方
            </p>
            <h1 className="text-2xl font-bold text-mirai-text">
              {budgetHeadline}
            </h1>
            <p className="mt-2 text-sm text-mirai-text-secondary">
              {fiscalYear}当初予算の概要 — 各テーマの主要施策をまとめています。
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-mirai-text">
              各局の重点施策
            </h1>
            <p className="mt-2 text-sm text-mirai-text-secondary">
              {fiscalYear}予算の各局予算の方向性と主要施策をまとめています。
            </p>
          </>
        )}
      </div>

      {gaiyouStyle ? (
        <BudgetGaiyouView overviews={overviews} />
      ) : (
        <BudgetOverviewList
          overviews={overviews}
          sessionSlug={session_slug}
          showDirection
        />
      )}

      {/* 前年度予算セクション */}
      {prevSessionWithBudget && (
        <div className="mt-12 pt-8 border-t border-mirai-border">
          <h2 className="text-lg font-bold text-mirai-text mb-4">
            前年度の予算
          </h2>
          <Link
            href={`/budget/${prevSessionWithBudget.slug}`}
            className="flex items-center justify-between py-4 px-2 hover:bg-mirai-surface-grouped rounded-lg transition-colors group"
          >
            <span className="font-bold text-mirai-text text-base">
              {prevSessionWithBudget.name}
            </span>
            <ChevronRight className="h-5 w-5 text-mirai-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </Link>
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-full"
            >
              <Link href="/budget">さらに前の予算を一覧で表示</Link>
            </Button>
          </div>
        </div>
      )}

      {siteConfig.features.aiChat && overviews.length > 0 && (
        <BudgetChatClient
          currentDifficulty={currentDifficulty}
          budget={{
            departmentName: `${session.name} 予算概要`,
            themes: overviews.flatMap((o) =>
              o.themes.map((t) => ({
                title: t.title,
                aiSummary: t.ai_summary,
              }))
            ),
          }}
        />
      )}
    </Container>
  );
}
