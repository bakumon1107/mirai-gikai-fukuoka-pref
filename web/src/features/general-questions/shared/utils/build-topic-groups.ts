import type { GeneralQuestion, GeneralQuestionTopic } from "../types";

export type TopicEntry = {
  title: string;
  questionSummary: string;
  answerSummary: string;
  answererRole: string;
  answererName: string;
  topicCount: number;
  questioner: {
    id: string;
    name: string;
    party: string | null;
  };
};

export type TopicGroup = {
  categoryLabel: string;
  iconName: string;
  entries: TopicEntry[];
};

const CATEGORY_MAP: Array<{
  label: string;
  iconName: string;
  keywords: string[];
}> = [
  {
    label: "子育て・教育",
    iconName: "Baby",
    keywords: [
      "保育",
      "子ども",
      "給食",
      "学校",
      "育児",
      "児童",
      "教育",
      "不登校",
      "教員",
      "修学",
      "進路",
      "学び",
      "義務教育",
      "外国人児童",
      "部活",
      "チャイルドシート",
      "不妊",
      "病児",
      "貸出し",
      "指導者",
      "人材バンク",
      "地域移行",
    ],
  },
  {
    label: "健康・医療",
    iconName: "Stethoscope",
    keywords: [
      "ワクチン",
      "医療",
      "コロナ",
      "健康",
      "HPV",
      "衛生",
      "後遺症",
      "肺炎",
      "接種",
      "病院",
      "臍帯血",
      "周知強化と提供",
    ],
  },
  {
    label: "防災・安全",
    iconName: "Shield",
    keywords: [
      "耐震",
      "避難",
      "防災",
      "減災",
      "災害",
      "安全",
      "火災",
      "発令",
      "警報",
      "注意報",
      "林野",
      "車中泊",
      "南海トラフ",
      "地震防災",
      "地震対策",
      "防災対応",
    ],
  },
  {
    label: "高齢者・福祉",
    iconName: "Heart",
    keywords: [
      "高齢者",
      "移動支援",
      "国民健康保険",
      "デジタルデバイド",
      "福祉",
      "介護",
      "障害",
      "老人",
      "孤立",
      "独居",
      "点字",
      "障がい",
      "当事者意見",
    ],
  },
  {
    label: "交通・まちづくり",
    iconName: "Building2",
    keywords: [
      "渋滞",
      "空港",
      "交通",
      "滑走路",
      "道路",
      "鉄道",
      "バス",
      "地下鉄",
      "まちづくり",
      "再開発",
      "無電柱",
      "橋梁",
      "駐輪",
      "渡船",
      "動く歩道",
      "住宅",
      "民泊",
      "バリアフリー",
      "MaaS",
      "余裕期間",
      "公共工事",
      "施工",
      "相談窓口",
      "利用実績",
    ],
  },
  {
    label: "環境・脱炭素",
    iconName: "Leaf",
    keywords: [
      "太陽光",
      "省エネ",
      "カーボン",
      "再生可能",
      "環境保全",
      "脱炭素",
      "ゼロカーボン",
      "温室効果",
      "海洋ごみ",
      "漂着",
      "植栽",
    ],
  },
  {
    label: "スポーツ・文化",
    iconName: "Trophy",
    keywords: [
      "スポーツ",
      "eスポーツ",
      "アスリート",
      "スタジアム",
      "博物館",
      "公民館",
      "城",
      "ドーム",
      "能楽",
      "伝統文化",
      "伝統芸能",
      "万葉",
      "文化芸術",
      "担いクラブ",
    ],
  },
  {
    label: "観光・地域振興",
    iconName: "Globe",
    keywords: [
      "観光",
      "誘客",
      "欧州",
      "パリ",
      "八女",
      "糸島",
      "振興",
      "地方創生",
      "国際",
      "外国人",
      "多文化",
      "共生",
      "漁港",
      "漁村",
      "海業",
      "アウトバウンド",
      "地域交流",
    ],
  },
  {
    label: "産業・農林水産",
    iconName: "Sprout",
    keywords: [
      "農業",
      "農林水産",
      "農産物",
      "農業大学校",
      "茶",
      "八女茶",
      "侵入防止柵",
      "鳥獣",
      "除草",
      "ジビエ",
      "受刑者",
      "中小企業",
      "産業人材",
      "募集人員",
    ],
  },
  {
    label: "警察・人権",
    iconName: "Scale",
    keywords: [
      "ストーカー",
      "拉致",
      "人権",
      "薬物",
      "加害者",
      "被害者",
      "禁止命令",
      "警察",
      "暑熱",
      "ファンベスト",
      "広報啓発",
      "改正法の周知",
    ],
  },
  {
    label: "行政・県政",
    iconName: "Landmark",
    keywords: ["防災庁", "副首都", "被害想定", "庁内連携", "組織改正"],
  },
];

export function assignCategory(topicTitle: string): {
  label: string;
  iconName: string;
} {
  for (const cat of CATEGORY_MAP) {
    if (cat.keywords.some((kw) => topicTitle.includes(kw))) {
      return { label: cat.label, iconName: cat.iconName };
    }
  }
  return { label: "その他", iconName: "Circle" };
}

function buildEntry(
  q: GeneralQuestion,
  topics: GeneralQuestionTopic[]
): TopicEntry {
  const first = topics[0];
  // block_summary がある場合（複数トピック統合時にAI生成）はそれを優先
  // ない場合は最初のトピックのQ/Aを使う（最後のトピックはタイトルと不一致になるため）
  const useBlockSummary = !!first.block_summary;
  return {
    title: first.title,
    questionSummary: first.question_summary,
    answerSummary: first.block_summary ?? first.answer_summary,
    answererRole: useBlockSummary ? "" : first.answerer_role,
    answererName: useBlockSummary ? "" : first.answerer_name,
    topicCount: topics.length,
    questioner: {
      id: q.id,
      name: q.questioner_name,
      party: q.questioner_party,
    },
  };
}

export function buildTopicGroups(questions: GeneralQuestion[]): TopicGroup[] {
  // Group consecutive same-category topics per questioner into blocks.
  // This preserves natural Q&A blocks while still merging related sub-topics
  // (e.g. 10 fire-alarm exchanges → 1 card), without bundling unrelated themes
  // that happen to share a category (e.g. international exchange ≠ neighborhood assoc).
  const blocks: Array<{
    q: GeneralQuestion;
    topics: GeneralQuestionTopic[];
    iconName: string;
    categoryLabel: string;
  }> = [];

  for (const q of questions) {
    let currentBlock: (typeof blocks)[0] | null = null;

    for (const t of q.topics) {
      const { label, iconName } = assignCategory(t.title);

      if (currentBlock && currentBlock.categoryLabel === label) {
        currentBlock.topics.push(t);
      } else {
        currentBlock = { q, topics: [t], iconName, categoryLabel: label };
        blocks.push(currentBlock);
      }
    }
  }

  const categoryMap = new Map<string, TopicGroup>();

  for (const { q, topics, iconName, categoryLabel } of blocks) {
    const entry = buildEntry(q, topics);
    const existing = categoryMap.get(categoryLabel);
    if (existing) {
      existing.entries.push(entry);
    } else {
      categoryMap.set(categoryLabel, {
        categoryLabel,
        iconName,
        entries: [entry],
      });
    }
  }

  const orderedLabels = [...CATEGORY_MAP.map((c) => c.label), "その他"].filter(
    (l) => categoryMap.has(l)
  );

  return orderedLabels.map((l) => categoryMap.get(l) as TopicGroup);
}
