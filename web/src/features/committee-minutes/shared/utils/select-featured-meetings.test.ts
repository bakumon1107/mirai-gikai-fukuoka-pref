import { describe, expect, it } from "vitest";
import type { CommitteeMeetingSummary } from "../types";
import {
  MIN_SPEECH_COUNT,
  selectFeaturedMeetings,
} from "./select-featured-meetings";

const makeMeeting = (
  overrides: Partial<CommitteeMeetingSummary> & {
    committeeSlug: string;
    meetingDate: string;
  }
): CommitteeMeetingSummary => ({
  id: `${overrides.committeeSlug}-${overrides.meetingDate}`,
  committeeName: overrides.committeeSlug,
  title: "会議",
  sourceDocumentId: 1,
  sourceUrl: "https://example.com",
  summary: null,
  topics: [],
  speechCount: 30,
  ...overrides,
});

describe("selectFeaturedMeetings", () => {
  it("委員会ごとに1件だけ選ぶ", () => {
    const result = selectFeaturedMeetings(
      [
        makeMeeting({ committeeSlug: "nourin", meetingDate: "2026-07-14" }),
        makeMeeting({ committeeSlug: "nourin", meetingDate: "2026-05-20" }),
        makeMeeting({ committeeSlug: "shoko", meetingDate: "2026-07-14" }),
      ],
      4
    );
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.committeeSlug).sort()).toEqual([
      "nourin",
      "shoko",
    ]);
  });

  it("同じ委員会では最新の回を選ぶ", () => {
    const result = selectFeaturedMeetings(
      [
        makeMeeting({ committeeSlug: "nourin", meetingDate: "2026-05-20" }),
        makeMeeting({ committeeSlug: "nourin", meetingDate: "2026-07-14" }),
      ],
      4
    );
    expect(result[0].meetingDate).toBe("2026-07-14");
  });

  it("発言数が閾値未満の回は飛ばして一つ前の回を選ぶ", () => {
    const result = selectFeaturedMeetings(
      [
        makeMeeting({
          committeeSlug: "kendo",
          meetingDate: "2026-07-14",
          speechCount: MIN_SPEECH_COUNT - 1,
        }),
        makeMeeting({
          committeeSlug: "kendo",
          meetingDate: "2026-05-20",
          speechCount: 38,
        }),
      ],
      4
    );
    expect(result).toHaveLength(1);
    expect(result[0].meetingDate).toBe("2026-05-20");
  });

  it("閾値ちょうどは通す", () => {
    const result = selectFeaturedMeetings(
      [
        makeMeeting({
          committeeSlug: "kendo",
          meetingDate: "2026-07-14",
          speechCount: MIN_SPEECH_COUNT,
        }),
      ],
      4
    );
    expect(result).toHaveLength(1);
  });

  it("全ての回が閾値未満の委員会は選ばない", () => {
    const result = selectFeaturedMeetings(
      [
        makeMeeting({
          committeeSlug: "kendo",
          meetingDate: "2026-07-14",
          speechCount: 6,
        }),
        makeMeeting({
          committeeSlug: "kendo",
          meetingDate: "2026-05-20",
          speechCount: 3,
        }),
      ],
      4
    );
    expect(result).toEqual([]);
  });

  it("開催日の新しい順に並べて上位N件を返す", () => {
    const result = selectFeaturedMeetings(
      [
        makeMeeting({ committeeSlug: "a", meetingDate: "2026-04-16" }),
        makeMeeting({ committeeSlug: "b", meetingDate: "2026-07-14" }),
        makeMeeting({ committeeSlug: "c", meetingDate: "2026-05-20" }),
        makeMeeting({ committeeSlug: "d", meetingDate: "2026-06-02" }),
      ],
      3
    );
    expect(result.map((m) => m.meetingDate)).toEqual([
      "2026-07-14",
      "2026-06-02",
      "2026-05-20",
    ]);
  });

  it("speechCount が null のときは判定できないため除外しない", () => {
    const result = selectFeaturedMeetings(
      [
        makeMeeting({
          committeeSlug: "kendo",
          meetingDate: "2026-07-14",
          speechCount: null,
        }),
      ],
      4
    );
    expect(result).toHaveLength(1);
  });

  it("空配列と limit=0 を安全に扱う", () => {
    expect(selectFeaturedMeetings([], 4)).toEqual([]);
    expect(
      selectFeaturedMeetings(
        [makeMeeting({ committeeSlug: "a", meetingDate: "2026-07-14" })],
        0
      )
    ).toEqual([]);
  });

  it("入力を破壊しない", () => {
    const input = [
      makeMeeting({ committeeSlug: "a", meetingDate: "2026-04-16" }),
      makeMeeting({ committeeSlug: "a", meetingDate: "2026-07-14" }),
    ];
    const before = input.map((m) => m.meetingDate);
    selectFeaturedMeetings(input, 4);
    expect(input.map((m) => m.meetingDate)).toEqual(before);
  });
});
