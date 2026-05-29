import Image from "next/image";
import { ExternalLink } from "lucide-react";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import { BillListWithStatusFilter } from "@/features/council-sessions/client/components/bill-list-with-status-filter";
import { groupBillsByTag } from "../../shared/utils/group-bills-by-tag";
import type { BillWithContent } from "../../shared/types";
import { FeaturedBillSection } from "./featured-bill-section";
import { BillsByTagSection } from "./bills-by-tag-section";

interface SessionBillsPageProps {
  session: CouncilSession;
  bills: BillWithContent[];
}

export function SessionBillsPage({ session, bills }: SessionBillsPageProps) {
  const startDate = new Date(session.start_date);
  const endDate = new Date(session.end_date ?? session.start_date);
  const sessionDescription = `${startDate.getFullYear()}.${startDate.getMonth() + 1}月〜${endDate.getMonth() + 1}月に実施された${session.name}`;

  const featuredBills = bills.filter((b) => b.is_featured);
  const billsByTag = groupBillsByTag(bills);

  return (
    <div className="flex flex-col gap-16">
      {/* アーカイブヘッダー */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1>
            <Image
              src="/icons/archive-typography.svg"
              alt="Archive"
              width={156}
              height={36}
              priority
            />
          </h1>
          <p className="text-sm font-bold text-primary-accent">
            {session.name}に上程された議案
          </p>
        </div>

        <div className="flex flex-col gap-0.5">
          <h2 className="text-[22px] font-bold text-black leading-[1.48] flex items-center gap-4">
            {startDate.getFullYear()}年 {session.name}の提出議案
            <span>{bills.length}件</span>
          </h2>
          <p className="text-xs font-medium text-mirai-text">
            {sessionDescription}
          </p>
        </div>
      </div>

      {/* 注目の議案 */}
      <FeaturedBillSection bills={featuredBills} />

      {/* カテゴリ別議案 */}
      {billsByTag.length > 0 && <BillsByTagSection billsByTag={billsByTag} />}

      {/* 全議案リスト（ステータスフィルター付き） */}
      {bills.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          この定例会の議案はまだありません
        </p>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-[22px] font-bold text-black leading-[1.48]">
            全議案一覧
          </h2>
          <BillListWithStatusFilter bills={bills} />
        </section>
      )}

      {/* 県議会リンク */}
      {session.council_url && (
        <div className="flex items-center gap-1 text-[13px] font-medium text-mirai-text">
          {startDate.getFullYear()}年{session.name}に上程された全ての議案は
          <a
            href={session.council_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            福岡県議会情報へ
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
