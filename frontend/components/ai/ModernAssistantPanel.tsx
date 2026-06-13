"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  ChevronDown,
  Clock,
  DollarSign,
  Layers,
  MapPin,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl, streamChat } from "@/lib/api";
import type { DesignOutput } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { useProjectStore } from "@/stores/projectStore";

interface ChatEntry {
  role: "user" | "assistant";
  text: string;
  design?: DesignOutput | null;
  cardType?: ResponseCardType;
}

type ResponseCardType =
  | "site-analysis"
  | "risk"
  | "materials"
  | "cost"
  | "design"
  | "timeline";

interface AssistantAction {
  type: "update_parameters" | "regenerate" | "show_layer" | "download";
  parameters?: Record<string, unknown>;
  layer?: string;
  export?: string;
}

const SUGGESTIONS_BY_PAGE: Record<string, string[]> = {
  map: [
    "Suggest best site for this project type",
    "Analyze nearby roads and buildings",
    "Import alignment and check elevation",
    "Draw boundary along road corridor",
  ],
  estimate: [
    "Estimate cement and steel quantities",
    "Reduce total BOQ cost",
    "Explain cost range assumptions",
    "Export BOQ to CSV",
  ],
  workspace: [
    "Design a 2-lane flyover",
    "Change pier spacing to 35m",
    "Analyze this site for risks",
    "Generate cost breakdown",
  ],
  default: [
    "Analyze this site for risks",
    "Design a 2-lane flyover",
    "Estimate cement and steel quantities",
    "Generate cost breakdown",
  ],
};

function pageKey(pathname: string): string {
  if (pathname.includes("/map")) return "map";
  if (pathname.includes("/estimate")) return "estimate";
  if (pathname.includes("/workspace")) return "workspace";
  return "default";
}

const CARD_META: Record<
  ResponseCardType,
  { title: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "site-analysis": { title: "Site Analysis", icon: MapPin },
  risk: { title: "Risk Assessment", icon: AlertTriangle },
  materials: { title: "Material Estimate", icon: Layers },
  cost: { title: "Cost Estimate", icon: DollarSign },
  design: { title: "Design Suggestions", icon: Sparkles },
  timeline: { title: "Construction Timeline", icon: Clock },
};

function inferCardType(text: string): ResponseCardType | undefined {
  const t = text.toLowerCase();
  if (t.includes("risk") || t.includes("constraint")) return "risk";
  if (t.includes("cement") || t.includes("steel") || t.includes("material")) return "materials";
  if (t.includes("cost") || t.includes("₹") || t.includes("cr")) return "cost";
  if (t.includes("month") || t.includes("timeline") || t.includes("duration")) return "timeline";
  if (t.includes("design") || t.includes("flyover") || t.includes("building")) return "design";
  if (t.includes("site") || t.includes("analysis")) return "site-analysis";
  return undefined;
}

interface Props {
  projectId: number;
  design?: DesignOutput | null;
  onApplyParameters: (params: Record<string, unknown>) => void;
  onRegenerate: (params: Record<string, unknown>) => void;
  currentParameters?: Record<string, unknown> | null;
}

