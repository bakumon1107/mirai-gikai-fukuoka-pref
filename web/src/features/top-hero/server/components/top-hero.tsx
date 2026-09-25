import "server-only";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import { isRegularSession } from "@/features/council-sessions/shared/utils/resolve-session-slot-status";
import type {
  PressConferenceRef,
  PressConferenceSummary,
} from "@/features/press-conferences/shared/types";
import { formatNextSessionPill } from "../../shared/utils/format-hero-date";
import { PressConferenceCard } from "./press-conference-card";

type Props = {
  /** 開催中の会期。null なら閉会中 */
  currentSession: CouncilSession | null;
  /** 次に開会する定例会。日程未掲載なら null */
  nextSession: CouncilSession | null;
  latestConference: PressConferenceSummary | null;
  recentConferences: PressConferenceRef[];
};

/**
 * トップのヒーロー（設計書 5.3 節）。
 *
 * 現行の Hero（背景画像 + Scroll）と CurrentCouncilSession（「本日は 開会中/閉会中」）
 * を置き換える。
 *
 * **いまは閉会中モードのみ**。会期中モードは PR5（段階1）で追加する。
 * `currentSession` が非 null なら会期中と判定できるので、分岐点だけ用意しておく。
 */
export function TopHero({
  currentSession,
  nextSession,
  latestConference,
  recentConferences,
}: Props) {
  const isInSession = currentSession !== null;

  // 臨時会のときに「いま定例会中」と出さない。
  // getCurrentCouncilSession は会期名で絞らないため臨時会も返ってくる
  const statusLabel = !currentSession
    ? "いまは閉会中"
    : isRegularSession(currentSession)
      ? "いま定例会中"
      : "いま臨時会中";

  const nextSessionLabel = formatNextSessionPill(
    nextSession?.start_date ?? null
  );

  return (
    <section className="mx-4 mt-2 rounded-[28px] bg-pref-hero p-6 pc:mx-16 pc:rounded-[36px] pc:p-11">
      <div className="grid gap-8 pc:grid-cols-2 pc:items-center pc:gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-pref-accent-hover">
              {statusLabel}
            </span>
            {/* 日程が取れないときはピルごと出さない（設計書 7章） */}
            {nextSessionLabel && !isInSession && (
              <span className="rounded-full bg-mirai-surface-warm px-3.5 py-1.5 text-xs font-medium text-pref-beige-text">
                {nextSessionLabel}
              </span>
            )}
          </div>

          <h1 className="font-rounded text-[26px] font-bold leading-[1.45] text-mirai-text pc:text-[42px] pc:leading-[1.4]">
            福岡県、
            <br />
            いま何が話されてる？
          </h1>

          <p className="text-sm leading-relaxed text-mirai-text-secondary pc:text-base">
            知事の記者会見は、だいたい2週に1回。
            <br className="hidden pc:inline" />
            県がいま力を入れていることが、いちばん早くわかります。
          </p>
        </div>

        {latestConference && (
          <PressConferenceCard
            conference={latestConference}
            recent={recentConferences}
          />
        )}
      </div>
    </section>
  );
}
