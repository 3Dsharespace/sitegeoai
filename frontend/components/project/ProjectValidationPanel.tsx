"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Circle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import AccuracyBadge from "@/components/survey/AccuracyBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AccuracyTier, ProjectValidation } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ProjectValidationPanel({
  projectId,
  compact,
  className,
  defaultDetailsOpen = false,
}: {
  projectId: number;
  compact?: boolean;
  className?: string;
  defaultDetailsOpen?: boolean;
}) {
  const [validation, setValidation] = useState<ProjectValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(defaultDetailsOpen);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ProjectValidation>(`/api/projects/${projectId}/validation`);
      setValidation(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation unavailable");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-[11px] text-muted-foreground", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking readiness…
      </div>
    );
  }

  if (error || !validation) {
    return (
      <div className={cn("text-[11px] text-muted-foreground space-y-1", className)}>
        <p>{error ?? "Could not load validation"}</p>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  const tier = validation.accuracy_tier as AccuracyTier;
  const passedCount = validation.checks.filter((c) => c.passed).length;
  const failedChecks = validation.checks.filter((c) => !c.passed);
  const errorCount = failedChecks.filter((c) => c.severity === "error").length;

  const summary = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("font-semibold truncate", compact ? "text-xs" : "text-sm")}>Readiness</span>
          <AccuracyBadge tier={tier} compact />
        </div>
        {validation.database_mode === "sqlite" && (
          <span className="text-[10px] text-warning shrink-0">Limited GIS</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 text-[10px]">
        <ReadinessPill label="Design" ok={validation.ready_for_design} />
        <ReadinessPill label="BOQ" ok={validation.ready_for_boq} />
        <ReadinessPill label="Export" ok={validation.ready_for_export} />
      </div>

      <button
        type="button"
        onClick={() => setDetailsOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>
          {passedCount}/{validation.checks.length} checks passed
          {failedChecks.length > 0 &&
            ` · ${failedChecks.length} issue${failedChecks.length === 1 ? "" : "s"}`}
          {errorCount > 0 && ` (${errorCount} blocking)`}
        </span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", detailsOpen && "rotate-180")} />
      </button>
    </>
  );

  const details = detailsOpen && (
    <div className="space-y-2 pt-1">
      <ul className="space-y-1 max-h-36 overflow-y-auto">
        {(failedChecks.length > 0 ? failedChecks : validation.checks.slice(0, 4)).map((c) => (
          <li key={c.id} className="flex gap-1.5 text-[10px] leading-snug">
            {c.passed ? (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-success mt-0.5" />
            ) : c.severity === "error" ? (
              <AlertTriangle className="h-3 w-3 shrink-0 text-destructive mt-0.5" />
            ) : (
              <Circle className="h-3 w-3 shrink-0 text-warning mt-0.5" />
            )}
            <span className="text-muted-foreground">
              <span className="text-foreground">{c.label}</span>
              {!c.passed && c.action && (
                <span className="block text-primary/90">{c.action}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {validation.recommended_next_steps.length > 0 && (
        <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc pl-3">
          {validation.recommended_next_steps.slice(0, 3).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      )}

      {!compact && (
        <p className="text-[10px] text-muted-foreground border-l-2 border-primary pl-2 leading-snug">
          {validation.disclaimer}
        </p>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className={cn("space-y-1.5", className)}>
        {summary}
        {details}
      </div>
    );
  }

  return (
    <Card className={cn("border-border/80", className)}>
      <CardHeader className="p-4 pb-2 space-y-2">
        {summary}
      </CardHeader>
      {detailsOpen && details && <CardContent className="p-4 pt-0">{details}</CardContent>}
    </Card>
  );
}

function ReadinessPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 border font-medium",
        ok
          ? "border-success/30 bg-[rgba(34,197,94,0.14)] text-[#4ADE80]"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {label}: {ok ? "✓" : "—"}
    </span>
  );
}
