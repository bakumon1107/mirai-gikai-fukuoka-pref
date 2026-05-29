import type {
  BillStatusEnum,
  FactionStance,
  StanceTypeEnum,
} from "../../../shared/types";
import { STANCE_LABELS } from "../../../shared/types";

function getStanceBadgeStyle(type: StanceTypeEnum) {
  switch (type) {
    case "for":
    case "conditional_for":
      return {
        bg: "bg-[#ECFCF1]",
        textColor: "text-[#0F8472]",
      };
    case "against":
    case "conditional_against":
      return {
        bg: "bg-[#FFF1F1]",
        textColor: "text-[#C9272A]",
      };
    default:
      return {
        bg: "bg-[#E5E5EA]",
        textColor: "text-black",
      };
  }
}

type FactionStanceRowProps = {
  stance: FactionStance;
};

function FactionStanceRow({ stance }: FactionStanceRowProps) {
  const style = getStanceBadgeStyle(stance.stance);

  return (
    <div className="flex flex-col gap-2 py-4 border-b last:border-0">
      <div className="flex items-center justify-between gap-4">
        <span className="font-semibold text-base">
          {stance.faction.display_name}
        </span>
        <span
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold ${style.bg} ${style.textColor}`}
        >
          {STANCE_LABELS[stance.stance]}
        </span>
      </div>
      {stance.comment && (
        <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
          {stance.comment}
        </p>
      )}
    </div>
  );
}

// 無所属議員の個人名一覧（福岡県議会）
const MUSHOZOKU_MEMBERS = [
  "あべ ひでき",
  "新開 ゆうじ",
  "木村 てつあき",
  "森 あやこ",
  "川口 浩",
];

function expandStances(stances: FactionStance[]): FactionStance[] {
  return stances.flatMap((stance) => {
    if (stance.faction.display_name !== "無所属") return [stance];
    return MUSHOZOKU_MEMBERS.map((name, i) => ({
      ...stance,
      id: `${stance.id}-${i}`,
      faction: { ...stance.faction, display_name: name },
    }));
  });
}

interface FactionStanceCardProps {
  stances: FactionStance[];
  billStatus?: BillStatusEnum;
}

export function FactionStanceCard({
  stances,
  billStatus,
}: FactionStanceCardProps) {
  const isPreparing = billStatus === "preparing";

  if (!isPreparing && stances.length === 0) {
    return null;
  }

  const expandedStances = expandStances(stances);

  return (
    <>
      <h2 className="text-[22px] font-bold mb-4">🗳️会派の賛否</h2>
      <div className="rounded-2xl border bg-white px-6 py-2">
        {isPreparing && expandedStances.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            議案上程後に各会派の賛否を表明します。
          </p>
        ) : (
          <div>
            {expandedStances.map((stance) => (
              <FactionStanceRow key={stance.id} stance={stance} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
