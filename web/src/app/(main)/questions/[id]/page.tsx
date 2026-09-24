import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { siteConfig } from "@/config/site.config";
import { RawTranscriptView } from "@/features/general-questions/server/components/raw-transcript-view";
import { QuestionChatView } from "@/features/general-questions/client/components/question-chat-view";
import { QuestionViewToggle } from "@/features/general-questions/client/components/question-view-toggle";
import { getGeneralQuestionById } from "@/features/general-questions/server/loaders/get-general-question-by-id";
import { questionTypeLabel } from "@/features/general-questions/shared/utils/question-type-label";
import { getCouncilSessionById } from "@/features/council-sessions/server/loaders/get-council-session-by-id";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const question = await getGeneralQuestionById(id);

  if (!question) {
    return { title: "質問が見つかりません" };
  }

  return {
    title: `${question.questioner_name} 議員の${questionTypeLabel(
      question.question_type
    )} | ${siteConfig.siteName}`,
    description: question.summary ?? undefined,
  };
}

export default async function GeneralQuestionDetailPage({ params }: Props) {
  const { id } = await params;
  const question = await getGeneralQuestionById(id);

  if (!question) {
    notFound();
  }

  const session = question
    ? await getCouncilSessionById(question.council_session_id)
    : null;

  const backHref = session
    ? `/sessions/${session.slug}/questions`
    : "/questions";

  const typeLabel = questionTypeLabel(question.question_type);

  return (
    <Container className="py-8 max-w-2xl">
      <div className="mb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-mirai-text-secondary hover:text-mirai-text"
        >
          <ChevronLeft className="w-4 h-4" />
          質問の一覧に戻る
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-mirai-text">
          {question.questioner_name} 議員
        </h1>
        <p className="mt-1 text-sm text-mirai-text-secondary">
          {question.questioner_party && (
            <span>{question.questioner_party}　｜　</span>
          )}
          {typeLabel}　｜　第{question.session_day}日
        </p>
      </div>

      {question.summary && (
        <p className="mb-6 text-mirai-text leading-relaxed">
          {question.summary}
        </p>
      )}

      {question.raw_text && question.topics.length > 0 ? (
        <QuestionViewToggle
          topics={question.topics}
          rawText={question.raw_text}
          answerRawText={question.answer_raw_text}
          questionerName={question.questioner_name}
          questionerNumber={question.questioner_number}
        />
      ) : question.raw_text ? (
        <RawTranscriptView rawText={question.raw_text} />
      ) : (
        <QuestionChatView topics={question.topics} />
      )}

      {question.source_url && (
        <div className="mt-8 pt-6 border-t border-border">
          <Link
            href={question.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            公式会議録を見る
          </Link>
        </div>
      )}
    </Container>
  );
}
