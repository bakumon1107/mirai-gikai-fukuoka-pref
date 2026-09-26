import "server-only";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { getBillsByFeaturedTags } from "@/features/bills/server/loaders/get-bills-by-featured-tags";
import { getFeaturedBills } from "@/features/bills/server/loaders/get-featured-bills";
import type { BillWithContent } from "@/features/bills/shared/types";
import { HomeChatClient } from "../../client/components/home-chat-client";

type Props = {
  currentDifficulty: DifficultyLevelEnum;
};

/**
 * トップページのAIチャット。
 *
 * **データ取得をこのコンポーネントの中に閉じている。** トップページ側で
 * 取ってから渡す形だと、`siteConfig.features.aiChat` が false のときでも
 * 議案の取得が走ってしまう。呼び出し側をフラグで囲めば、無効な間は
 * この関数自体が呼ばれない。
 *
 * 取るのはチャットの文脈に使う2つだけ。トップページが議案一覧を
 * 表示しなくなったため（設計書 9章 PR7）、それ以外は不要になった。
 */
export async function HomeChatSection({ currentDifficulty }: Props) {
  const [featuredBills, billsByTag] = await Promise.all([
    getFeaturedBills(),
    getBillsByFeaturedTags(),
  ]);

  const toBillChatContext = (bill: BillWithContent) => ({
    name: `${bill.bill_content?.title}（${bill.name}）`,
    summary: bill.bill_content?.summary,
    tags: bill.tags?.map((tag) => tag.label) || [],
    isFeatured: featuredBills.some((b) => b.id === bill.id),
  });

  const bills = billsByTag
    .flatMap((x) => x.bills)
    .concat(featuredBills)
    .map(toBillChatContext);

  return <HomeChatClient currentDifficulty={currentDifficulty} bills={bills} />;
}
