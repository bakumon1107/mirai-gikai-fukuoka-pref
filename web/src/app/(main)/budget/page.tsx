import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { getSessionsWithBudget } from "@/features/budget-overview/server/loaders/get-sessions-with-budget";

function toBudgetArchiveLabel(sessionName: string): string {
  const match = sessionName.match(/令和(\d+)年/);
  return match ? `令和${match[1]}年度予算` : sessionName;
}

export const metadata: Metadata = {
  title: "過去の予算一覧",
  description: "過去の定例会の予算概要一覧です。",
};

export default async function BudgetIndexPage() {
  const sessions = await getSessionsWithBudget();

  return (
    <Container className="py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-mirai-text">過去の予算一覧</h1>
        <p className="mt-2 text-sm text-mirai-text-secondary">
          各年度の予算概要と重点施策をまとめています。
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="text-mirai-text-secondary text-sm py-8 text-center">
          掲載されている予算情報はまだありません。
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-mirai-border">
          {sessions.map((session) => {
            if (!session.slug) return null;
            return (
              <li key={session.id}>
                <Link
                  href={`/budget/${session.slug}`}
                  className="flex items-center justify-between py-4 px-2 hover:bg-mirai-surface-grouped rounded-lg transition-colors group"
                >
                  <span className="font-bold text-mirai-text text-base">
                    {toBudgetArchiveLabel(session.name)}
                  </span>
                  <ChevronRight className="h-5 w-5 text-mirai-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
