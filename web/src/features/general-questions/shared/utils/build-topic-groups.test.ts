import { describe, expect, it } from "vitest";
import { assignCategory, buildTopicGroups } from "./build-topic-groups";
import type { GeneralQuestion } from "../types";

describe("assignCategory", () => {
  it("保育所 → 子育て・教育", () => {
    expect(assignCategory("保育所の待機児童対策").label).toBe("子育て・教育");
  });
  it("耐震 → 防災・安全", () => {
    expect(assignCategory("木造密集市街地の耐震化促進").label).toBe(
      "防災・安全"
    );
  });
  it("マッチしない → その他", () => {
    expect(assignCategory("特になし").label).toBe("その他");
  });
});

const mockQuestion: GeneralQuestion = {
  id: "q-001",
  council_session_id: "session-1",
  questioner_name: "山田花子",
  questioner_party: "テスト会派",
  questioner_number: 1,
  session_day: 1,
  question_order: 1,
  summary: "保育所の待機児童解消と耐震化促進について質問。",
  topics: [
    {
      title: "保育所の待機児童対策",
      question_summary: "待機児童の解消策は？",
      answer_summary: "令和9年度中に解消予定。",
      answerer_role: "子ども未来局長",
      answerer_name: "田中一郎",
    },
    {
      title: "木造密集市街地の耐震化促進",
      question_summary: "補助を拡充せよ。",
      answer_summary: "令和8年度から150万円に引き上げ。",
      answerer_role: "住宅都市局長",
      answerer_name: "松本雅彦",
    },
  ],
  raw_text: null,
  answer_raw_text: null,
  source_url: null,
  publish_status: "published",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
};

describe("buildTopicGroups", () => {
  it("トピックをカテゴリ別に分類する", () => {
    const groups = buildTopicGroups([mockQuestion]);
    const labels = groups.map((g) => g.categoryLabel);
    expect(labels).toContain("子育て・教育");
    expect(labels).toContain("防災・安全");
  });

  it("各グループにentryが含まれる", () => {
    const groups = buildTopicGroups([mockQuestion]);
    const childCare = groups.find((g) => g.categoryLabel === "子育て・教育");
    expect(childCare?.entries).toHaveLength(1);
    expect(childCare?.entries[0].questioner.id).toBe("q-001");
  });

  it("単一トピックのカードはtopicCount=1でトピック名をtitleに使う", () => {
    const groups = buildTopicGroups([mockQuestion]);
    const childCare = groups.find((g) => g.categoryLabel === "子育て・教育");
    const entry = childCare?.entries[0];
    expect(entry?.topicCount).toBe(1);
    expect(entry?.title).toBe("保育所の待機児童対策");
  });

  it("同一議員・同一カテゴリの複数トピックは1枚にマージされる", () => {
    const q: GeneralQuestion = {
      id: "q-002",
      council_session_id: "session-1",
      questioner_name: "和田あきひこ",
      questioner_party: null,
      questioner_number: 2,
      session_day: 1,
      question_order: 2,
      summary: "火災警報が平成以降一度も発令されていない実態を指摘。",
      topics: [
        {
          title: "火災警報の発令基準について",
          question_summary: "発令基準の見直しを。",
          answer_summary: "制度の検討を進める。",
          answerer_role: "消防局長",
          answerer_name: "鈴木一郎",
        },
        {
          title: "林野火災注意報の導入について",
          question_summary: "林野火災への対応は？",
          answer_summary: "林野火災注意報の導入を検討する。",
          answerer_role: "消防局長",
          answerer_name: "鈴木一郎",
        },
        {
          title: "災害時のプッシュ型情報発信の必要性",
          question_summary: "住民への情報発信を強化せよ。",
          answer_summary: "プッシュ通知の拡充を検討する。",
          answerer_role: "総務企画局長",
          answerer_name: "佐藤次郎",
        },
      ],
      raw_text: null,
      answer_raw_text: null,
      source_url: null,
      publish_status: "published",
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
    };

    const groups = buildTopicGroups([q]);
    const bousai = groups.find((g) => g.categoryLabel === "防災・安全");
    expect(bousai?.entries).toHaveLength(1);
    const entry = bousai?.entries[0];
    expect(entry?.topicCount).toBe(3);
    // merged block uses first topic's title; N件 badge shows the count
    expect(entry?.title).toBe("火災警報の発令基準について");
    // block_summary がない場合は最初のトピックの answer_summary を使う
    expect(entry?.answerSummary).toBe("制度の検討を進める。");
  });

  it("同一議員でもカテゴリが異なれば別カードになる", () => {
    const q: GeneralQuestion = {
      id: "q-003",
      council_session_id: "session-1",
      questioner_name: "テスト議員",
      questioner_party: null,
      questioner_number: 3,
      session_day: 1,
      question_order: 3,
      summary: "防災と交通について質問。",
      topics: [
        {
          title: "火災警報の改善について",
          question_summary: "警報基準の見直しを。",
          answer_summary: "検討する。",
          answerer_role: "消防局長",
          answerer_name: "A",
        },
        {
          title: "地下鉄延伸計画の現状について",
          question_summary: "地下鉄延伸の見通しは？",
          answer_summary: "条例改正を検討する。",
          answerer_role: "道路下水道局長",
          answerer_name: "B",
        },
      ],
      raw_text: null,
      answer_raw_text: null,
      source_url: null,
      publish_status: "published",
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z",
    };

    const groups = buildTopicGroups([q]);
    const labels = groups.map((g) => g.categoryLabel);
    expect(labels).toContain("防災・安全");
    expect(labels).toContain("交通・まちづくり");

    const bousai = groups.find((g) => g.categoryLabel === "防災・安全");
    const kotsu = groups.find((g) => g.categoryLabel === "交通・まちづくり");
    expect(bousai?.entries).toHaveLength(1);
    expect(kotsu?.entries).toHaveLength(1);
    expect(bousai?.entries[0].topicCount).toBe(1);
    expect(kotsu?.entries[0].topicCount).toBe(1);
  });

  it("空配列は空グループを返す", () => {
    expect(buildTopicGroups([])).toHaveLength(0);
  });
});
