"use client";

import { formatRiskText, riskSeverity, type RiskSeverity } from "@/lib/format-display";
import { StatusPill } from "@/components/project-results/StatusPill";
import { cn } from "@/lib/utils";

const SEV_LABEL: Record<RiskSeverity, { label: string; variant: "critical" | "warning" | "muted" }> = {
  critical: { label: "Critical", variant: "critical" },
  review: { label: "Review required", variant: "warning" },
  info: { label: "Info", variant: "muted" },
};

export default function RiskList({
  items,
  emptyMessage = "No critical issues detected yet.",
}: {
  items: unknown[];
  emptyMessage?: string;
}) {
  const parsed = items.map((item) => ({
    text: formatRiskText(item),
    severity: riskSeverity(item),
  })).filter((x) => x.text);

  if (parsed.length === 0) {
    return <p className="text-[11px] text-[#64748B] leading-relaxed">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {parsed.map(({ text, severity }, i) => {
        const meta = SEV_LABEL[severity];
        return (
          <li
            key={i}
            className={cn(
              "rounded-lg border px-3 py-2 text-[11px] leading-relaxed text-[#CBD5E1]",
              severity === "critical"
                ? "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]"
                : severity === "review"
                  ? "border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.05)]"
                  : "border-[rgba(148,163,184,0.15)] bg-[rgba(15,23,42,0.4)]",
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <StatusPill label={meta.label} variant={meta.variant} className="shrink-0" />
            </div>
            {text}
          </li>
        );
      })}
    </ul>
  );
}
