"use client";

import {
  Box,
  Clock,
  DollarSign,
  Layers,
  MapPin,
  Shovel,
  TrendingUp,
} from "lucide-react";
import { SidebarSection } from "@/components/ui/collapsible-section";
import { cn, formatCurrency, formatQty } from "@/lib/utils";

export interface SummaryStats {
  totalCost?: number;
  cementBags?: number;
  steelKg?: number;
  excavationM3?: number;
  timelineMonths?: number;
  areaSqm?: number;
  riskScore?: number;
  currency?: string;
}

const ITEMS = [
  {
    key: "totalCost",
    label: "Cost",
    icon: DollarSign,
    accent: "text-primary",
    format: (v: number, c?: string) => formatCurrency(v, c),
  },
  {
    key: "cementBags",
    label: "Cement",
    icon: Box,
    accent: "text-accent",
    format: (v: number) => formatQty(v, "bags"),
  },
  {
    key: "steelKg",
    label: "Steel",
    icon: Layers,
    accent: "text-foreground/80",
    format: (v: number) => formatQty(v, "kg"),
  },
  {
    key: "excavationM3",
    label: "Excavation",
    icon: Shovel,
    accent: "text-warning",
    format: (v: number) => formatQty(v, "m³"),
  },
  {
    key: "timelineMonths",
    label: "Duration",
    icon: Clock,
    accent: "text-success",
    format: (v: number) => `~${v} mo`,
  },
  {
    key: "areaSqm",
    label: "Area",
    icon: MapPin,
    accent: "text-muted-foreground",
    format: (v: number) => formatQty(v, "m²"),
  },
  {
    key: "riskScore",
    label: "Risk",
    icon: TrendingUp,
    accent: "text-destructive",
    format: (v: number) => `${v}/10`,
  },
] as const;

function formatValue(
  key: string,
  raw: SummaryStats[keyof SummaryStats],
  stats: SummaryStats,
  format: (v: number, c?: string) => string,
) {
  if (raw == null || typeof raw !== "number") return "—";
  return key === "totalCost" ? format(raw, stats.currency) : format(raw);
}

export default function BottomSummaryBar({
  stats,
  loading,
  variant = "bar",
}: {
  stats: SummaryStats;
  loading?: boolean;
  variant?: "bar" | "sidebar";
}) {
  if (variant === "sidebar") {
    return (
      <SidebarSection title="Project Summary">
        <ul className={cn("space-y-1.5", loading && "opacity-60")}>
          {ITEMS.map(({ key, label, icon: Icon, accent, format }) => {
            const raw = stats[key as keyof SummaryStats];
            const value = loading ? "…" : formatValue(key, raw, stats, format);
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-2 text-[11px]"
                title={`${label}: ${value}`}
              >
                <span className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", accent)} aria-hidden />
                  <span className="truncate">{label}</span>
                </span>
                <span className="font-data font-medium text-foreground shrink-0">{value}</span>
              </li>
            );
          })}
        </ul>
      </SidebarSection>
    );
  }

  return (
    <div className={cn("panel-elevated px-2 py-1 sm:px-3", loading && "opacity-60")}>
      <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
        {ITEMS.map((item, i) => {
          const { key, label, icon: Icon, accent, format } = item;
          const raw = stats[key as keyof SummaryStats];
          const value = loading ? "…" : formatValue(key, raw, stats, format);

          return (
            <div key={key} className="flex items-center shrink-0">
              {i > 0 && <div className="mx-1.5 h-3.5 w-px bg-border shrink-0" aria-hidden />}
              <div className="flex items-center gap-1 px-1 py-0.5" title={`${label}: ${value}`}>
                <Icon className={cn("h-3 w-3 shrink-0", accent)} />
                <span className="hidden text-[9px] uppercase tracking-wide text-muted-foreground xl:inline">
                  {label}
                </span>
                <span className="font-data text-[11px] font-medium whitespace-nowrap text-foreground">
                  {value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
