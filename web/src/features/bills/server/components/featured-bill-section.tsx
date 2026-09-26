import Link from "next/link";
import { hasBillDetailPage } from "../../shared/utils/has-bill-detail-page";
import type { BillWithContent } from "../../shared/types";
import { BillCard } from "../../client/components/bill-list/bill-card";

interface FeaturedBillSectionProps {
  bills: BillWithContent[];
}

export function FeaturedBillSection({ bills }: FeaturedBillSectionProps) {
  if (bills.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-6">
      {/* セクションヘッダー */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold text-mirai-text leading-[1.48]">
          注目の議案🔥
        </h2>
        <p className="text-xs font-medium text-mirai-text-secondary leading-[1.67]">
          県議会に上程された注目議案
        </p>
      </div>

      {/* 注目の議案カード */}
      <div className="flex flex-col gap-4">
        {/* 本文が未掲載の議案は詳細ページが404になるのでリンクを張らない */}
        {bills.map((bill) =>
          hasBillDetailPage(bill.publish_status) ? (
            <Link key={bill.id} href={`/bills/${bill.id}`}>
              <BillCard bill={bill} />
            </Link>
          ) : (
            <BillCard key={bill.id} bill={bill} />
          )
        )}
      </div>
    </section>
  );
}
