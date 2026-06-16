"use client";

import Link from "next/link";
import { CircleDot, Loader2 } from "lucide-react";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

function ProjectStatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-[10px] font-medium leading-none",
        tone === "blue" &&
          "border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.14)] text-[#BFDBFE]",
        tone === "warning" &&
          "border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] text-[#FCD34D]",
        tone === "neutral" &&
          "border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.72)] text-[#CBD5E1]",
      )}
    >
      {tone === "blue" && <CircleDot className="h-2.5 w-2.5 fill-[#3B82F6] text-[#3B82F6]" />}
      {children}
    </span>
  );
}

export function ProjectHeaderContent({
  project,
  title,
  subtitle,
  compact,
}: {
  project: Project;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 overflow-hidden">
        <h1
          className={
            compact
              ? "min-w-0 font-semibold text-sm tracking-tight text-[#F8FAFC] truncate"
              : "min-w-0 font-semibold text-base tracking-tight text-[#F8FAFC] truncate"
          }
        >
          {title ?? project.name}
        </h1>
        {compact && (
          <div className="hidden items-center gap-1.5 xl:flex">
            <ProjectStatusPill tone="blue">Visual planning</ProjectStatusPill>
            <ProjectStatusPill>Preliminary</ProjectStatusPill>
          </div>
        )}
      </div>
      {(subtitle || project.location_name) && (
        <p
          className={
            compact
              ? "text-[10px] text-[#94A3B8] truncate mt-0.5"
              : "text-xs text-[#94A3B8] truncate mt-0.5"
          }
        >
          {subtitle ?? project.location_name}
        </p>
      )}
    </div>
  );
}

export default function ProjectHeader({
  project,
  title,
  subtitle,
  backHref,
}: {
  project: Project;
  title?: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0 flex-wrap">
      {backHref && (
        <Link
          href={backHref}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors duration-200"
        >
          ←
        </Link>
      )}
      <ProjectHeaderContent project={project} title={title} subtitle={subtitle} />
    </div>
  );
}

export function ProjectLoading({ message = "Loading project…" }: { message?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ProjectError({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm text-destructive max-w-md">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-primary hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}
