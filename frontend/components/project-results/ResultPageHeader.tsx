"use client";

import type { ReactNode } from "react";
import { StatusPill } from "@/components/project-results/StatusPill";
import { cn } from "@/lib/utils";

export default function ResultPageHeader({
  title,
  subtitle,
  status = "Preliminary",
  statusVariant = "warning",
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  statusVariant?: "warning" | "success" | "accent" | "muted";
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-[#F8FAFC] sm:text-2xl">{title}</h1>
          <StatusPill label={status} variant={statusVariant} />
        </div>
        {subtitle && <p className="text-sm leading-relaxed text-[#94A3B8] max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
