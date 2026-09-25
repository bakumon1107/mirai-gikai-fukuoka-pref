/**
 * グローバルナビの項目定義（設計書 5.1 / 5.2 節）。
 *
 * PC の横並びナビとスマホのボトムナビで項目が異なるのは**意図的**。
 * スマホは5枠に収める必要があるため、議案と質問を「定例会」に畳んでいる。
 */

export type NavItem = {
  href: string;
  label: string;
  /**
   * `href` 以外に現在地とみなすパス。
   *
   * リダイレクトで別のURLへ着地する項目に使う。
   * 例: `/questions` は `/sessions/[slug]/questions` へ飛ぶため、
   * そのままでは「議案」（`/sessions`）が点灯してしまう。
   */
  alsoActiveOn?: RegExp;
  /**
   * `href` に前方一致しても現在地とみなさないパス。
   *
   * 配下の一部を別の項目が担当する場合に使う。
   * 例: `/sessions`（議案）は `/sessions/[slug]/questions` を「質問」に譲る。
   */
  excludes?: RegExp;
};

/** 一般質問の実体ページ（`/questions` はここへリダイレクトされる） */
const SESSION_QUESTIONS_RE = /^\/sessions\/[^/]+\/questions(\/|$)/;

/** PC の横並びナビ（6項目） */
export const PC_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ホーム" },
  // 「代表質問・一般質問」はピルに長すぎるため短縮する（設計書 5.7 節）
  // /questions は最新会期の質問ページへリダイレクトされるので、そちらも現在地にする
  { href: "/questions", label: "質問", alsoActiveOn: SESSION_QUESTIONS_RE },
  { href: "/committees", label: "委員会" },
  // 議案一覧の専用ルートが無いため定例会一覧を入口にする。
  // ただし配下の質問ページは「質問」の担当なので拾わない
  { href: "/sessions", label: "議案", excludes: SESSION_QUESTIONS_RE },
  { href: "/press-conferences", label: "知事会見" },
  { href: "/budget", label: "予算" },
];

/**
 * スマホのボトムナビ（5枠）。アイコン名は lucide-react のコンポーネント名。
 *
 * PC と違い「質問」の枠が無く、議案も質問も「定例会」に畳んでいるため
 * `/sessions` 配下はすべて「定例会」が現在地でよい（設計書 5.2 節）。
 */
export const MOBILE_NAV_ITEMS: (NavItem & { icon: MobileNavIcon })[] = [
  { href: "/", label: "ホーム", icon: "home" },
  { href: "/press-conferences", label: "会見", icon: "megaphone" },
  { href: "/committees", label: "委員会", icon: "users" },
  { href: "/sessions", label: "定例会", icon: "landmark" },
  { href: "/budget", label: "予算", icon: "coins" },
];

export type MobileNavIcon =
  | "home"
  | "megaphone"
  | "users"
  | "landmark"
  | "coins";

/**
 * ナビ項目が現在地かどうかを判定する。
 *
 * ルート（"/"）は完全一致でないと、あらゆるパスで現在地になってしまう。
 * それ以外は配下のページも現在地として扱う（例: /committees/foo でも「委員会」が現在地）。
 *
 * `alsoActiveOn` / `excludes` は、リンク先と実際の着地点がずれる項目のための調整。
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.alsoActiveOn?.test(pathname)) return true;
  if (item.excludes?.test(pathname)) return false;

  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
