"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact pill toggle for map toolbar (e.g. transparent underground view). */
export default function MapToolbarToggle({
  label,
  active,
  onChange,
  title,
  icon: Icon,
  className,
}: {
  label: string;
  active: boolean;
  onChange: () => void;
  title: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onChange}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all duration-200 backdrop-blur-md",
        active
          ? "border-[rgba(59,130,246,0.4)] bg-[rgba(59,130,246,0.2)] text-[#38BDF8] shadow-[0_0_12px_-2px_rgba(59,130,246,0.4)]"
          : "border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.85)] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.04]",
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </button>
  );
}
