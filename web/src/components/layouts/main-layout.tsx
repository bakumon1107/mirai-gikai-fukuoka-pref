"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site.config";
import {
  isInterviewSection,
  isMainPage,
  isWidePage,
} from "@/lib/page-layout-utils";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const useSidebarLayout = isMainPage(pathname) && siteConfig.features.aiChat;
  const isInterview = isInterviewSection(pathname);
  const isWide = isWidePage(pathname);

  // 幅広ページ: 700px制約を外してヘッダと同じ1440pxまで使う。
  // 固定ヘッダに重ならないよう、モバイル含む全幅で上余白を確保する。
  //
  // ここで早期returnすると useSidebarLayout の余白が付かず、aiChat を
  // 有効にしたときに固定表示の ChatWindow（右500px）と本文が重なる。
  // 条件を合成して両立させる（設計書 4.2節）
  if (isWide) {
    return (
      <div
        className={cn(
          "relative max-w-[1440px] mx-auto mt-24",
          useSidebarLayout && "pc:mr-[500px]"
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative max-w-[700px] mx-auto md:mt-24",
        // インタビューページ以外ではshadowを表示
        !isInterview && "sm:shadow-lg",
        // TOPページと法案詳細ページのみ、チャットサイドバー用のオフセット
        useSidebarLayout && "pc:mr-[500px] xl:ml-[calc(calc(100vw-1180px)/2)]"
      )}
    >
      {children}
    </div>
  );
}
