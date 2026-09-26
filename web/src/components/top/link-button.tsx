import Image from "next/image";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface LinkButtonProps {
  href: string;
  icon: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  children: ReactNode;
  target?: string;
  rel?: string;
}

export function LinkButton({
  href,
  icon,
  children,
  target = "_blank",
  rel = "noopener noreferrer",
}: LinkButtonProps) {
  return (
    // Button の既定は whitespace-nowrap で、長いラベルだと親をはみ出す。
    // 「本家「みらい議会」（国会版）を見に行く」は 390px の画面で
    // 枠358pxに対し378px必要になり、ページ全体に横スクロールが出ていた。
    // max-w-full で親を超えないようにし、ラベルは折り返させる
    <Button
      asChild
      variant="outline"
      className="w-fit max-w-full rounded-full px-6 py-3 h-auto whitespace-normal"
    >
      <a href={href} target={target} rel={rel}>
        <Image
          src={icon.src}
          alt={icon.alt}
          width={icon.width}
          height={icon.height}
          className="flex-shrink-0"
        />
        <span className="text-left text-[15px] font-bold">{children}</span>
        <Image
          src="/icons/arrow-right.svg"
          alt=""
          width={16}
          height={15}
          className="flex-shrink-0"
        />
      </a>
    </Button>
  );
}
