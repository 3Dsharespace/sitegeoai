import { cn } from "@/lib/utils";

const VARIANTS = {
  warning: "border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.1)] text-[#FBBF24]",
  success: "border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.1)] text-[#34D399]",
  accent: "border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.1)] text-[#60A5FA]",
  muted: "border-[rgba(148,163,184,0.25)] bg-[rgba(148,163,184,0.08)] text-[#94A3B8]",
  critical: "border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.1)] text-[#F87171]",
} as const;

export function StatusPill({
  label,
  variant = "muted",
  className,
}: {
  label: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        VARIANTS[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
