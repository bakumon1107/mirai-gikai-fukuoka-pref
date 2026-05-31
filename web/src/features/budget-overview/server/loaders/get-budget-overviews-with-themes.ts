import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { BudgetOverviewWithThemes } from "../../shared/types";
import { findPublishedOverviewsWithThemesBySession } from "../repositories/budget-repository";

/**
 * 会期IDに紐づく公開済み予算概要をテーマ・施策付きで全件取得（10分キャッシュ）
 */
export async function getBudgetOverviewsWithThemes(
  councilSessionId: string
): Promise<BudgetOverviewWithThemes[]> {
  return _getCached(councilSessionId);
}

const _getCached = unstable_cache(
  async (councilSessionId: string): Promise<BudgetOverviewWithThemes[]> => {
    return findPublishedOverviewsWithThemesBySession(councilSessionId);
  },
  ["budget-overviews-with-themes"],
  {
    revalidate: 600,
    tags: [CACHE_TAGS.COUNCIL_SESSIONS],
  }
);
