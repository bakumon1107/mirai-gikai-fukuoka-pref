/**
 * ページレイアウトに関するユーティリティ
 *
 * TOPページと議案詳細ページは「メインページ」として扱い、
 * - DifficultySelectorを表示
 * - チャットサイドバー用のオフセットレイアウトを使用
 */

/** メインページ（TOP、議案詳細、予算概要、事務事業評価）かどうかを判定 */
export function isMainPage(pathname: string): boolean {
  // トップページ
  if (pathname === "/") return true;
  // 議案詳細ページ（/bills/[id]）- サブパスは除外
  if (/\/bills\/[^/]+$/.test(pathname)) return true;
  // 予算概要ページ（/budget/...）
  if (pathname.startsWith("/budget/")) return true;
  // 事務事業評価（/jimu-jigyo/...）- 難易度切替で概要/詳しく表示を切り替える
  if (pathname.startsWith("/jimu-jigyo")) return true;
  return false;
}

/**
 * 幅広レイアウトのページかどうかを判定。
 * MainLayout の max-w-[700px] を外し、カード一覧やグラフを
 * PC幅いっぱい（ヘッダと同じ max-w-[1440px]）で表示する。
 */
export function isWidePage(pathname: string): boolean {
  // トップページは刷新でPC全幅レイアウトになった（設計書 4.2節）
  if (pathname === "/") return true;
  return pathname.startsWith("/jimu-jigyo");
}

/** インタビューチャットページかどうかを判定 */
export function isInterviewPage(pathname: string): boolean {
  // /bills/[id]/interview/chat
  return /\/bills\/[^/]+\/interview\/chat$/.test(pathname);
}

/** インタビューセクション（LP・チャット含む）かどうかを判定 */
export function isInterviewSection(pathname: string): boolean {
  // /bills/[id]/interview 以下すべて
  return /\/bills\/[^/]+\/interview(\/|$)/.test(pathname);
}

/** インタビューページからbillIdを抽出 */
export function extractBillIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/bills\/([^/]+)/);
  return match ? match[1] : null;
}
