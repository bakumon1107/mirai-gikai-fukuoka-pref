import type {
  DateRange,
  SessionMilestones,
} from "@/features/council-sessions/shared/types";
import { extractSessionLabel } from "./format-hero-date";

/** 2つの範囲を繋ぐ。片方が無ければもう片方をそのまま返す */
function mergeRanges(
  a: DateRange | null,
  b: DateRange | null
): DateRange | null {
  if (!a) return b;
  if (!b) return a;

  return {
    from: a.from <= b.from ? a.from : b.from,
    to: a.to >= b.to ? a.to : b.to,
  };
}

/**
 * 会期中ヒーロー（設計書 5.3.2 節 段階2 / 5.3.3 節）で使う算出。
 *
 * 進み具合は `start_date` / `end_date` だけで出せる。日程表そのものは
 * DBに持っていないため、「会期の流れ」の中間ステップ（代表質問・委員会・
 * 議案採決）はここでは組み立てられない。開会・閉会の2行に限る。
 */

/** 会期の進み具合 */
export type SessionProgress = {
  /** 何日目か。両端を含めて数える（開会日が1日目） */
  dayNumber: number;
  /** 会期の全日数。両端を含む */
  totalDays: number;
  /** バーの塗り幅（0〜100） */
  percent: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" を UTC の epoch ミリ秒に。時差の影響を受けない */
function toUtcMs(isoDate: string): number | null {
  const match = isoDate.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, y, m, d] = match;
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

/** 両端を含む日数。同じ日なら1 */
function inclusiveDays(fromMs: number, toMs: number): number {
  return Math.floor((toMs - fromMs) / MS_PER_DAY) + 1;
}

/**
 * 会期の進み具合を出す（設計書 5.3.3 節）。
 *
 * 令和8年9月定例会（9/9〜10/16）なら全38日で、9/24 は16日目。
 *
 * `end_date` が無い会期は全日数が決まらないため null を返し、
 * 呼び出し側はバーごと出さない（設計書 7章）。
 * 基準日が会期の外でも 1〜totalDays に丸めて返す。バーが
 * はみ出したり負になったりしないようにするため。
 */
export function calcSessionProgress(
  startDate: string,
  endDate: string | null,
  today: string
): SessionProgress | null {
  if (!endDate) return null;

  const start = toUtcMs(startDate);
  const end = toUtcMs(endDate);
  const now = toUtcMs(today);
  if (start === null || end === null || now === null) return null;
  if (end < start) return null;

  const totalDays = inclusiveDays(start, end);
  const rawDay = inclusiveDays(start, now);
  const dayNumber = Math.min(Math.max(rawDay, 1), totalDays);

  return {
    dayNumber,
    totalDays,
    percent: Math.round((dayNumber / totalDays) * 100),
  };
}

/** 会期の流れの1ステップ */
export type SessionStep = {
  /** 表示する日付。"9月9日" */
  date: string;
  label: string;
  status: "done" | "current" | "upcoming";
};

/** "2026-09-09" → "9月9日" */
export function formatStepDate(isoDate: string): string {
  const match = isoDate.slice(0, 10).match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;

  return `${Number(match[1])}月${Number(match[2])}日`;
}

/** 期間を「9月15日〜17日」の形にする。同じ月なら月を繰り返さない */
function formatStepRange(range: DateRange): string {
  const from = formatStepDate(range.from);
  if (range.from === range.to) return from;

  const sameMonth = range.from.slice(0, 7) === range.to.slice(0, 7);
  const to = sameMonth
    ? `${Number(range.to.slice(8, 10))}日`
    : formatStepDate(range.to);
  return `${from}〜${to}`;
}

/** 期間に対する状態。終わっていれば done、含んでいれば current */
function rangeStatus(range: DateRange, now: number): SessionStep["status"] {
  const from = toUtcMs(range.from);
  const to = toUtcMs(range.to);
  if (from === null || to === null) return "upcoming";

  if (now > to) return "done";
  if (now >= from) return "current";
  return "upcoming";
}

/**
 * 「会期の流れ」を組み立てる（設計書 5.3.3 節）。
 *
 * **採決日と閉会日は別の行にする。** 令和8年9月定例会は採決 10月1日の
 * あとに決算特別委員会が続き、閉会は 10月16日。参照デザインは
 * 「10月16日 採決・閉会」と1行にまとめているが、それでは議案が
 * いつ決まったかを誤って伝える。同じ日になる会期（令和7年12月定例会）
 * もあるため、重なったときだけ1行に畳む。
 *
 * 節目が取れていない行は出さない（設計書 7章）。`milestones` が
 * null なら開会・閉会の2行に退化する。
 */
export function buildSessionSteps(
  startDate: string,
  endDate: string | null,
  today: string,
  milestones?: SessionMilestones | null
): SessionStep[] {
  const start = toUtcMs(startDate);
  const now = toUtcMs(today);
  if (start === null || now === null) return [];

  const steps: SessionStep[] = [
    {
      date: formatStepDate(startDate),
      label: "開会・議案の説明",
      status: now > start ? "done" : "current",
    },
  ];

  // 代表質問と一般質問は続けて行われるので1行にまとめる
  const questions = mergeRanges(
    milestones?.representativeQuestions ?? null,
    milestones?.generalQuestions ?? null
  );
  if (questions) {
    steps.push({
      date: formatStepRange(questions),
      label: "代表質問・一般質問",
      status: rangeStatus(questions, now),
    });
  }

  if (milestones?.standingCommittees) {
    steps.push({
      date: formatStepRange(milestones.standingCommittees),
      label: "委員会でくわしく審査",
      status: rangeStatus(milestones.standingCommittees, now),
    });
  }

  const voteDate = milestones?.billVote ?? null;
  const voteIsClosingDay = voteDate !== null && voteDate === endDate;

  if (voteDate && !voteIsClosingDay) {
    const vote = toUtcMs(voteDate);
    steps.push({
      date: formatStepDate(voteDate),
      label: "議案の採決",
      status: vote !== null && now >= vote ? "done" : "upcoming",
    });
  }

  if (endDate) {
    const end = toUtcMs(endDate);
    if (end !== null) {
      steps.push({
        date: formatStepDate(endDate),
        // 採決と閉会が同じ日の会期はまとめて示す
        label: voteIsClosingDay ? "議案の採決・閉会" : "閉会",
        status: now >= end ? "done" : "upcoming",
      });
    }
  }

  return steps;
}

/**
 * 会期中ヒーローの説明文の2文目。どの会期かを示す。
 *
 * "令和8年 9月定例会" → "いまは9月定例会。"
 * 会期名から種別が取れなければ文ごと出さない。月から組み立てると
 * 臨時会のときに「8月定例会」という誤った文言になるため
 * {@link extractSessionLabel} を通す（設計書 5.3.2 節）。
 */
export function buildInSessionLead(sessionName: string): string | null {
  const label = extractSessionLabel(sessionName);
  return label ? `いまは${label}。` : null;
}

/**
 * 会期を表すピルの文言。"9月9日〜10月16日"
 *
 * 閉会日が無ければ "9月9日から"。
 */
export function formatSessionRange(
  startDate: string,
  endDate: string | null
): string {
  const start = formatStepDate(startDate);
  return endDate ? `${start}〜${formatStepDate(endDate)}` : `${start}から`;
}
