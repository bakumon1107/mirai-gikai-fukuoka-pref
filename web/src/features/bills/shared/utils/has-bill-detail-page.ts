import type { BillPublishStatus } from "../types";

/**
 * 議案の詳細ページが存在するか。
 *
 * 詳細ページは `publish_status = 'published'` の議案しか引かないため、
 * `coming_soon`（議案名だけで本文が未掲載）へリンクすると404になる。
 * 一覧に並べる側は、リンクを張るかどうかをこれで決める。
 *
 * **一覧は3種類ある**（注目の議案・タグ別・全議案）。どれか1つで
 * 対処しても、他から404へ飛べてしまう。
 */
export function hasBillDetailPage(publishStatus: BillPublishStatus): boolean {
  return publishStatus === "published";
}
