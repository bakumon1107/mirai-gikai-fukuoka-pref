import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { CouncilSession } from "../../shared/types";
import { parseSessionMilestones } from "../../shared/utils/parse-session-milestones";

/** DBの行（schedule_milestones は jsonb）を CouncilSession に落とす */
type CouncilSessionRow = Omit<CouncilSession, "schedule_milestones"> & {
  schedule_milestones: unknown;
};

function toCouncilSession(
  row: CouncilSessionRow | null
): CouncilSession | null {
  if (!row) return null;

  return {
    ...row,
    schedule_milestones: parseSessionMilestones(row.schedule_milestones),
  };
}

function toCouncilSessions(rows: CouncilSessionRow[]): CouncilSession[] {
  return rows.map((row) => ({
    ...row,
    schedule_milestones: parseSessionMilestones(row.schedule_milestones),
  }));
}

/**
 * アクティブな定例会を取得
 */
export async function findActiveCouncilSession(): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch active council session:", error);
    return null;
  }

  return toCouncilSession(data);
}

/**
 * 指定日時点で開催中の定例会を取得
 */
export async function findCurrentCouncilSession(
  targetDate: string
): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .lte("start_date", targetDate)
    .or(`end_date.gte.${targetDate},end_date.is.null`)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch current council session:", error);
    return null;
  }

  return toCouncilSession(data);
}

/**
 * 全定例会を新しい順に取得（アクティブなものを除く、公開済み議案が1件以上あるもののみ）
 */
export async function findAllPastCouncilSessions(): Promise<CouncilSession[]> {
  const supabase = createAdminClient();

  // bills テーブルから published な議案がある会期IDを取得
  const { data: billData, error: billError } = await supabase
    .from("bills")
    .select("council_session_id")
    .eq("publish_status", "published");

  if (billError) {
    console.error("Failed to fetch published bills:", billError);
    return [];
  }

  const sessionIds = [
    ...new Set(
      (billData ?? [])
        .map((b) => b.council_session_id)
        .filter((id): id is string => id !== null)
    ),
  ];

  if (sessionIds.length === 0) {
    return [];
  }

  // **is_active では絞らない。** このフラグは運用で手動更新するもので、
  // 実際の会期とずれる（令和8年9月定例会が開会中なのに6月のまま、など）。
  // ずれていると、議案が公開済みの会期が一覧から丸ごと消える。
  // 会期が終わったかどうかは start_date の並びで十分に伝わる
  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .in("id", sessionIds)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Failed to fetch past council sessions:", error);
    return [];
  }

  return toCouncilSessions(data ?? []);
}

/**
 * 指定日より前の直近の定例会を取得
 */
export async function findPreviousCouncilSession(
  beforeStartDate: string
): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .lt("start_date", beforeStartDate)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch previous council session:", error);
    return null;
  }

  return toCouncilSession(data);
}

/**
 * 指定年に開会した会期をすべて取得（設計書 5.5 節）。
 *
 * `findAllPastCouncilSessions()` は「published な議案を1件以上持つ会期」に
 * 絞るため、一般質問はあるが議案未投入の会期が落ちる。
 * 定例会の帯は年4枠を必ず描くので、絞り込みのない本関数を使う。
 *
 * 臨時会も含まれる。定例会だけに絞る処理は
 * `resolveSessionSlots()`（shared/utils）側で行う。
 */
export async function findCouncilSessionsByYear(
  year: number
): Promise<CouncilSession[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .gte("start_date", `${year}-01-01`)
    .lte("start_date", `${year}-12-31`)
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Failed to fetch council sessions by year:", error);
    return [];
  }

  return toCouncilSessions(data ?? []);
}

/**
 * IDで定例会を取得
 */
export async function findCouncilSessionById(
  id: string
): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch council session by id:", error);
    return null;
  }

  return toCouncilSession(data);
}
