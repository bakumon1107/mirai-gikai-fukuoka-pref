import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { CouncilSession } from "../../shared/types";
import { findAllPastCouncilSessions } from "../repositories/council-session-repository";

/**
 * 議案が公開済みの会期を全件取得（新しい順）。
 *
 * is_active では絞らない。手動更新のフラグで実際の会期とずれるため、
 * 絞ると議案が公開済みの会期が一覧から消える
 */
export async function getAllPastSessions(): Promise<CouncilSession[]> {
  return _getCachedAllPastSessions();
}

const _getCachedAllPastSessions = unstable_cache(
  async (): Promise<CouncilSession[]> => {
    return findAllPastCouncilSessions();
  },
  ["all-past-sessions"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.COUNCIL_SESSIONS],
  }
);
