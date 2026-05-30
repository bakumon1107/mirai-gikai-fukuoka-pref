"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { BudgetTheme, BudgetInitiative } from "../../shared/types";
import { BudgetInitiativeBadge } from "./budget-initiative-badge";

type BadgeType = "new" | "expanded" | "continued" | null;

function toBadge(value: string | null): BadgeType {
  return value === "new" || value === "expanded" || value === "continued"
    ? value
    : null;
}

type BudgetThemeCardProps = {
  theme: BudgetTheme & { initiatives: BudgetInitiative[] };
};

export function BudgetThemeCard({ theme }: BudgetThemeCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasInitiatives = theme.initiatives.length > 0;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* 常に表示: タイトル + 総評 */}
      <div className="p-5">
        <h3 className="font-bold text-mirai-text leading-snug">
          {theme.title}
        </h3>
        {theme.ai_summary && (
          <p className="mt-2 text-sm text-mirai-text-secondary leading-relaxed">
            {theme.ai_summary}
          </p>
        )}

        {hasInitiatives && (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
            {isOpen ? "閉じる" : `施策を見る（${theme.initiatives.length}件）`}
          </button>
        )}
      </div>

      {/* 展開時: 施策一覧 */}
      {isOpen && hasInitiatives && (
        <div className="border-t border-border px-5 py-4 bg-mirai-surface-grouped">
          <ul className="space-y-3">
            {theme.initiatives.map((initiative) => (
              <li key={initiative.id}>
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="font-medium text-sm text-mirai-text leading-snug">
                    {initiative.title}
                  </span>
                  <BudgetInitiativeBadge badge={toBadge(initiative.badge)} />
                </div>
                {initiative.description && (
                  <p className="mt-1 text-sm text-mirai-text-secondary leading-relaxed">
                    {initiative.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
