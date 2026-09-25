"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PC_NAV_ITEMS, isNavItemActive } from "./nav-items";

/**
 * PC の横並びグローバルナビ（設計書 5.1 節）。
 *
 * `pc:`（1000px）以上でのみ表示し、それ未満はハンバーガーに任せる。
 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="グローバルナビゲーション"
      className="hidden pc:flex items-center gap-1"
    >
      {PC_NAV_ITEMS.map((item) => {
        const isActive = isNavItemActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2.5 text-sm whitespace-nowrap transition-colors",
              isActive
                ? // 紫のベタ塗り＋白文字は使わない（設計書 2.2節の原則1）
                  "bg-pref-pill-bg text-pref-pill-text font-medium"
                : "text-mirai-text hover:bg-pref-surface-tint"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
