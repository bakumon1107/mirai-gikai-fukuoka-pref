import "server-only";
import { createAdminClient } from "@mirai-gikai/supabase";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import type {
  BudgetOverview,
  BudgetOverviewWithThemes,
} from "../../shared/types";

/**
 * 公開済み予算概要が存在する全会期を新しい順に取得
 */
export async function findAllSessionsWithBudget(): Promise<CouncilSession[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("budget_overviews")
    .select("council_session_id, council_sessions!inner(*)")
    .eq("publish_status", "published")
    .eq("council_sessions.is_active", false);

  if (error) {
    console.error("Failed to fetch sessions with budget:", error);
    return [];
  }

  const seen = new Set<string>();
  const sessions: CouncilSession[] = [];
  for (const row of data ?? []) {
    const session = row.council_sessions as CouncilSession;
    if (session && !seen.has(session.id)) {
      seen.add(session.id);
      sessions.push(session);
    }
  }

  return sessions.sort(
    (a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );
}

/**
 * 会期IDに紐づく公開済み予算概要一覧を取得
 */
export async function findPublishedOverviewsBySession(
  councilSessionId: string
): Promise<BudgetOverview[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("budget_overviews")
    .select("*")
    .eq("council_session_id", councilSessionId)
    .eq("publish_status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch budget overviews: ${error.message}`);
  }

  return data ?? [];
}

/**
 * 会期IDに紐づく公開済み予算概要が存在するか確認
 */
export async function hasPublishedOverviewsBySession(
  councilSessionId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("budget_overviews")
    .select("id", { count: "exact", head: true })
    .eq("council_session_id", councilSessionId)
    .eq("publish_status", "published");

  if (error) {
    console.error(
      `Failed to check budget overviews existence: ${error.message}`
    );
    return false;
  }

  return (count ?? 0) > 0;
}

/**
 * 会期IDに紐づく公開済み予算概要をテーマ付きで全件取得
 */
export async function findPublishedOverviewsWithThemesBySession(
  councilSessionId: string
): Promise<BudgetOverviewWithThemes[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("budget_overviews")
    .select(
      `
      *,
      budget_themes (
        *,
        budget_initiatives (*)
      )
    `
    )
    .eq("council_session_id", councilSessionId)
    .eq("publish_status", "published")
    .order("sort_order", { ascending: true })
    .order("sort_order", {
      referencedTable: "budget_themes",
      ascending: true,
    })
    .order("sort_order", {
      referencedTable: "budget_themes.budget_initiatives",
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Failed to fetch budget overviews with themes: ${error.message}`
    );
  }

  return (data ?? []).map((row) => ({
    ...row,
    themes: (row.budget_themes ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((theme) => ({
        ...theme,
        initiatives: (theme.budget_initiatives ?? []).sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      })),
  })) as BudgetOverviewWithThemes[];
}

/**
 * 会期ID + department_slug で公開済み予算概要を1件取得（テーマ・施策含む）
 */
export async function findPublishedOverviewBySlug(
  councilSessionId: string,
  departmentSlug: string
): Promise<BudgetOverviewWithThemes | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("budget_overviews")
    .select(
      `
      *,
      budget_themes (
        *,
        budget_initiatives (*)
      )
    `
    )
    .eq("council_session_id", councilSessionId)
    .eq("department_slug", departmentSlug)
    .eq("publish_status", "published")
    .order("sort_order", {
      referencedTable: "budget_themes",
      ascending: true,
    })
    .order("sort_order", {
      referencedTable: "budget_themes.budget_initiatives",
      ascending: true,
    })
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch budget overview detail: ${error.message}`);
  }

  if (!data) return null;

  // Sort themes and their initiatives
  const themes = (data.budget_themes ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((theme) => ({
      ...theme,
      initiatives: (theme.budget_initiatives ?? []).sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    }));

  return {
    ...data,
    themes,
  } as BudgetOverviewWithThemes;
}
