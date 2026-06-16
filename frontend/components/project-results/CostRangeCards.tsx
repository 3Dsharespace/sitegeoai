import { GlassCard } from "@/components/ui/glass-card";
import { StatusPill } from "@/components/project-results/StatusPill";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function CostRangeCards({
  low,
  medium,
  high,
  currency = "INR",
}: {
  low: number;
  medium: number;
  high: number;
  currency?: string;
}) {
  const items = [
    { key: "low", label: "Low", value: low, helper: "Conservative scope & rates" },
    { key: "medium", label: "Medium", value: medium, helper: "Most likely planning estimate", highlight: true },
    { key: "high", label: "High", value: high, helper: "Includes contingency & risk buffer" },
  ] as const;

  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-[#F8FAFC]">Cost range</h3>
        <StatusPill label="Preliminary" variant="warning" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => {
          const { key, label, value, helper } = item;
          const highlight = "highlight" in item && item.highlight;
          return (
          <div
            key={key}
            className={cn(
              "rounded-lg border p-3 text-center transition-colors",
              highlight
                ? "border-[rgba(59,130,246,0.4)] bg-[rgba(59,130,246,0.12)]"
                : "border-[rgba(148,163,184,0.15)] bg-[rgba(5,7,10,0.4)]",
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#64748B]">{label}</p>
            <p className={cn("mt-1 font-data text-sm font-bold sm:text-base", highlight ? "text-[#38BDF8]" : "text-[#F8FAFC]")}>
              {formatCurrency(value, currency)}
            </p>
            <p className="mt-1.5 text-[10px] leading-snug text-[#64748B]">{helper}</p>
          </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
