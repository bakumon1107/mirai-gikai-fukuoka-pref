import "server-only";
import Link from "next/link";
import type { SessionSlot } from "@/features/council-sessions/shared/utils/resolve-session-slot-status";
import { cn } from "@/lib/utils";

type Props = {
  slots: SessionSlot[];
};

/** 状態ごとのタグ文言 */
const STATUS_LABELS = {
  finished: "おわった",
  in_session: "いま開会中",
  next: "つぎはここ",
  upcoming: "これから",
} as const;

/** "2026-10-16" → "10月16日" */
function formatMonthDay(isoDate: string): string {
  const match = isoDate.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (!match) return isoDate;
  return `${Number(match[1])}月${Number(match[2])}日`;
}

/**
 * 定例会の帯（設計書 5.5 節）。
 *
 * 当年の定例会4回を並べる。**強調枠は常に1つだけ**になるよう、
 * 状態算出は resolveSessionSlots() 側で保証している。
 */
export function SessionBand({ slots }: Props) {
  return (
    <section className="mx-4 mt-10 rounded-[28px] bg-white p-5 pc:mx-16 pc:mt-12 pc:rounded-[32px] pc:p-9">
      <div className="flex flex-col gap-1 pc:flex-row pc:items-baseline pc:justify-between pc:gap-6">
        <h2 className="font-rounded text-xl font-bold text-mirai-text pc:text-2xl">
          定例会は年4回。議会の本番です
        </h2>
        <p className="text-xs text-mirai-text-secondary pc:text-sm">
          議案の採決と一般質問は定例会で。あいだの期間は委員会が開かれます。
        </p>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3 pc:mt-5 pc:grid-cols-4 pc:gap-3.5">
        {slots.map((slot) => {
          const isHighlighted =
            slot.status === "in_session" || slot.status === "next";
          return (
            <li
              key={slot.month}
              className={cn(
                "flex flex-col gap-2 rounded-[22px] p-4",
                isHighlighted
                  ? "border-2 border-pref-accent bg-pref-surface-tint"
                  : "bg-pref-surface-sub"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-rounded text-xl font-bold text-mirai-text">
                  {slot.month}月
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] whitespace-nowrap",
                    isHighlighted
                      ? "bg-pref-pill-bg text-pref-pill-text font-medium"
                      : "bg-mirai-surface-warm text-pref-beige-text"
                  )}
                >
                  {STATUS_LABELS[slot.status]}
                </span>
              </div>

              <span className="text-xs text-mirai-text-secondary">
                {slot.description}
              </span>

              <SlotLink slot={slot} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * カード下部のリンク・補足。
 *
 * 日程が無い回（公式に未掲載）は何も出さない（設計書 7章）。
 */
function SlotLink({ slot }: { slot: SessionSlot }) {
  const { session, status } = slot;
  if (!session) return null;

  if (status === "finished") {
    return (
      <Link
        href={`/sessions/${session.slug ?? ""}/bills`}
        className="mt-auto text-xs font-medium text-pref-accent hover:text-pref-accent-hover"
      >
        議案・一般質問を見る
      </Link>
    );
  }

  if (status === "in_session" && session.end_date) {
    return (
      <span className="mt-auto text-xs font-medium text-pref-pill-text">
        {formatMonthDay(session.end_date)}まで
      </span>
    );
  }

  if (status === "next") {
    return (
      <span className="mt-auto text-xs font-medium text-pref-pill-text">
        {formatMonthDay(session.start_date)}から
      </span>
    );
  }

  return null;
}
