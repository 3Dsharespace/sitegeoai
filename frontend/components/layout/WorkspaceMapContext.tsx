"use client";

import { createContext, useContext } from "react";

interface WorkspaceMapContextValue {
  focusMode: boolean;
  toolsOpen: boolean;
  copilotOpen: boolean;
  onOpenTools: () => void;
  onOpenCopilot: () => void;
}

const WorkspaceMapContext = createContext<WorkspaceMapContextValue>({
  focusMode: false,
  toolsOpen: false,
  copilotOpen: false,
  onOpenTools: () => {},
  onOpenCopilot: () => {},
});

export function WorkspaceMapProvider({
  value,
  children,
}: {
  value: WorkspaceMapContextValue;
  children: React.ReactNode;
}) {
  return <WorkspaceMapContext.Provider value={value}>{children}</WorkspaceMapContext.Provider>;
}

export function useWorkspaceMap() {
  return useContext(WorkspaceMapContext);
}
