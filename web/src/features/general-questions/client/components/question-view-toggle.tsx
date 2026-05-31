"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuestionChatView } from "./question-chat-view";
import type { GeneralQuestionTopic } from "../../shared/types";

type SpeakerTurn = { speaker: string; text: string };

function parseSpeakerTurns(rawText: string): SpeakerTurn[] {
  const turns: SpeakerTurn[] = [];
  const segments = rawText.split("◯").filter((s) => s.trim().length > 0);
  for (const seg of segments) {
    const newlineIdx = seg.search(/[\s　]/);
    if (newlineIdx === -1) {
      turns.push({ speaker: seg.trim(), text: "" });
      continue;
    }
    const speaker = seg.slice(0, newlineIdx).trim();
    const text = seg.slice(newlineIdx).trim();
    if (speaker.includes("議長")) continue;
    turns.push({ speaker, text });
  }
  return turns;
}

function isQuestioner(speaker: string): boolean {
  return /^\d+番/.test(speaker);
}

function RawTranscriptContent({
  questionerHeader,
  questionText,
  answerHeader,
  answerText,
}: {
  questionerHeader: string;
  questionText: string;
  answerHeader: string;
  answerText: string | null;
}) {
  // ◯マーカー付きのテキストを組み立ててパーサーに渡す
  const combined = [
    `◯${questionerHeader}　${questionText}`,
    answerText ? `◯${answerHeader}　${answerText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const turns = parseSpeakerTurns(combined);

  return (
    <div className="flex flex-col gap-4">
      {turns.map((turn, i) => {
        const isQ = isQuestioner(turn.speaker);
        return (
          <div
            key={`${i}-${turn.speaker}`}
            className={isQ ? "flex justify-end" : "flex"}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                isQ
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border text-mirai-text rounded-bl-sm"
              }`}
            >
              <p
                className={`mb-1 text-xs font-medium ${
                  isQ
                    ? "text-primary-foreground/70"
                    : "text-mirai-text-secondary"
                }`}
              >
                {turn.speaker}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {turn.text}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface QuestionViewToggleProps {
  topics: GeneralQuestionTopic[];
  rawText: string;
  answerRawText?: string | null;
  questionerName: string;
  questionerNumber?: number | null;
}

export function QuestionViewToggle({
  topics,
  rawText,
  answerRawText,
  questionerName,
  questionerNumber,
}: QuestionViewToggleProps) {
  const [mode, setMode] = useState<"summary" | "raw">("summary");

  // 発言者ヘッダー（◯の後に続く部分）
  const questionerHeader = questionerNumber
    ? `${questionerNumber}番（${questionerName}）登壇`
    : `${questionerName}議員登壇`;

  const first = topics[0];
  const answererHeader = first
    ? `${first.answerer_role}（${first.answerer_name}）登壇`
    : "知事登壇";

  // 【知事 氏名】のような追加発言マーカーを ◯知事（氏名）登壇　に変換してパーサーへ渡す
  const normalizedAnswer = answerRawText
    ? answerRawText.replace(
        /(^|\n)【([^\s】]+)\s+([^】]+)】\s*/g,
        "$1◯$2（$3）登壇　"
      )
    : null;

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <Button
          variant={mode === "summary" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("summary")}
        >
          要約
        </Button>
        <Button
          variant={mode === "raw" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("raw")}
        >
          詳しく（原文）
        </Button>
      </div>
      {mode === "summary" ? (
        <QuestionChatView topics={topics} />
      ) : (
        <RawTranscriptContent
          questionerHeader={questionerHeader}
          questionText={rawText}
          answerHeader={answererHeader}
          answerText={normalizedAnswer}
        />
      )}
    </div>
  );
}
