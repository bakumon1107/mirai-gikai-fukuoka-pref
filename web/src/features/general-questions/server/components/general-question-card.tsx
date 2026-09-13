import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { GeneralQuestion } from "../../shared/types";
import { questionMetaLabel } from "../../shared/utils/question-type-label";

interface GeneralQuestionCardProps {
  question: GeneralQuestion;
}

export function GeneralQuestionCard({ question }: GeneralQuestionCardProps) {
  const metaLabel = questionMetaLabel(
    question.question_type,
    question.session_day,
    question.question_order
  );
  const topicTitles = question.topics.map((t) => t.title).join(" / ");

  return (
    <Link
      href={`/questions/${question.id}`}
      className="block bg-card border border-border rounded-lg px-5 py-4 hover:border-primary transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {topicTitles && (
            <p className="text-xs text-mirai-text-secondary mb-1 truncate">
              {topicTitles}
            </p>
          )}
          <p className="font-bold text-mirai-text">
            {question.questioner_name}
          </p>
          {question.questioner_party && (
            <p className="text-sm text-mirai-text-secondary">
              {question.questioner_party}
            </p>
          )}
          <p className="text-xs text-mirai-text-muted mt-1">{metaLabel}</p>
          {question.summary && (
            <p className="mt-2 text-sm text-mirai-text line-clamp-2">
              {question.summary}
            </p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-mirai-text-muted shrink-0 mt-1" />
      </div>
    </Link>
  );
}
