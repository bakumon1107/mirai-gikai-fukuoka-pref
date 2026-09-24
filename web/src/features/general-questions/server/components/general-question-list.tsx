import type { GeneralQuestion } from "../../shared/types";
import { GeneralQuestionCard } from "./general-question-card";

interface GeneralQuestionListProps {
  questions: GeneralQuestion[];
}

export function GeneralQuestionList({ questions }: GeneralQuestionListProps) {
  if (questions.length === 0) {
    return (
      <div className="text-center py-16 text-mirai-text-secondary">
        <p>現在、代表質問・一般質問のデータを準備中です。</p>
        <p className="text-sm mt-2">しばらくお待ちください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {questions.map((question) => (
        <GeneralQuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
}
