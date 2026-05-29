import {
  Baby,
  Shield,
  Heart,
  Bus,
  Leaf,
  MapPin,
  Circle,
  ArrowRight,
} from "lucide-react";
import { mockGeneralQuestions } from "@/app/dev/_lib/mock-data";
import { buildTopicGroups } from "../_lib/build-topic-groups";
import type { TopicGroup, TopicEntry } from "../_lib/build-topic-groups";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Baby,
  Shield,
  Heart,
  Bus,
  Leaf,
  MapPin,
  Circle,
};

// カテゴリごとの色クラス（Tailwind デザイントークン外だがdev prototype用途）
const CATEGORY_STYLE: Record<
  string,
  { bg: string; text: string; iconBg: string }
> = {
  "子育て・教育": {
    bg: "bg-sky-50 border-sky-200",
    text: "text-sky-700",
    iconBg: "bg-sky-100",
  },
  "防災・安全": {
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
    iconBg: "bg-orange-100",
  },
  "高齢者・福祉": {
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-700",
    iconBg: "bg-rose-100",
  },
  "交通・都市基盤": {
    bg: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
    iconBg: "bg-violet-100",
  },
  "環境・脱炭素": {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    iconBg: "bg-emerald-100",
  },
  地域振興: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    iconBg: "bg-amber-100",
  },
};

const DEFAULT_STYLE = {
  bg: "bg-mirai-surface-muted border-border",
  text: "text-mirai-text-secondary",
  iconBg: "bg-card",
};

function CitizenCard({
  entry,
  style,
}: {
  entry: TopicEntry;
  style: typeof DEFAULT_STYLE;
}) {
  return (
    <div className={`rounded-xl border ${style.bg} overflow-hidden`}>
      {/* テーマタイトル */}
      <div className="px-4 pt-4 pb-3">
        <h3 className={`text-base font-bold ${style.text} mb-2`}>
          {entry.title}
        </h3>

        {/* 市の方針を先に・大きく */}
        <p className="text-sm text-mirai-text leading-relaxed">
          {entry.answerSummary}
        </p>
      </div>

      {/* 詳細フッター */}
      <div className="px-4 py-2.5 bg-white/60 border-t border-inherit flex items-center justify-between">
        <p className="text-xs text-mirai-text-secondary line-clamp-1 flex-1 mr-2">
          {entry.questioner.name}議員の質問より
        </p>
        <button
          type="button"
          className={`inline-flex items-center gap-1 text-xs font-medium ${style.text} hover:underline shrink-0`}
        >
          質疑の詳細
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function CategorySection({ group }: { group: TopicGroup }) {
  const Icon = ICON_MAP[group.icon] ?? Circle;
  const style = CATEGORY_STYLE[group.categoryLabel] ?? DEFAULT_STYLE;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${style.iconBg}`}
        >
          <Icon className={`h-4 w-4 ${style.text}`} />
        </div>
        <h2 className={`font-bold ${style.text}`}>{group.categoryLabel}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {group.entries.map((e, i) => (
          <CitizenCard key={`${e.title}-${i}`} entry={e} style={style} />
        ))}
      </div>
    </section>
  );
}

export default function TopicsDPage() {
  const groups = buildTopicGroups(mockGeneralQuestions);

  return (
    <div>
      <p className="text-xs font-medium text-mirai-text-secondary mb-1">
        パターン D：県民向けキャッチー型
      </p>
      <h1 className="text-2xl font-bold text-mirai-text mb-1">
        県議会で何が決まった？
      </h1>
      <p className="text-sm text-mirai-text-secondary mb-8">
        議員が問い、県が答えた。あなたの暮らしに関わる取り組みをまとめました。
      </p>

      <div className="flex flex-col gap-10">
        {groups.map((g) => (
          <CategorySection key={g.categoryLabel} group={g} />
        ))}
      </div>
    </div>
  );
}
