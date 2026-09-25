import "server-only";
import Link from "next/link";
import type { GeneralQuestion } from "@/features/general-questions/shared/types";
import { questionTypeLabel } from "@/features/general-questions/shared/utils/question-type-label";

type Props = {
  questions: GeneralQuestion[];
  /** 出典ラベル用の会期名（例: "令和8年 9月定例会"） */
  sessionName: string | null;
};

/**
 * 代表質問・一般質問から（設計書 5.7 節）。
 *
 * 見出しは AI生成の headline_short が未整備のため topics[0].title を使う。
 * カードは省スペースなので questionMetaLabel（日・順番まで入る）ではなく
 * questionTypeLabel だけを使い、議員名と並べる。
 */
export function QuestionsSection({ questions, sessionName }: Props) {
  if (questions.length === 0) return null;

  return (
    <section className="mx-4 mt-10 rounded-[28px] bg-white p-5 pc:mx-16 pc:mt-12 pc:rounded-[32px] pc:p-9">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-rounded text-xl font-bold text-mirai-text pc:text-2xl">
          代表質問・一般質問から
        </h2>
        <Link
          href="/questions"
          className="text-sm font-medium text-pref-accent hover:text-pref-accent-hover"
        >
          もっと見る
        </Link>
      </div>

      <ul className="mt-3 flex flex-col">
        {questions.map((question) => {
          const headline = question.topics[0]?.title ?? question.summary ?? "";
          return (
            <li
              key={question.id}
              className="border-b border-pref-divider last:border-b-0"
            >
              {/*
                子の span が色を上書きするため、リンク側に hover:text-* を
                置いても効かない。group 経由で見出しだけ色を変える
              */}
              <Link
                href={`/questions/${question.id}`}
                className="group flex flex-col gap-0.5 py-3"
              >
                <span className="text-sm leading-relaxed text-mirai-text group-hover:text-pref-accent">
                  {headline}
                </span>
                <span className="text-xs text-mirai-text-secondary">
                  {questionTypeLabel(question.question_type)}／
                  {question.questioner_name} 議員
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* 出典は必ず出す（設計書 5.7 節） */}
      {sessionName && (
        <p className="mt-2 text-xs text-mirai-text-secondary">
          {sessionName}より
        </p>
      )}
    </section>
  );
}
