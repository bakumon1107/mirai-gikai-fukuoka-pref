import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import { BannerAccordion } from "@/components/top/banner-accordion";
import { BudgetOverviewBanner } from "@/components/top/budget-overview-banner";
import { GeneralQuestionsBanner } from "@/components/top/general-questions-banner";
import { Hero } from "@/components/top/hero";
import { JimuJigyoArchiveSection } from "@/components/top/jimu-jigyo-archive-section";
import { JimuJigyoBanner } from "@/components/top/jimu-jigyo-banner";
import { PrefFinanceBanner } from "@/components/top/pref-finance-banner";
import { PastSessionsSection } from "@/components/top/past-sessions-section";
import { TeamMirai } from "@/components/top/team-mirai";
import { siteConfig } from "@/config/site.config";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BillDisclaimer } from "@/features/bills/client/components/bill-detail/bill-disclaimer";
import { BillsByTagSection } from "@/features/bills/server/components/bills-by-tag-section";
import { FeaturedBillSection } from "@/features/bills/server/components/featured-bill-section";
import { loadHomeData } from "@/features/bills/server/loaders/load-home-data";
import type { BillWithContent } from "@/features/bills/shared/types";
import { HomeChatClient } from "@/features/chat/client/components/home-chat-client";
import { CurrentCouncilSession } from "@/features/council-sessions/client/components/current-council-session";
import { getActiveCouncilSession } from "@/features/council-sessions/server/loaders/get-active-council-session";
import { getAllPastSessions } from "@/features/council-sessions/server/loaders/get-all-past-sessions";
import { getCurrentCouncilSession } from "@/features/council-sessions/server/loaders/get-current-council-session";
import { getSessionsWithBudget } from "@/features/budget-overview/server/loaders/get-sessions-with-budget";
import { getLatestSessionWithQuestions } from "@/features/general-questions/server/loaders/get-latest-session-with-questions";
import { PressConferenceArchiveSection } from "@/features/press-conferences/client/components/press-conference-archive-section";
import { PressConferenceNoticeBanner } from "@/features/press-conferences/client/components/press-conference-notice-banner";
import { getLatestPressConference } from "@/features/press-conferences/server/loaders/get-latest-press-conference";
import { getPressConferences } from "@/features/press-conferences/server/loaders/get-press-conferences";
import { getJapanTime } from "@/lib/utils/date";

export default async function Home() {
  const { billsByTag, featuredBills } = await loadHomeData();

  // ゆくゆくタグ機能がマージされたらBFFに統合する
  const [
    currentSession,
    activeSession,
    currentDifficulty,
    pastSessions,
    budgetSessions,
    latestQuestionsSlug,
    latestPressConference,
    pressConferences,
  ] = await Promise.all([
    getCurrentCouncilSession(getJapanTime()),
    getActiveCouncilSession(),
    getDifficultyLevel(),
    getAllPastSessions(),
    getSessionsWithBudget(),
    getLatestSessionWithQuestions(),
    getLatestPressConference(),
    getPressConferences(),
  ]);

  const toBillChatContext = (bill: BillWithContent) => {
    return {
      name: `${bill.bill_content?.title}（${bill.name}）`,
      summary: bill.bill_content?.summary,
      tags: bill.tags?.map((tag) => tag.label) || [],
      isFeatured: featuredBills.some((b) => b.id === bill.id),
    };
  };

  return (
    <>
      <Hero />

      {/* 本日の定例会セクション */}
      <CurrentCouncilSession session={currentSession} />

      {/* 知事記者会見バナー */}
      {latestPressConference && (
        <Container className="pt-4">
          <PressConferenceNoticeBanner
            pressConference={latestPressConference}
          />
        </Container>
      )}

      {/* 一般質問バナー */}
      {latestQuestionsSlug && (
        <Container className="pt-6">
          <GeneralQuestionsBanner sessionSlug={latestQuestionsSlug} />
        </Container>
      )}

      {/* 予算・事務事業評価・お金の使い道（まとめてアコーディオン） */}
      <Container className="pt-3">
        <BannerAccordion
          title="福岡県の予算・評価・お金の使い道"
          description="予算の概要、事務事業評価、財政の状況をまとめて見る"
        >
          {budgetSessions[0]?.slug && (
            <BudgetOverviewBanner
              sessionSlug={budgetSessions[0].slug}
              sessionName={budgetSessions[0].name}
            />
          )}
          <JimuJigyoBanner />
          <PrefFinanceBanner />
        </BannerAccordion>
      </Container>

      {/* 議案一覧セクション */}
      <Container className="">
        <div className="py-10">
          <main className="flex flex-col gap-16">
            {/* 注目の議案セクション */}
            <FeaturedBillSection bills={featuredBills} />

            {/* タグ別議案一覧セクション */}
            <BillsByTagSection billsByTag={billsByTag} />
          </main>
        </div>
      </Container>

      {/* 過去の定例会セクション（Archive） */}
      <div className="bg-mirai-surface-muted py-10">
        <Container>
          <PastSessionsSection
            sessions={pastSessions}
            budgetSessions={budgetSessions}
          />
        </Container>
      </div>

      {/* 知事記者会見アーカイブセクション */}
      {pressConferences.length > 0 && (
        <div className="bg-white py-10">
          <Container>
            <PressConferenceArchiveSection
              pressConferences={pressConferences}
            />
          </Container>
        </div>
      )}

      {/* 事務事業評価セクション（Archive） */}
      <div className="bg-mirai-surface-muted py-10">
        <Container>
          <JimuJigyoArchiveSection />
        </Container>
      </div>

      <Container>
        {/* みらい議会とは セクション */}
        <About />

        {/* チームみらいについて セクション */}
        <TeamMirai />

        {/* 免責事項 */}
        <BillDisclaimer />
      </Container>

      {/* チャット機能 */}
      {siteConfig.features.aiChat && (
        <HomeChatClient
          currentDifficulty={currentDifficulty}
          bills={billsByTag
            .flatMap((x) => x.bills)
            .concat(featuredBills)
            .map(toBillChatContext)}
        />
      )}
    </>
  );
}
