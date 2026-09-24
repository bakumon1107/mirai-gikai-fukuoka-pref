"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { DifficultySelector } from "@/features/bill-difficulty/client/components/difficulty-selector";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { InterviewHeaderActions } from "@/features/interview-session/client/components/interview-header-actions";
import { isInterviewPage, isMainPage } from "@/lib/page-layout-utils";
import { siteConfig } from "@/config/site.config";
import { DesktopNav } from "@/components/layouts/navigation/desktop-nav";
import { HamburgerMenu } from "./hamburger-menu";

interface HeaderClientProps {
  difficultyLevel: DifficultyLevelEnum;
}

export function HeaderClient({ difficultyLevel }: HeaderClientProps) {
  const pathname = usePathname();
  const showDifficultySelector = isMainPage(pathname);
  const showInterviewActions = isInterviewPage(pathname);

  return (
    <header className="px-3 fixed top-4 left-0 right-0 z-10 max-w-[1440px] mx-auto">
      <div className="rounded-2xl bg-white shadow-sm mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Site Title */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-2"
              aria-label="ホーム"
            >
              {siteConfig.features.showTeamMiraiSection && (
                <Image
                  src="/img/logo.svg"
                  alt={siteConfig.siteName}
                  width={42}
                  height={36}
                />
              )}
              <div className="text-sm sm:text-base font-bold whitespace-nowrap">
                {siteConfig.siteName}
              </div>
            </Link>
          </div>

          {/* PC のみ: 横並びグローバルナビ（設計書 5.1節） */}
          <DesktopNav />

          {/* Navigation */}
          <nav
            className="flex items-center space-x-2"
            aria-label="補助ナビゲーション"
          >
            {showDifficultySelector && (
              <DifficultySelector currentLevel={difficultyLevel} />
            )}
            {showInterviewActions && <InterviewHeaderActions />}
            <Link
              href="/search"
              aria-label="検索"
              className="p-2 text-mirai-text-muted hover:text-mirai-text transition-colors"
            >
              <Search className="size-5" />
            </Link>
            {/* PC は横並びナビがあるためハンバーガーを出さない */}
            <div className="pc:hidden">
              <HamburgerMenu />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
