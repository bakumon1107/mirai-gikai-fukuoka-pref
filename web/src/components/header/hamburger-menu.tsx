"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RubyToggle } from "@/lib/rubyful";
import { TextSizeToggle } from "@/lib/text-size";

const NAV_LINKS = [
  { href: "/", label: "トップページ" },
  { href: "/sessions", label: "過去の定例会" },
  { href: "/budget", label: "過去の予算" },
  { href: "/committees", label: "委員会" },
  { href: "/press-conferences", label: "知事記者会見" },
] as const;

export function HamburgerMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          aria-label="メニューを開く"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52" align="end">
        <nav className="flex flex-col">
          {/* PC はヘッダーに横並びナビがあるためリンクは出さない。
              ただしルビ・文字サイズの設定はここにしか無いので、
              メニュー自体は全幅で残す（PCでは設定のみのメニューになる） */}
          <ul className="flex flex-col divide-y divide-mirai-border pc:hidden">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block px-2 py-2.5 text-sm font-medium text-mirai-text hover:text-primary-accent transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="pt-3 mt-3 border-t border-mirai-border flex flex-col gap-3 pc:pt-0 pc:mt-0 pc:border-t-0">
            <RubyToggle />
            <TextSizeToggle />
          </div>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
