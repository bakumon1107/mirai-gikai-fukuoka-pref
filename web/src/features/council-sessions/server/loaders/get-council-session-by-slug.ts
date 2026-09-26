import { createAdminClient } from "@mirai-gikai/supabase";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { CouncilSession } from "../../shared/types";
import { parseSessionMilestones } from "../../shared/utils/parse-session-milestones";

/**
 * slugで定例会を取得
 */
export async function getCouncilSessionBySlug(
  slug: string
): Promise<CouncilSession | null> {
  return _getCachedCouncilSessionBySlug(slug);
}

const _getCachedCouncilSessionBySlug = unstable_cache(
  async (slug: string): Promise<CouncilSession | null> => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("council_sessions")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch council session by slug:", error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      schedule_milestones: parseSessionMilestones(data.schedule_milestones),
    };
  },
  // schedule_milestones を足してシェイプが変わったため -v2（CLAUDE.md 規約）
  ["council-session-by-slug-v2"],
  {
    revalidate: 3600, // 1時間
    tags: [CACHE_TAGS.COUNCIL_SESSIONS],
  }
);
