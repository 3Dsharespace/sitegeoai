"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BottomSummaryBar from "@/components/layout/BottomSummaryBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ProjectError, ProjectLoading } from "@/components/layout/ProjectHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { useProjectData } from "@/hooks/useProjectData";
import { CHART } from "@/lib/chart-theme";
import { formatCurrency } from "@/lib/utils";

const PHASES = ["all", "foundation", "structure", "road", "pipeline", "finishing"] as const;

export default function CostDashboardPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { project, estimate, calc, summaryStats, loading, error, load } = useProjectData(projectId);
  const [phase, setPhase] = useState<(typeof PHASES)[number]>("all");

  const filteredItems = useMemo(() => {
    if (!estimate) return [];
    if (phase === "all") return estimate.line_items;
    return estimate.line_items.filter(
      (i) => i.category.toLowerCase().includes(phase) || i.item_name.toLowerCase().includes(phase),
    );
  }, [estimate, phase]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of filteredItems) {
      map.set(item.category, (map.get(item.category) ?? 0) + item.quantity * item.rate);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredItems]);

  const costBreakdown = useMemo(() => {
    if (!calc?.cost_summary) return [];
    const c = calc.cost_summary;
    return [
      { name: "Direct", value: c.direct_cost },
      { name: "Contingency", value: c.contingency },
      { name: "Design/Survey", value: c.design_survey_approval },
    ];
  }, [calc]);

  if (loading) return <ProjectLoading />;
  if (error || !project) return <ProjectError error={error || "Not found"} onRetry={load} />;

  const cost = calc?.cost_summary;

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-14 md:pb-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!estimate && (
          <Card className="border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              Generate a design first to see cost breakdowns and charts.
            </p>
          </Card>
        )}

        {estimate && (
          <>
            <Tabs
              tabs={PHASES.map((p) => ({
                id: p,
                label: p === "all" ? "All Phases" : p.charAt(0).toUpperCase() + p.slice(1),
              }))}
              active={phase}
              onChange={(id) => setPhase(id as typeof phase)}
              className="max-w-2xl"
            />

            {cost && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CostCard label="Low Estimate" value={cost.total_low} currency={cost.currency} />
                <CostCard label="Medium Estimate" value={cost.total_medium} currency={cost.currency} highlight />
                <CostCard label="High Estimate" value={cost.total_high} currency={cost.currency} />
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cost by Category</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART.tick }} />
                      <YAxis tick={{ fontSize: 10, fill: CHART.tick }} />
                      <Tooltip contentStyle={CHART.tooltip} />
                      <Bar dataKey="value" fill={CHART.primary} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost Composition</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name }) => name}
                      >
                        {costBreakdown.map((_, i) => (
                          <Cell key={i} fill={CHART.colors[i % CHART.colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CHART.tooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Line Items
                  <Badge variant="warning">Preliminary</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b border-border">
                    <tr>
                      {["Item", "Category", "Qty", "Rate", "Amount"].map((h) => (
                        <th key={h} className="text-left py-2 px-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 px-2">{item.item_name}</td>
                        <td className="py-2 px-2 text-muted-foreground text-xs">{item.category}</td>
                        <td className="py-2 px-2">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2 px-2">{item.rate.toLocaleString()}</td>
                        <td className="py-2 px-2 font-medium">
                          {(item.quantity * item.rate).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <MobileBottomNav projectId={projectId} />

      <BottomSummaryBar stats={summaryStats} />
    </div>
  );
}

function CostCard({
  label,
  value,
  currency,
  highlight,
}: {
  label: string;
  value: number;
  currency: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary bg-primary/5" : ""}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-bold">{formatCurrency(value, currency)}</p>
      </CardContent>
    </Card>
  );
}
