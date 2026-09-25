import "server-only";
import Link from "next/link";
import type {
  PressConference,
  PressConferenceRef,
} from "@/features/press-conferences/shared/types";
import {
  formatConferenceHeading,
  formatShortDate,
} from "../../shared/utils/format-hero-date";

/** 話題の表示上限（設計書 5.4 節） */
const MAX_TOPICS = 4;

/** 日付チップの表示上限 */
const MAX_RECENT = 3;

type Props = {
  conference: PressConference;
  /** 「これまでの会見」に出す過去分（最新1件を除いたもの） */
  recent: PressConferenceRef[];
};

/**
 * ヒーロー右の知事会見カード（設計書 5.4 節）。
 *
 * 話題の文言は AI生成の headline_short を想定しているが未整備のため、
 * 当面は press_conference_items.title をそのまま出す（設計書 7章）。
 */
export function PressConferenceCard({ conference, recent }: Props) {
  const topics = [...conference.items]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .slice(0, MAX_TOPICS);

  const detailHref = `/press-conferences/${conference.slug}`;

  return (
    <div className="flex flex-col gap-1 rounded-[28px] bg-white p-6">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-pref-pill-bg px-3 py-1 text-xs font-medium text-pref-pill-text">
          知事会見
        </span>
        <span className="font-rounded text-base font-bold text-mirai-text">
          {formatConferenceHeading(conference.heldAt)}
        </span>
        <span className="ml-auto rounded-full bg-mirai-surface-warm px-2.5 py-0.5 text-xs font-medium text-pref-beige-text">
          最新
        </span>
      </div>

      {topics.length > 0 && (
        <ol className="flex flex-col">
          {topics.map((topic, index) => (
            <li key={topic.id}>
              <Link
                href={`${detailHref}#item-${topic.id}`}
                className="flex gap-2.5 border-b border-pref-divider py-3 text-base leading-relaxed text-mirai-text last:border-b-0 hover:text-pref-accent"
              >
                <span
                  aria-hidden
                  className="font-bold text-pref-accent tabular-nums"
                >
                  {index + 1}
                </span>
                <span>{topic.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-pref-divider pt-3">
        {recent.length > 0 && (
          <>
            <span className="text-xs text-mirai-text-secondary">
              これまでの会見
            </span>
            {recent.slice(0, MAX_RECENT).map((ref) => (
              <Link
                key={ref.id}
                href={`/press-conferences/${ref.slug}`}
                className="rounded-full bg-pref-surface-tint px-2.5 py-1 text-xs text-mirai-text hover:bg-pref-pill-bg"
              >
                {formatShortDate(ref.heldAt)}
              </Link>
            ))}
          </>
        )}
        <Link
          href="/press-conferences"
          className="ml-auto text-sm font-medium text-pref-accent hover:text-pref-accent-hover"
        >
          ぜんぶ見る
        </Link>
      </div>
    </div>
  );
}
