"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/lib/types";

const TYPE_VARIANT: Record<string, "primary" | "accent" | "warning" | "success"> = {
  flyover: "primary",
  building: "accent",
  pipeline: "warning",
  road: "success",
};

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
      <div className="flex items-center gap-2 flex-wrap">
        <h1
          className={
            compact
              ? "font-semibold text-sm tracking-tight truncate"
              : "font-semibold text-base tracking-tight truncate"
          }
        >
          {title ?? project.name}
        </h1>
        <Badge variant={TYPE_VARIANT[project.project_type] ?? "default"} className="text-[10px]">
          {project.project_type}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {project.status}
        </Badge>
      </div>
      {(subtitle || project.location_name) && (
        <p
          className={
            compact
              ? "text-[10px] text-muted-foreground truncate mt-0.5"
              : "text-xs text-muted-foreground truncate mt-0.5"
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
