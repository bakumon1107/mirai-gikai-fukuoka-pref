import { ComponentShowcase } from "../_components/component-showcase";
import { PreviewSection } from "../_components/preview-section";

/**
 * トップページ刷新で追加したデザイントークンの確認用ページ。
 *
 * 設計書 docs/fukuoka-pref/20260922_1645_トップページレイアウト刷新設計書.md 2〜3章
 */

type Swatch = {
  token: string;
  className: string;
  note: string;
};

const SURFACES: Swatch[] = [
  { token: "pref-hero", className: "bg-pref-hero", note: "ヒーロー面" },
  {
    token: "pref-surface-tint",
    className: "bg-pref-surface-tint",
    note: "サブ面・「いまここ」",
  },
  {
    token: "pref-surface-sub",
    className: "bg-pref-surface-sub",
    note: "定例会カード",
  },
  {
    token: "mirai-surface-warm",
    className: "bg-mirai-surface-warm",
    note: "ベージュ面（既存）",
  },
  {
    token: "mirai-gradient-start",
    className: "bg-mirai-gradient-start",
    note: "紫アイコン面（既存）",
  },
  {
    token: "pref-coral-tint",
    className: "bg-pref-coral-tint",
    note: "コーラルタイル面",
  },
];

/** 実際に使う前景色と背景色の組み合わせ。値は設計書 2.3 節の検算結果 */
const PAIRS = [
  {
    label: "リンク・強調文字",
    className: "bg-white text-pref-accent",
    ratio: "6.68:1",
  },
  {
    label: "hover",
    className: "bg-white text-pref-accent-hover",
    ratio: "9.08:1",
  },
  {
    label: "ヒーロー面の上の文字",
    className: "bg-pref-hero text-pref-accent-deep",
    ratio: "9.10:1",
  },
  {
    label: "状態ピル",
    className: "bg-pref-pill-bg text-pref-pill-text",
    ratio: "7.72:1",
  },
  {
    label: "ベージュ面の上の文字",
    className: "bg-mirai-surface-warm text-pref-beige-text",
    ratio: "7.85:1",
  },
  {
    label: "コーラル",
    className: "bg-pref-coral-bg text-pref-coral-text",
    ratio: "7.59:1",
  },
  {
    label: "紫アイコン面の上の文字",
    className: "bg-mirai-gradient-start text-pref-accent-deep",
    ratio: "7.48:1",
  },
];

export default function DesignTokensPreview() {
  return (
    <div className="flex flex-col">
      <ComponentShowcase
        title="Colors / 面"
        description="globals.css @theme inline の pref-* トークン"
      >
        <PreviewSection label="Surfaces">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {SURFACES.map((s) => (
              <div
                key={s.token}
                className={`${s.className} rounded-[22px] p-4 border border-pref-divider`}
              >
                <p className="text-sm font-bold text-mirai-text">{s.token}</p>
                <p className="text-xs text-mirai-text-secondary">{s.note}</p>
              </div>
            ))}
          </div>
        </PreviewSection>
      </ComponentShowcase>

      <ComponentShowcase
        title="Colors / 文字と背景の組み合わせ"
        description="設計書 2.3 節で検算済み。すべて 4.5:1 以上"
      >
        <PreviewSection label="実際に使う組み合わせ">
          <div className="flex flex-col gap-2">
            {PAIRS.map((p) => (
              <div
                key={p.label}
                className={`${p.className} rounded-full px-5 py-3 flex items-center justify-between gap-4`}
              >
                <span className="text-sm font-bold">{p.label}</span>
                <span className="text-xs">{p.ratio}</span>
              </div>
            ))}
          </div>
        </PreviewSection>

        <PreviewSection label="使ってはいけない組み合わせ（2.3節）">
          {/* 見本は禁止の配色そのままで見せるが、説明文まで読みにくくしない。
              説明は通常の本文色で外に出す */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="bg-pref-pill-bg text-pref-accent rounded-full px-5 py-3 text-sm font-bold">
                読みにくい見本
              </span>
              <span className="bg-pref-pill-bg text-pref-pill-text rounded-full px-5 py-3 text-sm font-bold">
                正しい見本
              </span>
            </div>
            <p className="text-sm text-mirai-text">
              <code>pref-accent</code> を <code>pref-pill-bg</code> の上に置くと
              <strong> 4.16:1</strong> で 4.5:1 を下回る。ピルの文字は
              <code> pref-pill-text</code>（7.72:1）を使う。
            </p>
          </div>
        </PreviewSection>
      </ComponentShowcase>

      <ComponentShowcase
        title="Typography"
        description="見出しは font-rounded（Zen Maru Gothic 700）、本文は font-sans"
      >
        <PreviewSection label="font-rounded（見出し用）">
          <div className="flex flex-col gap-2">
            <p className="font-rounded text-[42px] leading-[1.4] text-mirai-text">
              福岡県、いま何が話されてる？
            </p>
            <p className="font-rounded text-2xl text-mirai-text">
              定例会は年4回。議会の本番です
            </p>
            <p className="font-rounded text-[22px] text-mirai-text">2月</p>
          </div>
        </PreviewSection>

        <PreviewSection label="font-sans（本文用・比較）">
          <p className="text-base text-mirai-text">
            福岡県、いま何が話されてる？
          </p>
        </PreviewSection>

        <PreviewSection label="テーマタイルの漢字アイコン">
          <div className="flex gap-3">
            {[
              ["育", "bg-pref-coral-bg text-pref-coral-text"],
              ["医", "bg-mirai-gradient-start text-pref-accent-deep"],
              ["防", "bg-mirai-surface-warm text-pref-beige-text"],
            ].map(([kanji, cls]) => (
              <span
                key={kanji}
                className={`${cls} font-rounded w-14 h-14 rounded-[18px] flex items-center justify-center text-[26px]`}
              >
                {kanji}
              </span>
            ))}
          </div>
        </PreviewSection>
      </ComponentShowcase>
    </div>
  );
}
