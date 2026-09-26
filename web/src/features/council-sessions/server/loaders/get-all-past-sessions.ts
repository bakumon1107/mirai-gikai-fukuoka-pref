import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { CouncilSession } from "../../shared/types";
import { findAllPastCouncilSessions } from "../repositories/council-session-repository";

/**
 * 過去の定例会を全件取得（新しい順）
 * is_active = false のものを start_date DESC で返す
 */
export async function getAllPastSessions(): Promise<CouncilSession[]> {
  return _getCachedAllPastSessions();
}

const _getCachedAllPastSessions = unstable_cache(
  async (): Promise<CouncilSession[]> => {
    return findAllPastCouncilSessions();
  },
  // schedule_milestones を足してシェイプが変わったため -v2（CLAUDE.md 規約）
  ["all-past-sessions-v2"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.COUNCIL_SESSIONS],
  }
);
