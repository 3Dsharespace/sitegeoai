"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
  const params = useParams<{ id?: string }>();
  const projectId = params?.id;
  const metricHref = (key: string) => {
    if (!projectId) return null;
    if (key === "totalCost") return `/projects/${projectId}/cost`;
    if (key === "cementBags" || key === "steelKg" || key === "excavationM3") return `/projects/${projectId}/estimate`;
    if (key === "timelineMonths") return `/projects/${projectId}/timeline`;
    if (key === "riskScore") return `/projects/${projectId}/analysis`;
    return `/projects/${projectId}/workspace`;
  };

  if (variant === "sidebar") {
    const hasData = ITEMS.some(({ key }) => {
      const raw = stats[key as keyof SummaryStats];
      return raw != null && typeof raw === "number";
    });

    return (
      <SidebarSection title="Quantity estimate">
        {!hasData && !loading ? (
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            BOQ estimate appears after generation.
          </p>
        ) : (
          <div className={cn("space-y-2", loading && "opacity-60")}>
            <ul className="space-y-1.5">
          {ITEMS.map(({ key, label, icon: Icon, accent, format }) => {
            const raw = stats[key as keyof SummaryStats];
            const value = loading ? "…" : formatValue(key, raw, stats, format);
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-2 rounded-lg border border-[rgba(148,163,184,0.1)] bg-black/15 px-2 py-1.5 text-[11px]"
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
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.1)] px-2 py-1 text-[10px] text-[#BFDBFE]">
                Preliminary estimate
              </span>
            </div>
            {projectId && (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/projects/${projectId}/estimate`}
                  className="flex h-7 items-center justify-center rounded-lg border border-[rgba(148,163,184,0.14)] bg-white/[0.04] text-[10px] text-[#CBD5E1] hover:bg-white/[0.08] hover:text-[#F8FAFC]"
                >
                  View BOQ
                </Link>
                <Link
                  href={`/projects/${projectId}/cost`}
                  className="flex h-7 items-center justify-center rounded-lg border border-[rgba(148,163,184,0.14)] bg-white/[0.04] text-[10px] text-[#CBD5E1] hover:bg-white/[0.08] hover:text-[#F8FAFC]"
                >
                  Cost Analysis
                </Link>
              </div>
            )}
          </div>
        )}
      </SidebarSection>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 border-t border-[rgba(148,163,184,0.14)] bg-[rgba(5,7,10,0.86)] px-2 py-1.5 backdrop-blur-xl sm:px-3",
        loading && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin-dark">
        <button
          type="button"
          className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.1)] px-2.5 text-[10px] font-medium text-[#FCD34D]"
          title="Open issue panel"
        >
          1 issue
        </button>
        {ITEMS.map((item) => {
          const { key, label, icon: Icon, accent, format } = item;
          const raw = stats[key as keyof SummaryStats];
          const value = loading ? "…" : formatValue(key, raw, stats, format);
          const href = metricHref(key);
          const chip = (
            <div className="flex items-center gap-1.5 rounded-full border border-[rgba(148,163,184,0.12)] bg-white/[0.04] px-2.5 py-1 transition-colors hover:bg-white/[0.08]" title={`${label}: ${value}`}>
              <Icon className={cn("h-3 w-3 shrink-0", accent === "text-primary" ? "text-[#3B82F6]" : accent === "text-accent" ? "text-[#22D3EE]" : accent === "text-warning" ? "text-[#F59E0B]" : accent === "text-success" ? "text-[#10B981]" : accent === "text-destructive" ? "text-[#EF4444]" : "text-[#94A3B8]")} />
              <span className="hidden text-[9px] uppercase tracking-wide text-[#64748B] xl:inline">
                {label}
              </span>
              <span className="font-data text-[11px] font-medium whitespace-nowrap text-[#F8FAFC]">
                {value}
              </span>
            </div>
          );

          return (
            <div key={key} className="flex items-center shrink-0">
              {href ? <Link href={href}>{chip}</Link> : chip}
            </div>
          );
        })}
      </div>
    </div>
  );
}
