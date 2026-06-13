"use client";

import type { ReactNode } from "react";

interface WorkspaceLeftSidebarProps {
  tools: ReactNode;
  middle?: ReactNode;
  footer?: ReactNode;
}

/** Viewport-bound left rail — scrollable stack of tool / parameter sections. */
export default function WorkspaceLeftSidebar({ tools, middle, footer }: WorkspaceLeftSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3">
        {tools}
        {middle}
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-border">{footer}</div>
      ) : null}
    </div>
  );
}
