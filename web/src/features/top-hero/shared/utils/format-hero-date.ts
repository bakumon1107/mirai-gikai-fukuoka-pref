/**
 * トップのヒーロー・会見カードで使う日付整形（設計書 5.3 / 5.4 節）。
 *
 * 実行環境のタイムゾーンに依存しないよう、日付文字列を直接分解して扱う。
 * `new Date("2026-09-02")` は UTC 解釈されるため、JST で日付がずれる。
 */

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

type Ymd = { year: number; month: number; day: number };

/** "2026-09-02" または "2026-09-02T..." から年月日を取り出す */
function parseYmd(isoDate: string): Ymd | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function weekdayOf({ year, month, day }: Ymd): string {
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/**
 * 会見カードの見出し用。
 *
 * "2026-09-02" → "9月2日（水）の会見"
 * 年は付けない。トップに出るのは直近の会見なので年は自明で、
 * 付けると見出しが間延びする。
 */
export function formatConferenceHeading(isoDate: string): string {
  const ymd = parseYmd(isoDate);
  if (!ymd) return isoDate;
  return `${ymd.month}月${ymd.day}日（${weekdayOf(ymd)}）の会見`;
}

/**
 * 「これまでの会見」の日付チップ用。
 *
 * "2026-08-21" → "8月21日"
 */
export function formatShortDate(isoDate: string): string {
  const ymd = parseYmd(isoDate);
  if (!ymd) return isoDate;
  return `${ymd.month}月${ymd.day}日`;
}

/**
 * 「次の定例会」ピル用。
 *
 * "2026-12-01" → "次の定例会 12月1日から"
 * 日付が取れなければ null を返し、呼び出し側でピルごと非表示にする
 * （設計書 7章のフォールバック方針）。
 */
export function formatNextSessionPill(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const ymd = parseYmd(isoDate);
  if (!ymd) return null;
  return `次の定例会 ${ymd.month}月${ymd.day}日から`;
}
