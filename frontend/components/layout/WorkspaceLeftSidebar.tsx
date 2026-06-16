"use client";

import type { ReactNode } from "react";

interface WorkspaceLeftSidebarProps {
  tools: ReactNode;
  middle?: ReactNode;
  footer?: ReactNode;
  projectName?: string;
  projectType?: string;
  hasBoundary?: boolean;
  hasAlignment?: boolean;
}

/** Viewport-bound left rail — scrollable stack of tool / parameter sections. */
export default function WorkspaceLeftSidebar({
  tools,
  middle,
  footer,
  projectName,
  projectType,
}: WorkspaceLeftSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0B111C]">
      <div className="shrink-0 border-b border-[rgba(148,163,184,0.14)] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
          Project Intelligence
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-[#F8FAFC]">
          {projectName ?? "Active workspace"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[#94A3B8]">
          {projectType ?? "Infrastructure"} · Visual planning mode
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 scrollbar-thin-dark">
        {tools}
        {middle}
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-[rgba(148,163,184,0.12)] bg-[rgba(5,7,10,0.72)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
