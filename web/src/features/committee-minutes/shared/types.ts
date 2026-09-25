/** 発言者の種別 */
export type SpeakerType = "chairperson" | "member" | "executive" | "unknown";

/** 会議録の1発言 */
export type CommitteeSpeech = {
  voiceNo: number;
  speakerLabel: string | null;
  speakerType: SpeakerType;
  text: string;
  /** 中学生でも伝わる表現に直した本文（Phase 2でAI生成・確認後に格納） */
  simpleText?: string;
};

/** 会議内の1議題 */
export type CommitteeMeetingTopic = {
  id: string;
  topicOrder: number;
  title: string;
  summary: string | null;
  discussionSummary: string | null;
  speakers: { label: string }[];
  startVoiceNo: number | null;
  endVoiceNo: number | null;
};

/** 委員会の開催1回分（一覧用・発言なし） */
export type CommitteeMeetingSummary = {
  id: string;
  committeeName: string;
  committeeSlug: string;
  meetingDate: string;
  title: string;
  sourceDocumentId: number;
  sourceUrl: string;
  /** 会議全体の要約（AI生成・確認後に格納） */
  summary: string | null;
  topics: CommitteeMeetingTopic[];
  /**
   * 発言数。`committee_meetings.speech_count`（生成列）から取る。
   *
   * 一覧用SELECTは `speeches`（全発言本文）を載せない方針なので、
   * 件数だけを生成列で受け取る。取得していない経路では null。
   */
  speechCount: number | null;
};

/** 委員会の開催1回分（詳細用・発言つき） */
export type CommitteeMeetingDetail = CommitteeMeetingSummary & {
  speeches: CommitteeSpeech[];
};

/** 委員会（アーカイブの単位） */
export type CommitteeArchive = {
  slug: string;
  /** 現行の委員会名（最新の会議の開催時名称） */
  name: string;
  meetingCount: number;
  latestMeetingDate: string;
};
