import { notFound, redirect } from "next/navigation";
import { findLatestSessionWithPublishedQuestions } from "@/features/general-questions/server/repositories/general-questions-repository";

/**
 * ナビの「質問」の着地点。質問が公開されている最新会期へ送る。
 *
 * **開催中の会期（is_active / 日付）では選ばない。**
 *
 * - `is_active` は手動更新のフラグで実態とずれる。本番でも令和8年9月
 *   定例会が開会中なのに6月のままだった。ずれると誤った会期へ飛ぶ。
 * - 日付で開催中の会期を選ぶと、会期の序盤は質問がまだ公開されておらず
 *   空のページに着く。
 *
 * 質問の有無で選べば、公開された時点で自動的に新しい会期へ切り替わる。
 */
export default async function QuestionsPage() {
  const session = await findLatestSessionWithPublishedQuestions();

  if (!session?.slug) {
    notFound();
  }

  redirect(`/sessions/${session.slug}/questions`);
}
