"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, X } from "lucide-react";
import ModernAssistantPanel from "@/components/ai/ModernAssistantPanel";
import { Button } from "@/components/ui/button";
import type { DesignOutput } from "@/lib/types";

interface Props {
  projectId: number;
  design?: DesignOutput | null;
  onApplyParameters: (params: Record<string, unknown>) => void;
  onRegenerate: (params: Record<string, unknown>) => void;
}

export default function MobileAiDrawer({
  projectId,
  design,
  onApplyParameters,
  onRegenerate,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        className="md:hidden fixed bottom-[4.5rem] right-4 z-40 h-11 w-11 rounded-full shadow-lg panel-glass border-primary/30"
        onClick={() => setOpen(true)}
        aria-label="Open AI Copilot"
      >
        <Bot className="h-5 w-5 text-primary" />
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 modal-overlay md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320, duration: 0.25 }}
              className="fixed inset-x-0 bottom-0 z-50 h-[80vh] rounded-t-xl overflow-hidden md:hidden panel-elevated border-t border-border"
            >
              <div className="flex justify-center pt-2 pb-1">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close"
                className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-md panel border border-border"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="h-full">
                <ModernAssistantPanel
                  projectId={projectId}
                  design={design}
                  onApplyParameters={onApplyParameters}
                  onRegenerate={onRegenerate}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
