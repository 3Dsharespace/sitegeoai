"use client";

import type { LucideIcon } from "lucide-react";
import { Download } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusPill } from "@/components/project-results/StatusPill";
import { cn } from "@/lib/utils";

export default function ExportCard({
  title,
  description,
  preview,
  fileType,
  icon: Icon,
  href,
  available = true,
  unavailableReason,
  onPreview,
}: {
  title: string;
  description: string;
  preview?: string;
  fileType: string;
  icon: LucideIcon;
  href?: string;
  available?: boolean;
  unavailableReason?: string;
  onPreview?: () => void;
}) {
  const inner = (
    <GlassCard
      hover={available}
      className={cn(
        "h-full p-4 transition-all duration-200 group",
        !available && "opacity-55 cursor-not-allowed",
        available && "hover:border-[rgba(59,130,246,0.3)]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.1)]">
          <Icon className="h-5 w-5 text-[#3B82F6]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[#F8FAFC]">{title}</h3>
            <StatusPill label={fileType} variant="muted" />
            {available ? (
              <StatusPill label="Available" variant="success" />
            ) : (
              <StatusPill label="Unavailable" variant="muted" />
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">{description}</p>
          {preview && (
            <p className="mt-2 text-[10px] text-[#64748B] rounded-md border border-[rgba(148,163,184,0.12)] bg-[rgba(5,7,10,0.5)] px-2 py-1 inline-block">
              {preview}
            </p>
          )}
          {!available && unavailableReason && (
            <p className="mt-2 text-[10px] text-[#64748B]">{unavailableReason}</p>
          )}
          {available && (
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#38BDF8] group-hover:underline">
                <Download className="h-3 w-3" />
                Download
              </span>
              {onPreview && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPreview();
                  }}
                  className="text-[11px] text-[#94A3B8] hover:text-[#F8FAFC]"
                >
                  Preview
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );

  if (!available || !href) return inner;
  return (
    <a href={href} className="block h-full" download>
      {inner}
    </a>
  );
}
