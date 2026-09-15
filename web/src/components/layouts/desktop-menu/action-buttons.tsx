import { LinkButton } from "@/components/top/link-button";
import { siteConfig } from "@/config/site.config";

/**
 * デスクトップメニュー: アクションボタン（サイドバー内）
 *
 * note記事・寄附リンクは本家（チームみらい運営）向けの導線のため、
 * それぞれ設定が有効な場合のみ表示する。
 */
export function DesktopMenuActionButtons() {
  return (
    <div className="flex flex-col gap-3">
      {siteConfig.externalLinks.aboutNote && (
        <LinkButton
          href={siteConfig.externalLinks.aboutNote}
          icon={{
            src: "/icons/note-icon.png",
            alt: "note",
            width: 20,
            height: 20,
          }}
        >
          {siteConfig.siteName}とは
        </LinkButton>
      )}

      {siteConfig.features.showTeamMiraiSection && (
        <LinkButton
          href={siteConfig.externalLinks.donation}
          icon={{
            src: "/icons/heart-icon.svg",
            alt: "寄附",
            width: 20,
            height: 20,
          }}
        >
          寄附で応援する
        </LinkButton>
      )}
    </div>
  );
}
