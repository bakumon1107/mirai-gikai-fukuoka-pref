"use client";

import { Coins, Home, Landmark, Megaphone, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isInterviewSection } from "@/lib/page-layout-utils";
import {
  MOBILE_NAV_ITEMS,
  type MobileNavIcon,
  isNavItemActive,
} from "./nav-items";

const ICONS: Record<MobileNavIcon, typeof Home> = {
  home: Home,
  megaphone: Megaphone,
  users: Users,
  landmark: Landmark,
  coins: Coins,
};

/**
 * スマホのボトムナビ（設計書 5.2 節）。
 *
 * 高さ72px・5等分。`pc:`（1000px）以上では非表示。
 * ホームバーと重ならないよう `env(safe-area-inset-bottom)` を足す。
 *
 * ※ チャットFAB（chat-button.tsx）も `fixed bottom-4 pc:hidden` で同じ位置に出る。
 *   現状は siteConfig.features.aiChat が false のため描画されないが、
 *   有効化する際は FAB を bottom-[88px] 相当へ逃がすこと。
 */
export function MobileBottomNav() {
  const pathname = usePathname();

  // インタビューは専用レイアウトなのでナビを出さない
  if (isInterviewSection(pathname)) return null;

  return (
    <>
      {/* ページ末尾がナビに隠れないための余白。
          ナビと同じ条件で出し入れする必要があるためここに置く
          （レイアウト側に置くと、ナビが出ないインタビューでも隙間が空く） */}
      <div
        aria-hidden
        className="h-[calc(72px+env(safe-area-inset-bottom))] pc:hidden"
      />
      <nav
        aria-label="グローバルナビゲーション"
        className="pc:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-pref-divider bg-white pb-[env(safe-area-inset-bottom)]"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const isActive = isNavItemActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-[72px] flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "text-pref-pill-text" : "text-mirai-text-secondary"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  isActive && "bg-pref-pill-bg"
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className={cn("text-xs", isActive && "font-medium")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
