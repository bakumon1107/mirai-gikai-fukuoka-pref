import type {
  BillStatusEnum,
  BillWithContent,
} from "@/features/bills/shared/types";
import type { GeneralQuestion } from "@/features/general-questions/shared/types";

export const allBillStatuses: BillStatusEnum[] = [
  "preparing",
  "submitted",
  "in_committee",
  "plenary_session",
  "approved",
  "rejected",
];

const baseBill: BillWithContent = {
  id: "mock-bill-001",
  bill_number: "",
  bill_type: "bill",
  discussion_overview_points: [],
  name: "サンプル議案",
  status: "submitted",
  is_featured: false,
  thumbnail_url: null,
  share_thumbnail_url: null,
  source_url: null,
  published_at: "2026-02-15",
  publish_status: "published",
  status_note: null,
  status_order: 4,
  publish_status_order: 2,
  council_session_id: null,
  committee_id: null,
  created_at: "2026-02-15T00:00:00Z",
  updated_at: "2026-02-15T00:00:00Z",
  bill_content: {
    id: "mock-content-001",
    bill_id: "mock-bill-001",
    title: "サンプル法案のタイトル",
    summary:
      "この法案は開発プレビュー用のサンプルデータです。法案の要約文がここに表示されます。実際のデータではありません。",
    content: "# サンプルコンテンツ\n\n本文がここに入ります。",
    difficulty_level: "normal",
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
  tags: [
    { id: "tag-1", label: "経済" },
    { id: "tag-2", label: "環境" },
  ],
};

export function createMockBill(
  overrides: Partial<BillWithContent> = {}
): BillWithContent {
  return {
    ...baseBill,
    ...overrides,
  };
}

export const mockGeneralQuestions: GeneralQuestion[] = [
  {
    id: "q-001",
    council_session_id: "session-r7-5",
    questioner_name: "山田ゆみこ",
    questioner_party: "福岡市民クラブ",
    questioner_number: 1,
    session_day: 1,
    question_order: 1,
    summary:
      "子育て支援の充実・市営スポーツ施設の老朽化対策・漁港の管理体制について質問した。",
    topics: [
      {
        title: "保育所の待機児童対策",
        question_summary:
          "令和7年4月時点の待機児童数と今後の解消見通しを示せ。また、保育士不足への対応策はどうか。",
        answer_summary:
          "待機児童数は前年比30人減の120人。保育所の新設・増設に加え、処遇改善加算を活用した保育士確保に取り組んでいる。令和9年度中の解消を目指す。",
        answerer_role: "子ども未来局長",
        answerer_name: "田中一郎",
      },
      {
        title: "市営スポーツ施設の老朽化対策",
        question_summary:
          "築40年を超える市営プールの改修計画と財源確保の見通しを示せ。",
        answer_summary:
          "長寿命化計画に基づき令和9〜11年度で大規模改修を実施予定。国の社会資本整備総合交付金を最大限活用する。",
        answerer_role: "市民局長",
        answerer_name: "舟越伸一",
      },
      {
        title: "漁港の管理体制の強化",
        question_summary:
          "能古島・志賀島の漁港施設の老朽化が進んでいるが、修繕計画と地元漁協との連携状況はどうか。",
        answer_summary:
          "年次点検に基づき優先度の高い箇所から順次修繕を実施。地元漁協と定期的な協議の場を設け、現場ニーズを計画に反映している。",
        answerer_role: "農林水産局長",
        answerer_name: "坂本健二",
      },
    ],
    raw_text: null,
    answer_raw_text: null,
    source_url: "https://example.com/minutes/r7-5-day1",
    publish_status: "published",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "q-002",
    council_session_id: "session-r7-5",
    questioner_name: "堀内徹夫",
    questioner_party: "自民党福岡市議団",
    questioner_number: 2,
    session_day: 1,
    question_order: 2,
    summary:
      "福岡市の防災・減災対策と、能登半島地震を踏まえた木造密集市街地の耐震化促進について質問した。",
    topics: [
      {
        title: "木造密集市街地の耐震化促進",
        question_summary:
          "能登半島地震の教訓を踏まえ、博多区・中央区の木造密集市街地における耐震診断・改修の補助制度拡充を求める。",
        answer_summary:
          "令和8年度から耐震改修補助の上限額を100万円から150万円に引き上げ。無料耐震診断の周知強化と戸別訪問も実施する。",
        answerer_role: "住宅都市局長",
        answerer_name: "松本雅彦",
      },
      {
        title: "避難所運営の改善",
        question_summary:
          "指定避難所のトイレ・備蓄食料の見直しと、ペット同行避難への対応強化を求める。",
        answer_summary:
          "マンホールトイレの設置箇所を現在の80カ所から令和9年度末までに120カ所に拡大。ペット同行避難は専用スペース設置を全避難所に展開する。",
        answerer_role: "市民局長",
        answerer_name: "舟越伸一",
      },
    ],
    raw_text: null,
    answer_raw_text: null,
    source_url: "https://example.com/minutes/r7-5-day1",
    publish_status: "published",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "q-003",
    council_session_id: "session-r7-5",
    questioner_name: "中山郁美",
    questioner_party: "公明党福岡市議団",
    questioner_number: 3,
    session_day: 2,
    question_order: 1,
    summary:
      "高齢者の移動支援・デジタルデバイド解消・学校給食の無償化について質問した。",
    topics: [
      {
        title: "高齢者の移動支援策",
        question_summary:
          "免許返納後の高齢者が増加している。コミュニティバスの路線拡充やタクシー助成の拡大について市の方針を問う。",
        answer_summary:
          "デマンド型交通の試験導入を令和8年度に3地区で開始予定。タクシー助成についても対象年齢・回数の拡充を検討中。",
        answerer_role: "道路下水道局長",
        answerer_name: "吉田浩二",
      },
      {
        title: "デジタルデバイド解消",
        question_summary:
          "スマートフォン操作に不慣れな高齢者へのサポート体制が不十分。市として無料講習会の拡充を求める。",
        answer_summary:
          "地域コミュニティセンターでの月2回の講習会を令和8年度から週1回に増やす。図書館でのタブレット貸出も拡大する。",
        answerer_role: "総務企画局長",
        answerer_name: "川原正人",
      },
      {
        title: "学校給食の無償化",
        question_summary:
          "物価高騰で家庭負担が増す中、小中学校の給食費無償化を求める。",
        answer_summary:
          "現時点では全面無償化は財源確保が課題。多子世帯への一部補助拡充を令和8年度予算で検討する。",
        answerer_role: "教育長",
        answerer_name: "星野泰三",
      },
    ],
    raw_text: null,
    answer_raw_text: null,
    source_url: null,
    publish_status: "published",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "q-004",
    council_session_id: "session-r7-5",
    questioner_name: "新村まさる",
    questioner_party: "新しい風ふくおか",
    questioner_number: 4,
    session_day: 2,
    question_order: 2,
    summary:
      "カーボンニュートラルの推進・再生可能エネルギーの導入促進について質問した。",
    topics: [
      {
        title: "市有施設への太陽光パネル設置",
        question_summary:
          "市有建築物への太陽光パネル設置の進捗と2030年目標の達成見込みはどうか。",
        answer_summary:
          "令和7年度末時点で市有施設の32%に設置完了。PPAモデルを活用し令和10年度に50%達成を目指す。",
        answerer_role: "環境局長",
        answerer_name: "林田将也",
      },
      {
        title: "家庭向け省エネ補助の拡充",
        question_summary:
          "断熱リフォームや高効率給湯器への補助制度が分かりにくい。ワンストップ相談窓口の設置を求める。",
        answer_summary:
          "令和8年4月から住宅エネルギー相談窓口を各区役所に設置。国・県・市の補助を一括案内する体制を整備する。",
        answerer_role: "環境局長",
        answerer_name: "林田将也",
      },
    ],
    raw_text: null,
    answer_raw_text: null,
    source_url: null,
    publish_status: "published",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "q-005",
    council_session_id: "session-r7-5",
    questioner_name: "倉元達朗",
    questioner_party: "自民党福岡市議団",
    questioner_number: 5,
    session_day: 3,
    question_order: 1,
    summary:
      "福岡空港の機能強化・都心部の渋滞対策・地下鉄七隈線延伸について質問した。",
    topics: [
      {
        title: "福岡空港第2滑走路の運用開始後の課題",
        question_summary:
          "第2滑走路運用開始後の騒音問題への対応と、周辺住民への説明状況を問う。",
        answer_summary:
          "騒音測定局を新たに3カ所追加設置。住民説明会を年4回開催し、防音工事助成の対象区域拡大も検討中。",
        answerer_role: "市長",
        answerer_name: "髙島宗一郎",
      },
      {
        title: "都心部の慢性的渋滞解消",
        question_summary:
          "博多駅周辺の渋滞が慢性化している。信号制御の最適化とパークアンドライドの拡充策を問う。",
        answer_summary:
          "AIを活用した信号制御最適化を令和8年度から主要交差点30カ所に導入。パークアンドライド駐車場を2カ所新設予定。",
        answerer_role: "道路下水道局長",
        answerer_name: "吉田浩二",
      },
    ],
    raw_text: null,
    answer_raw_text: null,
    source_url: null,
    publish_status: "published",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "q-006",
    council_session_id: "session-r7-5",
    questioner_name: "天野こう",
    questioner_party: "日本共産党福岡市議団",
    questioner_number: 6,
    session_day: 3,
    question_order: 2,
    summary:
      "国保料の引き下げ・子どもの貧困対策・非正規雇用労働者の処遇改善について質問した。",
    topics: [
      {
        title: "国民健康保険料の引き下げ",
        question_summary:
          "福岡市の国保料は政令市の中でも高水準。一般会計からの繰り入れを増やし引き下げを求める。",
        answer_summary:
          "国保の財政運営は都道府県単位に移行しており、市単独での引き下げは困難。国・県への要請を続ける。",
        answerer_role: "保健医療局長",
        answerer_name: "中村仁志",
      },
      {
        title: "子どもの貧困対策の強化",
        question_summary:
          "子ども食堂への補助額が少ない。運営団体の持続可能性を高めるため補助上限の引き上げを求める。",
        answer_summary:
          "令和8年度から子ども食堂への補助上限を年15万円から20万円に引き上げ。食材提供ネットワークの拡充も支援する。",
        answerer_role: "こども局長",
        answerer_name: "浜田理恵",
      },
    ],
    raw_text: null,
    answer_raw_text: null,
    source_url: null,
    publish_status: "published",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
];
