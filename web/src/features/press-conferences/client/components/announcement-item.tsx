"use client";

import { ChevronDown, ExternalLink, FileText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PressConferenceItem } from "../../shared/types";

type Props = {
  item: PressConferenceItem;
  index: number;
};

export function AnnouncementItem({ item, index }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border-l-4 border-primary shadow-sm px-5 py-4 flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-mirai-gradient-start text-primary-accent text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <h3 className="text-sm font-bold text-mirai-text">{item.title}</h3>
      </div>
      {item.summary && (
        <p className="text-sm text-mirai-text-secondary leading-relaxed pl-9">
          {item.summary}
        </p>
      )}
      {item.detail && (
        <div className="pl-9 flex flex-col gap-2">
          <Button
            type="button"
            variant="link"
            onClick={() => setIsOpen((v) => !v)}
            className="w-fit gap-1 p-0 h-auto text-xs font-medium text-primary-accent no-underline hover:underline"
          >
            {isOpen ? "閉じる" : "詳しく見る"}
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
          {isOpen && (
            <p className="text-sm text-mirai-text-secondary leading-relaxed whitespace-pre-line">
              {item.detail}
            </p>
          )}
        </div>
      )}
      {item.materialUrl && (
        <a
          href={item.materialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-accent hover:underline pl-9 w-fit"
        >
          <FileText className="w-3.5 h-3.5" />
          配付資料（PDF）
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      )}
    </div>
  );
}
