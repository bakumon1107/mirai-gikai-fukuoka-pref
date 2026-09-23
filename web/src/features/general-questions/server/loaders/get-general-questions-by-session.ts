import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { GeneralQuestion } from "../../shared/types";
import { findPublishedGeneralQuestionsBySession } from "../repositories/general-questions-repository";

export async function getGeneralQuestionsBySession(
  sessionId: string
): Promise<GeneralQuestion[]> {
  return _getCached(sessionId);
}

const _getCached = unstable_cache(
  async (sessionId: string): Promise<GeneralQuestion[]> => {
    return findPublishedGeneralQuestionsBySession(sessionId);
  },
  // question_type の追加で戻り値のシェイプが変わったため v2 にバンプ
  ["general-questions-by-session-v2"],
  {
    revalidate: 600,
    tags: [CACHE_TAGS.GENERAL_QUESTIONS],
  }
);
