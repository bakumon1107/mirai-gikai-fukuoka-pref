export type GeneralQuestionTopic = {
  title: string;
  question_summary: string;
  answer_summary: string;
  answerer_role: string;
  answerer_name: string;
  block_summary?: string | null;
};

/** 代表質問（会派を代表して行う質問）と一般質問の別 */
export type QuestionType = "general" | "representative";

export type GeneralQuestion = {
  id: string;
  council_session_id: string;
  question_type: string;
  questioner_name: string;
  questioner_party: string | null;
  questioner_number: number | null;
  session_day: number;
  question_order: number;
  summary: string | null;
  topics: GeneralQuestionTopic[];
  raw_text: string | null;
  answer_raw_text: string | null;
  source_url: string | null;
  publish_status: string;
  created_at: string;
  updated_at: string;
};
