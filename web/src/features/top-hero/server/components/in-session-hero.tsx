import "server-only";
import Link from "next/link";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import {
  buildInSessionHeadline,
  buildInSessionLead,
  buildSessionSteps,
  calcSessionProgress,
  formatSessionRange,
} from "../../shared/utils/session-progress";
import type { InSessionCounts } from "../loaders/load-top-hero-data";

type Props = {
  session: CouncilSession;
  /** 基準日（"YYYY-MM-DD"）。進み具合とステップの判定に使う */
  today: string;
  counts: InSessionCounts | null;
  /** ピルの文言。定例会か臨時会かで変わる */
  statusLabel: string;
};

/** 状態ごとのタグ。進行中だけ強調する */
const STEP_TAGS = {
  done: "おわった",
  current: "いまここ",
  upcoming: null,
} as const;

/**
 * 会期中のヒーロー（設計書 5.3.2 節 段階2）。
 *
 * 会期中は定例会が主役になり、知事会見はヒーロー直下の1行帯に降りる。
 * セクションの優先順位そのものが閉会中と入れ替わる。
 *
 * **「会期の流れ」は開会・閉会の2行だけ。** 代表質問・委員会・議案採決の
 * 日程は会期日程ページにしか無く、DBに入れていないため出せない
 * （設計書 5.3.3 節）。パーサーを拡張したら中間ステップを足す。
 */
export function InSessionHero({ session, today, counts, statusLabel }: Props) {
  const progress = calcSessionProgress(
    session.start_date,
    session.end_date,
    today
  );
  const steps = buildSessionSteps(session.start_date, session.end_date, today);
  const lead = buildInSessionLead(session.name) ?? "";
  const billsHref = session.slug ? `/sessions/${session.slug}/bills` : null;
  const questionsHref = session.slug
    ? `/sessions/${session.slug}/questions`
    : null;

  return (
    <section className="mx-4 mt-2 rounded-[28px] bg-pref-hero p-6 pc:mx-16 pc:rounded-[36px] pc:p-11">
      <div className="grid gap-8 pc:grid-cols-2 pc:gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-pref-pill-bg px-3.5 py-1.5 text-xs font-bold text-pref-pill-text">
              {statusLabel}
            </span>
            <span className="rounded-full bg-mirai-surface-warm px-3.5 py-1.5 text-xs font-medium text-pref-beige-text">
              {formatSessionRange(session.start_date, session.end_date)}
            </span>
          </div>

          <h1 className="font-rounded text-[26px] font-bold leading-[1.45] text-mirai-text pc:text-[42px] pc:leading-[1.4]">
            {buildInSessionHeadline()}
          </h1>

          {/*
            1文目はサイトの説明。会期中はヒーローが定例会に、知事会見が
            1行帯に降りるため、ここが無いと初見の人に何のサイトか伝わらない
            （デザイン v4）
          */}
          <p className="text-sm leading-relaxed text-mirai-text-secondary pc:text-base">
            県議会で話されていることを、やさしく読めるサイトです。
            <br className="hidden pc:inline" />
            {lead}補正予算や条例は、この期間に採決されます。
          </p>

          {/* 閉会日が取れないと全日数が出ないのでバーごと出さない（設計書 7章） */}
          {progress && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="font-rounded text-lg font-bold text-pref-accent-deep">
                  {progress.dayNumber}日目
                </span>
                <span className="text-xs text-mirai-text-secondary">
                  全{progress.totalDays}日
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-white"
                role="progressbar"
                aria-valuenow={progress.dayNumber}
                aria-valuemin={1}
                aria-valuemax={progress.totalDays}
                aria-label={`会期の進み具合 全${progress.totalDays}日中${progress.dayNumber}日目`}
              >
                <div
                  className="h-full rounded-full bg-pref-accent"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          {steps.length > 0 && (
            <div className="rounded-[22px] bg-white p-5">
              <h2 className="font-rounded text-base font-bold text-mirai-text">
                会期の流れ
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {steps.map((step) => (
                  <li
                    key={step.label}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
                      step.status === "current" ? "bg-pref-surface-tint" : ""
                    }`}
                  >
                    <span className="w-[4.5rem] shrink-0 text-xs font-medium text-mirai-text-secondary">
                      {step.date}
                    </span>
                    <span className="flex-1 text-sm text-mirai-text">
                      {step.label}
                    </span>
                    {STEP_TAGS[step.status] && (
                      <span className="shrink-0 rounded-full bg-mirai-surface-warm px-2.5 py-0.5 text-[11px] whitespace-nowrap text-pref-beige-text">
                        {STEP_TAGS[step.status]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 0件のタイルは出さない（設計書 5.3.2 節 段階2） */}
          <div className="grid gap-3 md:grid-cols-2">
            {billsHref && counts && counts.deliberatingBills > 0 && (
              <Link
                href={billsHref}
                className="flex flex-col gap-1 rounded-[22px] bg-white p-4 hover:bg-pref-surface-tint"
              >
                <span className="text-xs font-medium text-pref-accent">
                  今回の議案
                </span>
                <span className="font-rounded text-base font-bold text-mirai-text">
                  {counts.deliberatingBills}件を審議中
                </span>
              </Link>
            )}

            {questionsHref && counts && counts.questioners > 0 && (
              <Link
                href={questionsHref}
                className="flex flex-col gap-1 rounded-[22px] bg-white p-4 hover:bg-pref-surface-tint"
              >
                <span className="text-xs font-medium text-pref-accent">
                  一般質問
                </span>
                <span className="font-rounded text-base font-bold text-mirai-text">
                  {counts.questioners}人が質問
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
