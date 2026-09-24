import type { QuestionType } from "../types";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  general: "一般質問",
  representative: "代表質問",
};

/** 質問種別の表示ラベル。未知の値が来ても一般質問として扱う */
export function questionTypeLabel(questionType: string | null): string {
  if (questionType === "representative") {
    return QUESTION_TYPE_LABELS.representative;
  }
  return QUESTION_TYPE_LABELS.general;
}

/** 「代表質問・第5日・1番目」のようなカード用のメタ表記 */
export function questionMetaLabel(
  questionType: string | null,
  sessionDay: number,
  questionOrder: number
): string {
  return `${questionTypeLabel(questionType)}・第${sessionDay}日・${questionOrder}番目`;
}
