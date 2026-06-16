import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  hover,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.72)] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
        hover && "transition-all duration-300 hover:border-[rgba(56,189,248,0.25)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
