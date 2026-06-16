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
              ? "bg-[rgba(59,130,246,0.2)] text-[#38BDF8] border border-[rgba(59,130,246,0.4)] shadow-[0_0_16px_-4px_rgba(59,130,246,0.45)]"
              : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04] border border-transparent",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
