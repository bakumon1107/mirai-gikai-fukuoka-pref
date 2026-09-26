import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import { BannerAccordion } from "@/components/top/banner-accordion";
import { TopHero } from "@/features/top-hero/server/components/top-hero";
import { loadTopHeroData } from "@/features/top-hero/server/loaders/load-top-hero-data";
import { BottomCards } from "@/features/top-sections/server/components/bottom-cards";
import { CommitteeSection } from "@/features/top-sections/server/components/committee-section";
import { QuestionsSection } from "@/features/top-sections/server/components/questions-section";
import { SessionBand } from "@/features/top-sections/server/components/session-band";
import { ThemeSection } from "@/features/top-sections/server/components/theme-section";
import { loadTopSectionsData } from "@/features/top-sections/server/loaders/load-top-sections-data";
import { JimuJigyoArchiveSection } from "@/components/top/jimu-jigyo-archive-section";
import { JimuJigyoBanner } from "@/components/top/jimu-jigyo-banner";
import { PastSessionsSection } from "@/components/top/past-sessions-section";
import { PrefFinanceBanner } from "@/components/top/pref-finance-banner";
import { TeamMirai } from "@/components/top/team-mirai";
import { siteConfig } from "@/config/site.config";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BillDisclaimer } from "@/features/bills/client/components/bill-detail/bill-disclaimer";
import { getSessionsWithBudget } from "@/features/budget-overview/server/loaders/get-sessions-with-budget";
import { HomeChatSection } from "@/features/chat/server/components/home-chat-section";
import { getAllPastSessions } from "@/features/council-sessions/server/loaders/get-all-past-sessions";
import { PressConferenceArchiveSection } from "@/features/press-conferences/client/components/press-conference-archive-section";
import { getPressConferences } from "@/features/press-conferences/server/loaders/get-press-conferences";

export default async function Home() {
  const [
    heroData,
    sectionsData,
    currentDifficulty,
    pastSessions,
    budgetSessions,
    pressConferences,
  ] = await Promise.all([
    loadTopHeroData(),
    loadTopSectionsData(),
    getDifficultyLevel(),
    getAllPastSessions(),
    getSessionsWithBudget(),
    getPressConferences(),
  ]);

  return (
    <>
      {/* ヒーロー（設計書 5.3節） */}
      <TopHero
        currentSession={heroData.currentSession}
        nextSession={heroData.nextSession}
        latestConference={heroData.latestConference}
        recentConferences={heroData.recentConferences}
        inSessionCounts={heroData.inSessionCounts}
        today={heroData.today}
      />

      {/* 定例会の帯（設計書 5.5節） */}
      <SessionBand slots={sectionsData.sessionSlots} />

      {/* 委員会の最新の話し合い（設計書 5.6節） */}
      <CommitteeSection
        meetings={sectionsData.committeeMeetings}
        isInSession={heroData.currentSession !== null}
      />

      {/* 代表質問・一般質問から（設計書 5.7節） */}
      <QuestionsSection
        questions={sectionsData.questions}
        sessionName={sectionsData.questionSessionName}
      />

      {/* 気になるテーマから（設計書 5.8節） */}
      <ThemeSection />

      {/* 下段カード（設計書 5.9節） */}
      <BottomCards
        budgetSlug={sectionsData.budgetSlug}
        budgetLabel={sectionsData.budgetLabel}
        billSummary={sectionsData.billSummary}
        billsSessionSlug={sectionsData.billsSessionSlug}
        isInSession={sectionsData.isBillSessionInSession}
      />

      {/* 事務事業評価・お金の使い道は下段カードに入りきらないためアコーディオンで残す */}
      <Container className="pt-8">
        <BannerAccordion
          title="福岡県の評価・お金の使い道"
          description="事務事業評価、財政の状況をまとめて見る"
        >
          <JimuJigyoBanner />
          <PrefFinanceBanner />
        </BannerAccordion>
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

      {/* チャット機能。議案の取得は HomeChatSection の中に閉じてあるので、
          無効な間は取得も走らない */}
      {siteConfig.features.aiChat && (
        <HomeChatSection currentDifficulty={currentDifficulty} />
      )}
    </>
  );
}
