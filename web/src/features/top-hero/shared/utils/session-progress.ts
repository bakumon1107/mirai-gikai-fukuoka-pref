import { extractSessionLabel } from "./format-hero-date";

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

/**
 * 「会期の流れ」を組み立てる（設計書 5.3.3 節）。
 *
 * **開会と閉会の2行だけ。** 中間の3ステップ（代表質問・委員会・議案採決）は
 * 日程表がDBに無いため出せない。設計書の指示どおり行ごと非表示にする。
 *
 * **採決日は閉会日と別の日**（令和8年9月定例会なら採決 10月1日・閉会 10月16日）。
 * 採決日が取れない以上、閉会の行に「採決」を含めてはいけない。
 * パーサーを拡張して採決日を取れるようにしたら、独立した行として足すこと。
 */
export function buildSessionSteps(
  startDate: string,
  endDate: string | null,
  today: string
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

  if (endDate) {
    const end = toUtcMs(endDate);
    if (end !== null) {
      steps.push({
        date: formatStepDate(endDate),
        label: "閉会",
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
