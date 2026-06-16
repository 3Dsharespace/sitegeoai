import type { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

export default function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  highlight,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: LucideIcon;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <GlassCard
      className={cn(
        "p-3.5 sm:p-4",
        highlight && "border-[rgba(59,130,246,0.35)] ring-1 ring-[rgba(59,130,246,0.15)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#64748B]">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-[#22D3EE] opacity-80" strokeWidth={1.75} />}
      </div>
      <p className={cn("mt-1.5 font-data text-base font-semibold text-[#F8FAFC] sm:text-lg", highlight && "text-[#38BDF8]")}>
        {value}
      </p>
      {unit && <p className="mt-0.5 text-[10px] text-[#64748B]">{unit}</p>}
    </GlassCard>
  );
}
