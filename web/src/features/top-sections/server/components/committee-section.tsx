import "server-only";
import Link from "next/link";
import type { CommitteeMeetingSummary } from "@/features/committee-minutes/shared/types";
import { formatJapaneseDate } from "@/features/committee-minutes/shared/utils/format-japanese-date";

type Props = {
  meetings: CommitteeMeetingSummary[];
  /** 会期中は補足文を差し替える（設計書 5.3.2 節 段階1） */
  isInSession: boolean;
};

/** 要約の表示上限（全角）。AI生成の summary_short が入るまでの切り詰め */
const SUMMARY_MAX = 90;

function truncate(text: string, max: number): string {
  return [...text].length <= max
    ? text
    : `${[...text].slice(0, max).join("")}…`;
}

/**
 * 委員会の最新の話し合い（設計書 5.6 節）。
 *
 * 見出し・要約は AI生成項目（headline_question / summary_short）が
 * 未整備のため、議題タイトルと会議要約の切り詰めで代替する（設計書 7章）。
 * 数字チップ（highlight）はデータが無いため出さない。
 */
export function CommitteeSection({ meetings, isInSession }: Props) {
  if (meetings.length === 0) return null;

  return (
    <section className="mx-4 mt-10 pc:mx-16 pc:mt-12">
      <div className="flex flex-col gap-1 pc:flex-row pc:items-baseline pc:justify-between">
        <h2 className="font-rounded text-xl font-bold text-mirai-text pc:text-2xl">
          委員会の最新の話し合い
        </h2>
        <p className="text-xs text-mirai-text-secondary pc:text-sm">
          {isInSession
            ? "定例会のあいだは、議案を委員会でくわしく審査します"
            : "閉会中も、テーマごとに話し合いが続いています"}
        </p>
      </div>

      <ul className="mt-4 grid gap-3.5 pc:grid-cols-2">
        {meetings.map((meeting) => {
          const headline = meeting.topics[0]?.title ?? meeting.title;
          const summary = meeting.summary
            ? truncate(meeting.summary, SUMMARY_MAX)
            : null;
          const detailHref = `/committees/${meeting.committeeSlug}/${meeting.sourceDocumentId}`;

          return (
            <li key={meeting.id}>
              <Link
                href={detailHref}
                className="flex h-full flex-col gap-2.5 rounded-[22px] bg-white p-5 hover:bg-pref-surface-tint"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold text-mirai-text">
                    {meeting.committeeName}
                  </span>
                  <span className="text-xs whitespace-nowrap text-mirai-text-secondary">
                    {formatJapaneseDate(meeting.meetingDate)}
                  </span>
                </div>

                <span className="font-rounded text-base font-bold leading-relaxed text-mirai-text">
                  {headline}
                </span>

                {summary && (
                  <span className="text-sm leading-relaxed text-mirai-text-secondary">
                    {summary}
                  </span>
                )}

                <span className="mt-auto text-xs font-medium text-pref-accent">
                  発言のやり取りを読む
                  {meeting.speechCount !== null &&
                    `（${meeting.speechCount}発言）`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-3.5 flex justify-end">
        <Link
          href="/committees"
          className="text-sm font-medium text-pref-accent hover:text-pref-accent-hover"
        >
          委員会をぜんぶ見る
        </Link>
      </div>
    </section>
  );
}
