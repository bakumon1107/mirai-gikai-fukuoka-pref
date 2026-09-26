import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { CouncilSession } from "../../shared/types";
import { findCouncilSessionById } from "../repositories/council-session-repository";

export async function getCouncilSessionById(
  id: string
): Promise<CouncilSession | null> {
  return _getCached(id);
}

const _getCached = unstable_cache(
  async (id: string): Promise<CouncilSession | null> => {
    return findCouncilSessionById(id);
  },
  // schedule_milestones を足してシェイプが変わったため -v2（CLAUDE.md 規約）
  ["council-session-by-id-v2"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.COUNCIL_SESSIONS],
  }
);
