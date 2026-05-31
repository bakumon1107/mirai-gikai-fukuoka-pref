import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CouncilSession } from "@/features/council-sessions/shared/types";

interface PastSessionsSectionProps {
  sessions: CouncilSession[];
  budgetSessions: CouncilSession[];
}

const MAX_VISIBLE_SESSIONS = 5;

function toBudgetLabel(sessionName: string): string {
  const match = sessionName.match(/令和(\d+)年/);
  return match ? `令和${match[1]}年度予算` : sessionName;
}

export function PastSessionsSection({
  sessions,
  budgetSessions,
}: PastSessionsSectionProps) {
  const visibleSessions = sessions.slice(0, MAX_VISIBLE_SESSIONS);
  const visibleBudgetSessions = budgetSessions.slice(0, MAX_VISIBLE_SESSIONS);

  return (
    <section className="flex flex-col gap-8">
      {/* 過去の定例会 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[22px] font-bold text-black leading-[1.48]">
            過去の定例会
          </h2>
          <p className="text-xs text-mirai-text-secondary">
            過去に開催された定例会の議案をご覧いただけます
          </p>
        </div>

        {visibleSessions.length === 0 ? (
          <p className="text-mirai-text-secondary text-sm py-4">
            過去の定例会はまだ掲載されていません。
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-mirai-border">
            {visibleSessions.map((session) => {
              if (!session.slug) return null;
              return (
                <li key={session.id}>
                  <Link
                    href={`/sessions/${session.slug}/bills`}
                    className="flex items-center justify-between py-4 px-2 hover:bg-mirai-surface-grouped rounded-lg transition-colors group"
                  >
                    <span className="font-bold text-mirai-text text-base">
                      {session.name}
                    </span>
                    <ChevronRight className="h-5 w-5 text-mirai-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-center">
          <Button variant="outline" size="lg" asChild className="rounded-full">
            <Link href="/sessions">過去の議会を一覧で表示</Link>
          </Button>
        </div>
      </div>

      {/* 過去の予算 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[22px] font-bold text-black leading-[1.48]">
            過去の予算
          </h2>
          <p className="text-xs text-mirai-text-secondary">
            各年度の予算概要と重点施策をまとめています
          </p>
        </div>

        {visibleBudgetSessions.length > 0 && (
          <ul className="flex flex-col divide-y divide-mirai-border">
            {visibleBudgetSessions.map((session) => {
              if (!session.slug) return null;
              return (
                <li key={session.id}>
                  <Link
                    href={`/budget/${session.slug}`}
                    className="flex items-center justify-between py-4 px-2 hover:bg-mirai-surface-grouped rounded-lg transition-colors group"
                  >
                    <span className="font-bold text-mirai-text text-base">
                      {toBudgetLabel(session.name)}
                    </span>
                    <ChevronRight className="h-5 w-5 text-mirai-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-center">
          <Button variant="outline" size="lg" asChild className="rounded-full">
            <Link href="/budget">過去の予算を一覧で表示</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
