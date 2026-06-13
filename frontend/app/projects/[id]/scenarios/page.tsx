"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BottomSummaryBar from "@/components/layout/BottomSummaryBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ProjectError, ProjectLoading } from "@/components/layout/ProjectHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectData } from "@/hooks/useProjectData";
import { CHART } from "@/lib/chart-theme";
import { formatCurrency } from "@/lib/utils";

export default function ScenarioComparePage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { project, scenarios, loading, error, load, summaryStats } = useProjectData(projectId);

  const completed = useMemo(
    () => scenarios.filter((s) => s.status === "completed"),
    [scenarios],
  );

  const chartData = useMemo(
    () =>
      completed.map((s) => {
        const c = s.design_output_json?.calculated?.cost_summary;
        const q = s.design_output_json?.calculated?.quantities;
        return {
          name: s.name.length > 12 ? `${s.name.slice(0, 10)}…` : s.name,
          cost: c?.total_medium ?? 0,
          cement: q?.cement_bags ?? 0,
          steel: (q?.steel_kg ?? 0) / 1000,
        };
      }),
    [completed],
  );

  if (loading) return <ProjectLoading message="Loading scenarios…" />;
  if (error || !project) return <ProjectError error={error || "Not found"} onRetry={load} />;

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-14 md:pb-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}/workspace`}>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Studio
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            Compare cost, timeline, and parameters across AI design runs.
          </p>
        </div>

        {completed.length < 2 ? (
          <Card className="border-dashed p-10 text-center">
            <p className="font-medium mb-2">Need at least 2 completed scenarios</p>
            <p className="text-sm text-muted-foreground mb-4">
              Generate multiple designs with different parameters to compare outcomes.
            </p>
            <Link href={`/projects/${projectId}/workspace`}>
              <Button size="sm">Open AI Design Studio</Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="grid lg:grid-cols-3 gap-4">
              {[
                { title: "Cost (medium)", key: "cost" as const, format: (v: number) => formatCurrency(v) },
                { title: "Cement (bags)", key: "cement" as const, format: (v: number) => v.toLocaleString() },
                { title: "Steel (tonnes)", key: "steel" as const, format: (v: number) => v.toFixed(1) },
              ].map(({ title, key, format }) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: CHART.tick }} />
                        <YAxis tick={{ fontSize: 9, fill: CHART.tick }} />
                        <Tooltip formatter={(v) => format(Number(v))} contentStyle={CHART.tooltip} />
                        <Legend />
                        <Bar dataKey={key} fill={CHART.accent} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[720px]">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2">Metric</th>
                  {completed.map((s) => (
                    <th key={s.id} className="text-left px-3 py-2">
                      {s.name}
                      <Badge variant="success" className="ml-2 text-[9px]">
                        {s.status}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Summary",
                    get: (s: (typeof completed)[0]) => s.design_output_json?.summary?.slice(0, 80) ?? "—",
                  },
                  {
                    label: "Cost (medium)",
                    get: (s: (typeof completed)[0]) => {
                      const c = s.design_output_json?.calculated?.cost_summary;
                      return c ? formatCurrency(c.total_medium, c.currency) : "—";
                    },
                  },
                  {
                    label: "Cost (low – high)",
                    get: (s: (typeof completed)[0]) => {
                      const c = s.design_output_json?.calculated?.cost_summary;
                      return c
                        ? `${formatCurrency(c.total_low, c.currency)} – ${formatCurrency(c.total_high, c.currency)}`
                        : "—";
                    },
                  },
                  {
                    label: "Timeline (months)",
                    get: (s: (typeof completed)[0]) => {
                      const t = s.design_output_json?.calculated?.timeline;
                      return t?.estimated_months_medium != null
                        ? `${t.estimated_months_low}–${t.estimated_months_high} (med ${t.estimated_months_medium})`
                        : "—";
                    },
                  },
                  {
                    label: "Cement (bags)",
                    get: (s: (typeof completed)[0]) =>
                      s.design_output_json?.calculated?.quantities?.cement_bags?.toLocaleString() ?? "—",
                  },
                  {
                    label: "Steel (kg)",
                    get: (s: (typeof completed)[0]) =>
                      s.design_output_json?.calculated?.quantities?.steel_kg?.toLocaleString() ?? "—",
                  },
                  {
                    label: "Risks",
                    get: (s: (typeof completed)[0]) => String(s.design_output_json?.risks?.length ?? 0),
                  },
                ].map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <td className="px-3 py-2 text-xs font-medium text-muted-foreground">{row.label}</td>
                    {completed.map((s) => (
                      <td key={s.id} className="px-3 py-2 text-xs">
                        {row.get(s)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {scenarios.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {scenarios.map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {s.name}
                    <Badge variant={s.status === "completed" ? "success" : "warning"}>{s.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <p>{s.design_output_json?.summary ?? "No output yet"}</p>
                  <p className="font-data text-[10px]">
                    Created {new Date(s.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav projectId={projectId} />
      <BottomSummaryBar stats={summaryStats} />
    </div>
  );
}
