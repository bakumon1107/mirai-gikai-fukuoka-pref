/**
 * 運営主体（政党）の有無に応じた文言を組み立てる純粋関数群。
 *
 * 本家（チームみらい運営）では siteConfig.managingParty に政党名が入り
 * 「チームみらいの政策検討」のような表現になる。非公式フォークでは
 * managingParty が空文字列のため、政党名を省いた汎用表現を返す。
 */

/** 「政策検討」の前に付く助詞。文脈に応じて使い分ける。 */
export type PolicyReviewParticle = "の" | "での" | "における";

/**
 * 「{政党名}{助詞}政策検討」を組み立てる。
 * 政党名が未設定（空文字列）の場合は「政策検討」のみを返す。
 */
export function formatPolicyReviewPhrase(
  managingParty: string,
  particle: PolicyReviewParticle = "の"
): string {
  if (!managingParty) {
    return "政策検討";
  }
  return `${managingParty}${particle}政策検討`;
}

/**
 * 有識者への連絡元として表示する名称を返す。
 * 政党が運営している場合は政党名、そうでなければサービス運営者名を使う。
 * どちらも未設定の場合は「運営者」にフォールバックする。
 */
export function formatContactorName(
  managingParty: string,
  operatorName: string
): string {
  return managingParty || operatorName || "運営者";
}
