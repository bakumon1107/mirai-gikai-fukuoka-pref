import "server-only";
import { Search } from "lucide-react";
import Link from "next/link";
import {
  OTHER_KEYWORDS_HREF,
  TOP_THEMES,
  type ThemeTone,
  splitThemeLabel,
  themeHref,
} from "@/features/top-themes/shared/utils/theme-mapping";

/** 系統ごとの配色（設計書 5.8.2 節） */
const TONE_STYLES: Record<ThemeTone, { tile: string; icon: string }> = {
  purple: {
    tile: "bg-pref-surface-tint",
    icon: "bg-mirai-gradient-start text-pref-accent-deep",
  },
  beige: {
    tile: "bg-pref-surface-sub",
    icon: "bg-mirai-surface-warm text-pref-beige-text",
  },
  coral: {
    tile: "bg-pref-coral-tint",
    icon: "bg-pref-coral-bg text-pref-coral-text",
  },
};

/**
 * 気になるテーマから（設計書 5.8 節）。
 *
 * 8タイル。リンク先は当面テーマページではなく検索ページ（5.8.4節）。
 * 「その他」タイルは作らず、下の「ほかのキーワードで探す」が受け皿になる。
 *
 * ※ 8タイル横一列は 1280px 前提。`pc:`（1000px）で8列にすると
 *   1タイル約88pxまで縮み「環境・エネルギー」が溢れるため、
 *   4列×2行 → `pcl:`（1400px）で8列、としている（設計書 5.8.3節）。
 *
 * ラベルは 390px では1行に収まらない（1タイル約70px に対し
 * 「環境・エネルギー」は 12px×8字＝96px）。デザイン指定どおり
 * 「・」で2行に割り、`md:`（700px）以上で1行に戻す。
 */
export function ThemeSection() {
  return (
    <section className="mx-4 mt-10 rounded-[28px] bg-white p-5 pc:mx-16 pc:mt-12 pc:rounded-[32px] pc:p-9">
      <div className="flex flex-col gap-1 pc:flex-row pc:items-baseline pc:justify-between">
        <h2 className="font-rounded text-xl font-bold text-mirai-text pc:text-2xl">
          気になるテーマから
        </h2>
        <p className="text-xs text-mirai-text-secondary pc:text-sm">
          テーマで横断検索できます
        </p>
      </div>

      <ul className="mt-4 grid grid-cols-4 gap-2 md:gap-2.5 pcl:grid-cols-8 pcl:gap-3">
        {TOP_THEMES.map((theme) => {
          const tone = TONE_STYLES[theme.tone];
          const { head, tail } = splitThemeLabel(theme.label);
          return (
            <li key={theme.slug}>
              <Link
                href={themeHref(theme)}
                className={`${tone.tile} flex h-full flex-col items-center gap-1.5 rounded-2xl px-0.5 py-3 text-center hover:opacity-80 md:gap-2.5 md:rounded-[18px] md:px-1.5 md:py-5`}
              >
                <span
                  aria-hidden
                  className={`${tone.icon} font-rounded flex size-10 items-center justify-center rounded-[13px] text-lg font-bold pcl:size-14 pcl:rounded-[18px] pcl:text-[26px]`}
                >
                  {theme.kanji}
                </span>
                <span className="text-xs leading-[1.35] font-medium text-mirai-text md:whitespace-nowrap pcl:text-sm">
                  {head}
                  {tail && (
                    <>
                      {/* 狭い画面では「・」を落として改行する（上のコメント参照） */}
                      <span className="hidden md:inline">・</span>
                      <span className="block md:inline">{tail}</span>
                    </>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* どのテーマにも入らない項目の導線。「その他」タイルは作らない（5.8.3節） */}
      <Link
        href={OTHER_KEYWORDS_HREF}
        className="mt-2.5 flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-pref-accent text-sm font-medium text-pref-pill-text hover:bg-pref-surface-tint pc:mt-3.5 pc:min-h-[52px] pc:text-[15px]"
      >
        <Search className="size-4 pc:size-[18px]" aria-hidden />
        ほかのキーワードで探す
      </Link>
    </section>
  );
}
