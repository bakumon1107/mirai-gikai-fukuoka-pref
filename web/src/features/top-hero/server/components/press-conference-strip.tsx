import "server-only";
import Link from "next/link";
import type { PressConferenceSummary } from "@/features/press-conferences/shared/types";
import { formatShortDate } from "../../shared/utils/format-hero-date";

type Props = {
  conference: PressConferenceSummary;
};

/**
 * 会期中の知事会見（設計書 5.3.2 節 段階2）。
 *
 * 閉会中は会見がヒーロー右カラムの主役だが、会期中は定例会に譲って
 * ヒーロー直下の1行帯に降りる。出すのは日付・先頭の話題・残り件数だけ。
 */
export function PressConferenceStrip({ conference }: Props) {
  const [firstTopic, ...rest] = conference.topics;

  return (
    <Link
      href={`/press-conferences/${conference.slug}`}
      className="mx-4 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[22px] bg-white px-5 py-3.5 hover:bg-pref-surface-tint pc:mx-16"
    >
      <span className="rounded-full bg-pref-pill-bg px-2.5 py-0.5 text-[11px] font-medium text-pref-pill-text">
        知事会見
      </span>
      <span className="text-xs text-mirai-text-secondary">
        {formatShortDate(conference.heldAt)}
      </span>

      {firstTopic && (
        <span className="min-w-0 flex-1 truncate text-sm text-mirai-text">
          {firstTopic.title}
          {rest.length > 0 && ` ほか${rest.length}件`}
        </span>
      )}

      <span className="ml-auto shrink-0 text-xs font-medium text-pref-accent">
        会見を見る
      </span>
    </Link>
  );
}
