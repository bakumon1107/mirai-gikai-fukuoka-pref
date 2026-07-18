"use client";

import { ChevronDown, LayoutGrid } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type BannerAccordionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * トップページのバナーをまとめる開閉式グループ。
 * ページ上部が縦に長くなりすぎるのを防ぐため、関連バナーを1つに畳む。
 */
export function BannerAccordion({
  title,
  description,
  children,
}: BannerAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 text-left transition-colors hover:border-primary">
        <div className="flex items-start gap-3">
          <LayoutGrid className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          <div>
            <p className="font-bold text-mirai-text">{title}</p>
            {description && (
              <p className="mt-0.5 text-sm text-mirai-text-secondary">
                {description}
              </p>
            )}
          </div>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-mirai-text-muted transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 flex flex-col gap-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
