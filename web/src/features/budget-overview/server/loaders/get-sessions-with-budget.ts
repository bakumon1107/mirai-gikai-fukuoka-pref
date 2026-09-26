import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import { findAllSessionsWithBudget } from "../repositories/budget-repository";

/**
 * budget_overviews が存在する全会期を新しい順に取得
 */
export async function getSessionsWithBudget(): Promise<CouncilSession[]> {
  return _getCachedSessionsWithBudget();
}

const _getCachedSessionsWithBudget = unstable_cache(
  async (): Promise<CouncilSession[]> => {
    return findAllSessionsWithBudget();
  },
  // schedule_milestones を足してシェイプが変わったため -v2（CLAUDE.md 規約）
  ["sessions-with-budget-v2"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.COUNCIL_SESSIONS],
  }
);
