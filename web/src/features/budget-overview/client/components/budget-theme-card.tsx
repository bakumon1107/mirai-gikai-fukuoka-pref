"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full text-left">
        <div className="flex items-start justify-between gap-3 p-4 bg-mirai-surface-grouped rounded-lg hover:bg-mirai-surface-muted transition-colors">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-mirai-text">{theme.title}</h3>
            {theme.ai_summary && (
              <p className="mt-1 text-sm text-mirai-text-secondary">
                {theme.ai_summary}
              </p>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 shrink-0 text-mirai-text-muted transition-transform duration-200 mt-0.5 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ul className="mt-2 space-y-2 pl-2">
          {theme.initiatives.map((initiative) => (
            <li
              key={initiative.id}
              className="border-l-2 border-primary-accent pl-4 py-2"
            >
              <div className="flex items-start gap-2 flex-wrap">
                <span className="font-medium text-sm text-mirai-text">
                  {initiative.title}
                </span>
                <BudgetInitiativeBadge badge={toBadge(initiative.badge)} />
              </div>
              {initiative.description && (
                <p className="mt-1 text-sm text-mirai-text-secondary">
                  {initiative.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
