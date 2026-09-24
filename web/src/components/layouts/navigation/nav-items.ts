/**
 * グローバルナビの項目定義（設計書 5.1 / 5.2 節）。
 *
 * PC の横並びナビとスマホのボトムナビで項目が異なるのは**意図的**。
 * スマホは5枠に収める必要があるため、議案と質問を「定例会」に畳んでいる。
 */

export type NavItem = {
  href: string;
  label: string;
};

/** PC の横並びナビ（6項目） */
export const PC_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ホーム" },
  // 「代表質問・一般質問」はピルに長すぎるため短縮する（設計書 5.7 節）
  { href: "/questions", label: "質問" },
  { href: "/committees", label: "委員会" },
  // 議案一覧の専用ルートが無いため定例会一覧を入口にする
  { href: "/sessions", label: "議案" },
  { href: "/press-conferences", label: "知事会見" },
  { href: "/budget", label: "予算" },
];

/** スマホのボトムナビ（5枠）。アイコン名は lucide-react のコンポーネント名 */
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
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
