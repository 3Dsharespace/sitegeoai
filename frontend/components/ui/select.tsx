import { cn } from "@/lib/utils";

export const selectClassName =
  "flex h-9 w-full rounded-lg border border-[#334155] bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(59,130,246,0.22)] transition-all duration-150";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(selectClassName, className)} {...props}>
      {children}
    </select>
  );
}
