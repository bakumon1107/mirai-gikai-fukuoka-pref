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
