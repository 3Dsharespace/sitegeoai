import { cn } from "@/lib/utils";

const variants = {
  default: "bg-muted text-foreground-secondary border-[rgba(148,163,184,0.18)]",
  primary: "badge-info",
  secondary: "bg-muted text-muted-foreground border-[rgba(148,163,184,0.18)]",
  outline: "bg-transparent text-muted-foreground border-[rgba(148,163,184,0.18)]",
  accent: "bg-[rgba(6,182,212,0.14)] text-accent border-[rgba(6,182,212,0.25)]",
  success: "badge-success",
  warning: "badge-warning",
  destructive: "badge-error",
};

export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: keyof typeof variants;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
