"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, Minimize2, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import ModernAssistantPanel from "@/components/ai/ModernAssistantPanel";
import { WorkspaceMapProvider } from "@/components/layout/WorkspaceMapContext";
import { Button } from "@/components/ui/button";
import type { DesignOutput } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";

const LEFT_WIDTH = 208;
const RIGHT_WIDTH = 320;

function focusKey(projectId: number) {
  return `project-${projectId}-focus-mode`;
}

function readStoredFocus(projectId: number, defaultFocus: boolean) {
  if (typeof window === "undefined") return defaultFocus;
  const stored = localStorage.getItem(focusKey(projectId));
  return stored !== null ? stored === "true" : defaultFocus;
}

interface AiProps {
  projectId: number;
  design?: DesignOutput | null;
  onApplyParameters: (params: Record<string, unknown>) => void;
  onRegenerate: (params: Record<string, unknown>) => void;
  currentParameters?: Record<string, unknown> | null;
}

interface WorkspaceLayoutProps {
  projectId: number;
  ai: AiProps;
  leftPanel: ReactNode;
  map: ReactNode;
  defaultFocus?: boolean;
}

export default function WorkspaceLayout({
  projectId,
  ai,
  leftPanel,
  map,
  defaultFocus = false,
}: WorkspaceLayoutProps) {
  const [focusMode, setFocusMode] = useState(() => readStoredFocus(projectId, defaultFocus));
  const [focusProjectId, setFocusProjectId] = useState(projectId);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const setWorkspaceFullscreen = useProjectStore((s) => s.setWorkspaceFullscreen);

  if (projectId !== focusProjectId) {
    setFocusProjectId(projectId);
    setFocusMode(readStoredFocus(projectId, defaultFocus));
  }

  useLayoutEffect(() => {
    setWorkspaceFullscreen(focusMode);
  }, [focusMode, setWorkspaceFullscreen]);

  useEffect(() => () => setWorkspaceFullscreen(false), [setWorkspaceFullscreen]);

  const toggleFocus = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      localStorage.setItem(focusKey(projectId), String(next));
      if (next) {
        setLeftOpen(false);
        setRightOpen(false);
      }
      return next;
    });
  }, [projectId]);

  useEffect(() => {
    const onOpenCopilot = () => setRightOpen(true);
    window.addEventListener("geoai:open-copilot", onOpenCopilot);
    return () => window.removeEventListener("geoai:open-copilot", onOpenCopilot);
  }, []);

  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (leftOpen || rightOpen) {
          setLeftOpen(false);
          setRightOpen(false);
        } else {
          toggleFocus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, leftOpen, rightOpen, toggleFocus]);

  useEffect(() => {
    if (!focusMode || (!leftOpen && !rightOpen)) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [focusMode, leftOpen, rightOpen]);

  const showInlineLeft = !focusMode;
  const showInlineRight = !focusMode;

  return (
    <>
      <div
        className={cn(
          "flex-1 flex min-h-0 overflow-hidden relative",
          focusMode && "fixed inset-0 z-[35] bg-background",
        )}
      >
        {showInlineLeft && (
          <aside className="hidden lg:flex w-52 shrink-0 min-h-0 flex-col border-r border-border bg-background-secondary overflow-hidden">
            {leftPanel}
          </aside>
        )}

        <WorkspaceMapProvider
          value={{
            focusMode,
            toolsOpen: leftOpen,
            copilotOpen: rightOpen,
            onOpenTools: () => setLeftOpen(true),
            onOpenCopilot: () => setRightOpen(true),
          }}
        >
          <div className="flex-1 min-w-0 min-h-0 relative overflow-hidden">
            {focusMode && (
              <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 pointer-events-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 panel-glass shadow-md text-xs"
                  onClick={() => window.dispatchEvent(new CustomEvent("geoai:open-nav"))}
                >
                  <Menu className="h-3.5 w-3.5" />
                  Menu
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 panel-glass shadow-md text-xs"
                  onClick={toggleFocus}
                  title="Exit full screen (Esc)"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  Exit
                </Button>
              </div>
            )}
            <div className="absolute inset-0">{map}</div>
          </div>
        </WorkspaceMapProvider>

        {showInlineRight && (
          <aside className="hidden md:flex w-[320px] shrink-0 min-h-0 flex-col border-l border-border overflow-hidden">
            <ModernAssistantPanel {...ai} />
          </aside>
        )}
      </div>

      <AnimatePresence>
        {focusMode && leftOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 modal-overlay"
              onClick={() => setLeftOpen(false)}
            />
            <motion.aside
              initial={{ x: -LEFT_WIDTH - 20 }}
              animate={{ x: 0 }}
              exit={{ x: -LEFT_WIDTH - 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed inset-y-0 left-0 z-50 w-52 flex flex-col border-r border-border bg-sidebar shadow-xl"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                <span className="text-xs font-semibold">Engineering Tools</span>
                <button
                  title="Close"
                  type="button"
                  onClick={() => setLeftOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">{leftPanel}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {focusMode && rightOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 modal-overlay"
              onClick={() => setRightOpen(false)}
            />
            <motion.aside
              initial={{ x: RIGHT_WIDTH + 20 }}
              animate={{ x: 0 }}
              exit={{ x: RIGHT_WIDTH + 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed inset-y-0 right-0 z-50 w-[320px] flex flex-col border-l border-border bg-sidebar shadow-xl"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                <span className="text-xs font-semibold">AI Copilot</span>
                <button
                  title="Close"
                  type="button"
                  onClick={() => setRightOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ModernAssistantPanel {...ai} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
