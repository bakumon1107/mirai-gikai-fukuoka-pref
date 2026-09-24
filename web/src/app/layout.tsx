import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Zen_Maru_Gothic } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { siteConfig } from "@/config/site.config";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

/**
 * 見出し用の丸ゴシック（設計書 3章）。
 *
 * weight は 700 のみ。参照デザインは見出しにほぼ 700 しか使っていない。
 * subsets に "japanese" は無く、日本語グリフは preload されず
 * unicode-range で遅延取得される（Noto Sans JP と同じ挙動）。
 * 適用は見出し等に限定し、本文には使わない。
 */
const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru-gothic",
  subsets: ["latin"],
  weight: ["700"],
});

const ogImage = {
  url: "/ogp.jpg",
  width: 1200,
  height: 630,
  alt: `${siteConfig.siteName}のOGPイメージ`,
};

export const metadata: Metadata = {
  metadataBase: new URL(env.webUrl),
  title: siteConfig.siteName,
  description: siteConfig.siteDescription,
  keywords: [...siteConfig.keywords],
  icons: {
    icon: "/icons/pwa/icon_fukuoka.svg",
    apple: "/icons/pwa/icon_fukuoka.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: siteConfig.siteName,
    description: siteConfig.siteDescription,
    images: [ogImage],
    siteName: siteConfig.siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.siteName,
    description: siteConfig.siteDescription,
    images: [ogImage.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // 旧ティール(#2aa693)の名残だったため、現行のテーマカラーに合わせる（設計書 2.4節）
  themeColor: "#a495d6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${zenMaruGothic.variable} font-sans antialiased bg-mirai-surface-light`}
      >
        <NextTopLoader showSpinner={false} color="#5a5591" />
        {children}
      </body>
    </html>
  );
}
