import "server-only";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import { isRegularSession } from "@/features/council-sessions/shared/utils/resolve-session-slot-status";
import type {
  PressConferenceRef,
  PressConferenceSummary,
} from "@/features/press-conferences/shared/types";
import {
  formatCurrentSessionPill,
  formatNextSessionPill,
} from "../../shared/utils/format-hero-date";
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
 * 旧トップの Hero（背景画像 + Scroll）と「本日は 開会中/閉会中」の表示を
 * 置き換えたもの。旧コンポーネントは PR7 で削除済み。
 *
 * 会期中モードは段階1（文言差し替え）まで。レイアウトは閉会中と共通で、
 * ヒーローを定例会に差し替える段階2は後続PRで対応する（設計書 5.3.2 節）。
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

  // 会期中は「◯月定例会 ◯月◯日まで」、閉会中は「次の定例会 ◯月◯日から」。
  // どちらも日付が取れなければピルごと出さない（設計書 7章）
  const currentPill = currentSession
    ? formatCurrentSessionPill(currentSession.name, currentSession.end_date)
    : null;
  const nextSessionLabel = formatNextSessionPill(
    nextSession?.start_date ?? null
  );

  return (
    <section className="mx-4 mt-2 rounded-[28px] bg-pref-hero p-6 pc:mx-16 pc:rounded-[36px] pc:p-11">
      <div className="grid gap-8 pc:grid-cols-2 pc:items-center pc:gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {isInSession ? (
              // 会期中は塗りピルで強調する（設計書 5.3.2節 段階1）
              <span className="rounded-full bg-pref-pill-bg px-3.5 py-1.5 text-xs font-bold text-pref-pill-text">
                {statusLabel}
              </span>
            ) : (
              <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-pref-accent-hover">
                {statusLabel}
              </span>
            )}

            {/* 日程が取れないときはピルごと出さない（設計書 7章） */}
            {isInSession
              ? currentPill && (
                  <span className="rounded-full bg-mirai-surface-warm px-3.5 py-1.5 text-xs font-medium text-pref-beige-text">
                    {/* スマホは幅が足りないので日付だけにする */}
                    <span className="pc:hidden">{currentPill.short}</span>
                    <span className="hidden pc:inline">{currentPill.full}</span>
                  </span>
                )
              : nextSessionLabel && (
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
