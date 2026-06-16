"use client";

import type { ReactNode } from "react";
import BottomSummaryBar, { type SummaryStats } from "@/components/layout/BottomSummaryBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { cn } from "@/lib/utils";

export default function ProjectResultShell({
  projectId,
  stats,
  loading,
  children,
  maxWidth = "max-w-7xl",
  flush,
}: {
  projectId: number;
  stats: SummaryStats;
  loading?: boolean;
  children: ReactNode;
  maxWidth?: string;
  /** Full-bleed layout (e.g. site analysis map). */
  flush?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[#05070A] pb-14 md:pb-0">
      <div
        className={cn(
          "flex-1 min-h-0",
          flush ? "flex flex-col overflow-hidden" : cn("overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 space-y-6 mx-auto w-full", maxWidth),
        )}
      >
        {children}
      </div>
      <MobileBottomNav projectId={projectId} />
      <BottomSummaryBar stats={stats} loading={loading} />
    </div>
  );
}
