"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { UsageSummary } from "@/lib/types";

function formatMetric(current: number | null | undefined, max: number | null | undefined, unlimited?: boolean) {
  if (unlimited || max == null) return "Unlimited";
  return `${current ?? 0} / ${max}`;
}

export default function UsageCard() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<UsageSummary>("/api/usage/summary")
      .then(setSummary)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <Card float>
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <CardTitle>Plan & usage</CardTitle>
          <CardDescription>Daily limits and project quotas for your account</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {error && <p className="text-destructive">{error}</p>}
        {!summary && !error && <p className="text-muted-foreground">Loading usage…</p>}
        {summary && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current plan</span>
              <span className="font-medium capitalize">{summary.plan}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Projects</span>
              <span>{formatMetric(summary.projects.current, summary.projects.max, summary.projects.unlimited)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Generations today</span>
              <span>
                {formatMetric(
                  summary.generations_today.current,
                  summary.generations_today.max,
                  summary.generations_today.unlimited,
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AI plans today</span>
              <span>
                {formatMetric(
                  summary.llm_plans_today.current,
                  summary.llm_plans_today.max,
                  summary.llm_plans_today.unlimited,
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Exports today</span>
              <span>
                {formatMetric(
                  summary.exports_today.current,
                  summary.exports_today.max,
                  summary.exports_today.unlimited,
                )}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
