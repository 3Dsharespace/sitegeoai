"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
  className,
  compact,
  bare,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  compact?: boolean;
  bare?: boolean;
}) {
  return (
    <div className={cn("flex gap-0.5 rounded-lg p-0.5", !bare && "panel-glass", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md font-medium transition-all duration-150",
            compact ? "px-2 py-1 text-[10px]" : "flex-1 px-3 py-1.5 text-xs",
            active === tab.id
              ? "bg-[rgba(59,130,246,0.18)] text-foreground border border-primary/40"
              : "text-muted-foreground hover:text-foreground hover:bg-[rgba(148,163,184,0.12)] border border-transparent",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
