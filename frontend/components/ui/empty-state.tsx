import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-4 py-8", className)}>
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(148,163,184,0.15)] bg-[rgba(15,23,42,0.5)]">
          <Icon className="h-5 w-5 text-[#64748B]" strokeWidth={1.75} />
        </div>
      )}
      <p className="text-sm font-medium text-[#CBD5E1]">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[#64748B]">{description}</p>
      )}
    </div>
  );
}
