import "server-only";
import Link from "next/link";
import type { PressConferenceSummary } from "@/features/press-conferences/shared/types";
import { formatShortDate } from "../../shared/utils/format-hero-date";

type Props = {
  conference: PressConferenceSummary;
};

/**
 * 会期中の知事会見（設計書 5.3.2 節 段階2 / デザイン v5）。
 *
 * 会期中は定例会が主役になり、会見はヒーロー直下の帯に降りる。
 * ただし**話題は畳まず全件出す。** 先頭1件＋「ほか3件」にすると、
 * 何が話されたのかが分からなくなる。
 *
 * PC は「見出し｜話題リスト｜会見を見る」の横3列。
 * モバイルは日付行の下に話題を積む（区切り線つき）。
 */
/** 帯に出す話題の上限（デザイン v5 は4件） */
const MAX_TOPICS = 4;

export function PressConferenceStrip({ conference }: Props) {
  const href = `/press-conferences/${conference.slug}`;
  // 取得は全件なので、表示側で絞る。会見によっては話題が18件あり、
  // そのまま出すと帯がヒーローより高くなる
  const topics = conference.topics.slice(0, MAX_TOPICS);

  return (
    <div className="mx-4 mt-3 flex flex-col rounded-[18px] bg-white px-4 pt-3.5 pb-1.5 pc:mx-16 pc:flex-row pc:items-start pc:gap-4 pc:rounded-[22px] pc:px-6 pc:py-4">
      <div className="mb-0.5 flex shrink-0 items-center gap-2 pc:mb-0 pc:min-h-7">
        <span className="rounded-full bg-pref-pill-bg px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-pref-pill-text pc:text-xs">
          知事会見
        </span>
        <span className="font-rounded text-sm font-bold whitespace-nowrap text-mirai-text pc:text-[15px]">
          {formatShortDate(conference.heldAt)}
        </span>

        {/* モバイルは日付の行に置く。PCでは右端へ回す */}
        <Link
          href={href}
          className="ml-auto flex min-h-11 items-center text-xs font-medium text-pref-accent pc:hidden"
        >
          会見を見る →
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 flex-col pc:gap-1">
        {topics.map((topic, i) => (
          <Link
            key={topic.id}
            href={href}
            className="flex min-h-11 items-center gap-2.5 border-t border-pref-divider text-sm text-mirai-text hover:text-pref-accent pc:min-h-0 pc:border-t-0 pc:text-[15px] pc:leading-7"
          >
            <span className="shrink-0 font-bold text-pref-accent">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{topic.title}</span>
          </Link>
        ))}
      </div>

      <Link
        href={href}
        className="hidden shrink-0 text-[13px] font-medium whitespace-nowrap text-pref-accent pc:block pc:leading-7"
      >
        会見を見る →
      </Link>
    </div>
  );
}
