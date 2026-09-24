export type PressConferenceStatus =
  | "draft"
  | "structuring"
  | "review"
  | "published"
  | "error";

export type Speaker = "governor" | "reporter" | "secretariat";

export type PressConferenceTurn = {
  id: string;
  speaker: Speaker;
  speakerName: string | null;
  content: string;
  orderIndex: number;
};

export type PressConferenceItem = {
  id: string;
  itemType: "announcement" | "qa";
  orderIndex: number;
  title: string;
  summary: string | null;
  materialUrl: string | null;
  detail: string | null;
  turns: PressConferenceTurn[];
};

export type PressConference = {
  id: string;
  slug: string;
  title: string;
  heldAt: string;
  youtubeUrl: string | null;
  status: PressConferenceStatus;
  items: PressConferenceItem[];
};

/**
 * 日付チップ用の軽量な会見情報（設計書 5.4 節）。
 *
 * トップの「これまでの会見」は日付とリンク先しか要らないため、
 * 発表・質疑・発言本文を含む {@link PressConference} は使わない。
 */
export type PressConferenceRef = {
  id: string;
  slug: string;
  heldAt: string;
};