export default function ModernAssistantPanel({
  projectId,
  design,
  onApplyParameters,
  onRegenerate,
  currentParameters,
}: Props) {
  const pathname = usePathname();
  const suggestions = SUGGESTIONS_BY_PAGE[pageKey(pathname)] ?? SUGGESTIONS_BY_PAGE.default;
  const [pendingDiff, setPendingDiff] = useState<Record<string, { from: unknown; to: unknown }> | null>(null);
  const [history, setHistory] = useState<ChatEntry[]>([
    {
      role: "assistant",
      text: "GeoAI Copilot ready. Ask for site analysis, preliminary designs, BOQ estimates, cost ranges, or construction timelines.",
      cardType: "design",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const toggleLayer = useProjectStore((s) => s.toggleLayer);
  const layers = useProjectStore((s) => s.layers);

  const hasUserMessages = history.some((e) => e.role === "user");

  const send = async (message?: string) => {
    const text = (message ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setHistory((h) => [...h, { role: "user", text }]);
    setBusy(true);
    setPendingDiff(null);
    const streamIdx = history.length + 1;
    setHistory((h) => [...h, { role: "assistant", text: "", cardType: inferCardType(text) }]);

    try {
      let fullReply = "";
      const { action } = await streamChat(projectId, text, (chunk) => {
        fullReply += chunk;
        setHistory((h) =>
          h.map((entry, i) => (i === streamIdx ? { ...entry, text: fullReply } : entry)),
        );
      });

      setHistory((h) =>
        h.map((entry, i) =>
          i === streamIdx
            ? { ...entry, text: fullReply, design: design ?? undefined, cardType: inferCardType(fullReply) }
            : entry,
        ),
      );

      const act = action as AssistantAction | null;
      if (act?.type === "update_parameters" && act.parameters) {
        const diff: Record<string, { from: unknown; to: unknown }> = {};
        for (const [k, v] of Object.entries(act.parameters)) {
          const prev = currentParameters?.[k];
          if (prev !== v) diff[k] = { from: prev ?? "—", to: v };
        }
        if (Object.keys(diff).length) setPendingDiff(diff);
        onApplyParameters(act.parameters);
      } else if (act?.type === "regenerate") {
        onRegenerate(act.parameters ?? {});
      } else if (act?.type === "show_layer" && act.layer === "excavation" && !layers.excavation) {
        toggleLayer("excavation");
      } else if (act?.type === "download" && act.export) {
        window.open(apiUrl(`/api/projects/${projectId}/exports/${act.export}`), "_blank");
      }
    } catch (e) {
      setHistory((h) => h.filter((_, i) => i !== streamIdx).concat({
        role: "assistant",
        text: `Error: ${e instanceof Error ? e.message : e}`,
      }));
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-background-secondary">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border panel-glass">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/40">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">AI Copilot</p>
          <p className="text-[10px] text-muted-foreground">Infrastructure planning assistant</p>
        </div>
        <Badge variant="accent" className="ml-auto gap-1">
          <Sparkles className="h-3 w-3" />
          Live
        </Badge>
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col">
        {(hasUserMessages || busy) && (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            <AnimatePresence initial={false}>
              {history.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn("flex gap-2", entry.role === "user" ? "flex-row-reverse" : "flex-row")}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border mt-0.5",
                      entry.role === "user"
                        ? "bg-primary/15 border-primary/30"
                        : "bg-background-elevated border-border",
                    )}
                  >
                    {entry.role === "user" ? (
                      <User className="h-3 w-3 text-primary" />
                    ) : (
                      <Bot className="h-3 w-3 text-accent" />
                    )}
                  </div>
                  <div className={cn("max-w-[90%] space-y-2", entry.role === "user" && "items-end")}>
                    {entry.cardType && entry.role === "assistant" && (
                      <ResponseCardHeader type={entry.cardType} />
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-[13px] leading-relaxed",
                        entry.role === "user" ? "chat-bubble-user ml-auto" : "chat-bubble-ai",
                      )}
                    >
                      {expanded[i] !== false || entry.text.length < 280
                        ? entry.text
                        : `${entry.text.slice(0, 280)}…`}
                      {entry.text.length > 280 && (
                        <button
                          type="button"
                          onClick={() => setExpanded((e) => ({ ...e, [i]: !e[i] }))}
                          className="flex items-center gap-1 mt-1 text-[11px] text-accent hover:underline"
                        >
                          {expanded[i] === false ? "Show more" : "Show less"}
                          <ChevronDown className={cn("h-3 w-3", expanded[i] !== false && "rotate-180")} />
                        </button>
                      )}
                    </div>
                    {entry.role === "assistant" &&
                      design?.calculated &&
                      hasUserMessages &&
                      i === history.length - 1 && (
                        <DesignSummaryCard
                          design={design}
                          projectId={projectId}
                          onRegenerate={onRegenerate}
                        />
                      )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {busy && (
              <div className="flex items-center gap-2 px-2 py-2 ai-thinking">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-xs text-muted-foreground ml-1">Analyzing…</span>
              </div>
            )}
          </div>
        )}

        {!busy && !hasUserMessages && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-2 pt-8 bg-gradient-to-t from-background-secondary via-background-secondary/70 to-transparent">
            <div className="flex flex-col gap-1.5 items-stretch pointer-events-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className={cn(
                    "text-left text-[11px] leading-snug px-3 py-2 rounded-lg border border-border/80",
                    "bg-background-elevated/80 text-muted-foreground",
                    "hover:text-foreground hover:border-primary/25 hover:bg-background-elevated",
                    "transition-colors duration-150",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border panel p-3 space-y-2">
        {pendingDiff && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-[10px] space-y-1">
            <p className="font-semibold text-primary">Parameter changes (preview)</p>
            {Object.entries(pendingDiff).map(([k, { from, to }]) => (
              <p key={k}>
                <span className="text-muted-foreground">{k}:</span> {String(from)} → <strong>{String(to)}</strong>
              </p>
            ))}
            <Button size="sm" className="h-6 text-[10px] mt-1" onClick={() => onRegenerate({})}>
              Regenerate with changes
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask GeoAI Copilot…"
            className="h-9 text-sm"
            disabled={busy}
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => send()} disabled={busy}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResponseCardHeader({ type }: { type: ResponseCardType }) {
  const meta = CARD_META[type];
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3 w-3 text-accent" />
      {meta.title}
    </div>
  );
}

function DesignSummaryCard({
  design,
  projectId,
  onRegenerate,
}: {
  design: DesignOutput;
  projectId: number;
  onRegenerate: (p: Record<string, unknown>) => void;
}) {
  const calc = design.calculated;
  if (!calc) return null;

  return (
    <Card float className="p-3 space-y-2 text-left">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">AI Summary</p>
        <Badge variant="warning">Preliminary</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-data">
        <div className="rounded-md bg-card px-2 py-1.5 border border-border">
          <p className="text-muted-foreground text-[10px]">Cost (mid)</p>
          <p className="font-medium">{formatCurrency(calc.cost_summary.total_medium, calc.cost_summary.currency)}</p>
        </div>
        <div className="rounded-md bg-card px-2 py-1.5 border border-border">
          <p className="text-muted-foreground text-[10px]">Timeline</p>
          <p className="font-medium">~{calc.timeline.estimated_months_medium} mo</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 gap-1 text-[11px] h-7" onClick={() => onRegenerate({})}>
          Regenerate <ArrowRight className="h-3 w-3" />
        </Button>
        <a
          href={`/projects/${projectId}/estimate`}
          className="inline-flex flex-1 h-7 items-center justify-center rounded-md btn-glass text-[11px] font-medium"
        >
          View BOQ
        </a>
      </div>
    </Card>
  );
}
