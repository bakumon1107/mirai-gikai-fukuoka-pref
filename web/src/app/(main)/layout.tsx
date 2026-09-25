import { GoogleAnalytics } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { AuthGate } from "@/components/layouts/auth-gate";
import { Footer } from "@/components/layouts/footer/footer";
import { MainLayout } from "@/components/layouts/main-layout";
import { MobileBottomNav } from "@/components/layouts/navigation/mobile-bottom-nav";
import { siteConfig } from "@/config/site.config";
import { env } from "@/lib/env";
import { RubyfulInitializer } from "@/lib/rubyful";
import { TextSizeInitializer } from "@/lib/text-size";

export default function MainGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <SpeedInsights />
      <GoogleAnalytics gaId={env.analytics.gaTrackingId ?? ""} />
      <RubyfulInitializer />
      <TextSizeInitializer />
      {/*
        AuthGate は匿名サインインでセッションを用意する副作用専用のコンポーネント。
        セッションを必要とするのは AIチャット / AIインタビュー（サーバー側で
        getUser() して未ログインなら弾く作り）なので、機能が無効なときは動かさない。
        無条件に置くと、機能OFFでも全ページで signInAnonymously() を叩いてしまう
        （匿名サインインが無効なプロジェクトでは 422、有効なプロジェクトでは
        使われない匿名ユーザーが訪問者ごとに auth.users に溜まり続ける）。
        なお report-reaction 等は各コンポーネントが自前で同じフックを呼ぶため影響しない。
      */}
      {(siteConfig.features.aiChat || siteConfig.features.aiInterview) && (
        <AuthGate />
      )}

      <MainLayout>
        <Header />
        <main className="min-h-dvh md:min-h-[calc(100dvh-96px)] bg-mirai-surface">
          {children}
        </main>
        <Footer />
        {/* ボトムナビは fixed なので、ページ末尾（=フッターの下端）が隠れる。
            余白は main ではなくドキュメント末尾に置く。
            main に付けると本文とフッターのあいだに無用な隙間ができるだけで、
            実際に隠れるフッター下端は救えない */}
        <div
          aria-hidden
          className="h-[calc(72px+env(safe-area-inset-bottom))] pc:hidden"
        />
        <MobileBottomNav />
      </MainLayout>
    </>
  );
}
