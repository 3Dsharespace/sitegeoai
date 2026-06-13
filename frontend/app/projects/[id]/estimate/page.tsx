"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Save } from "lucide-react";
import BottomSummaryBar from "@/components/layout/BottomSummaryBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ProjectError, ProjectLoading } from "@/components/layout/ProjectHeader";
import ScenarioSelector from "@/components/workspace/ScenarioSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { useProjectData } from "@/hooks/useProjectData";
import { api, apiUrl } from "@/lib/api";
import { toastPromise } from "@/lib/toast";
import type { LineItem, QuantityEstimate } from "@/lib/types";
import { CHART } from "@/lib/chart-theme";
import { formatCurrency } from "@/lib/utils";

const PHASES = ["all", "foundation", "structure", "road", "pipeline", "finishing"] as const;

export default function EstimatePage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { project, scenarios, scenario, selectScenario, summaryStats, loading, error, load } =
    useProjectData(projectId);
  const [estimate, setEstimate] = useState<QuantityEstimate | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [phase, setPhase] = useState<(typeof PHASES)[number]>("all");

  const scenarioId = scenario?.id;

  useEffect(() => {
    let cancelled = false;
    const qs = scenarioId ? `?scenario_id=${scenarioId}` : "";
    api
      .get<QuantityEstimate>(`/api/projects/${projectId}/estimates${qs}`)
      .then((e) => {
        if (cancelled) return;
        setEstimate(e);
        setItems(e.line_items);
        setLoadErr("");
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadErr(String(e instanceof Error ? e.message : e));
        setEstimate(null);
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, scenarioId]);

  const filteredItems = useMemo(() => {
    if (phase === "all") return items;
    return items.filter(
      (i) => i.category.toLowerCase().includes(phase) || i.item_name.toLowerCase().includes(phase),
    );
  }, [items, phase]);

  const categorySubtotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of filteredItems) {
      map.set(item.category, (map.get(item.category) ?? 0) + item.quantity * item.rate);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filteredItems]);

  const footerTotal = useMemo(
    () => filteredItems.reduce((s, i) => s + i.quantity * i.rate, 0),
    [filteredItems],
  );

  const materialChart = useMemo(() => {
    if (!estimate) return [];
    return [
      { name: "Cement", value: estimate.cement_bags },
      { name: "Steel", value: estimate.steel_kg / 100 },
      { name: "Concrete", value: estimate.concrete_m3 },
      { name: "Excavation", value: estimate.excavation_m3 },
    ];
  }, [estimate]);

  const updateItem = (i: number, field: "quantity" | "rate", value: number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value, amount: 0 } : item)),
    );
    setDirty(true);
  };

  const save = async () => {
    if (!estimate) return;
    await toastPromise(
      api.put<QuantityEstimate>(
        `/api/projects/${projectId}/estimates/${estimate.id}/line-items`,
        { line_items: items },
      ),
      { loading: "Saving BOQ…", success: "BOQ saved" },
    ).then((updated) => {
      setEstimate(updated);
      setItems(updated.line_items);
      setDirty(false);
    });
  };

  const calc = scenario?.design_output_json?.calculated;
  const cost = calc?.cost_summary;

  if (loading) return <ProjectLoading />;
  if (error || !project) return <ProjectError error={error || "Not found"} onRetry={load} />;

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-14 md:pb-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-xs">
          <ScenarioSelector
            projectId={projectId}
            scenarios={scenarios}
            selectedId={scenario?.id ?? null}
            onSelect={selectScenario}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            tabs={PHASES.map((p) => ({
              id: p,
              label: p === "all" ? "All Phases" : p.charAt(0).toUpperCase() + p.slice(1),
            }))}
            active={phase}
            onChange={(id) => setPhase(id as typeof phase)}
            className="max-w-2xl"
          />
          <div className="flex gap-2">
            {dirty && (
              <Button size="sm" className="gap-1.5" onClick={save}>
                <Save className="h-3.5 w-3.5" />
                Save BOQ
              </Button>
            )}
            <a href={apiUrl(`/api/projects/${projectId}/exports/csv`)}>
              <Button size="sm" variant="secondary" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </a>
          </div>
        </div>

        {loadErr && (
          <Card className="border-dashed p-6 text-center text-muted-foreground">
            {loadErr} — generate a design in the workspace first.
          </Card>
        )}

        {estimate && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="Concrete" value={`${estimate.concrete_m3.toLocaleString()} m³`} />
              <StatCard label="Cement" value={`${estimate.cement_bags.toLocaleString()} bags`} />
              <StatCard label="Steel" value={`${estimate.steel_kg.toLocaleString()} kg`} />
              <StatCard label="Excavation" value={`${estimate.excavation_m3.toLocaleString()} m³`} />
              <StatCard
                label="Total Cost"
                value={formatCurrency(estimate.total_cost_estimate, cost?.currency)}
                highlight
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Material Quantities</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={materialChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART.tick }} />
                      <YAxis tick={{ fontSize: 10, fill: CHART.tick }} />
                      <Tooltip contentStyle={CHART.tooltip} />
                      <Bar dataKey="value" fill={CHART.accent} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {cost && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Cost Range
                      <Badge variant="warning">Preliminary</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-muted/60 p-3">
                        <p className="text-[10px] text-muted-foreground">Low</p>
                        <p className="font-bold">{formatCurrency(cost.total_low, cost.currency)}</p>
                      </div>
                      <div className="bg-primary/10 border border-primary/40 p-3">
                        <p className="text-[10px] text-muted-foreground">Medium</p>
                        <p className="font-bold text-accent">{formatCurrency(cost.total_medium, cost.currency)}</p>
                      </div>
                      <div className="bg-muted/60 p-3">
                        <p className="text-[10px] text-muted-foreground">High</p>
                        <p className="font-bold">{formatCurrency(cost.total_high, cost.currency)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Bill of Quantities</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="data-table w-full">
                  <thead className="sticky top-0 bg-background-secondary z-10">
                    <tr>
                      {["Code", "Item", "Category", "Qty", "Unit", "Rate", "Source", "Amount"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, i) => {
                      const idx = items.indexOf(item);
                      return (
                        <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono text-xs">{item.item_code}</td>
                          <td className="px-3 py-2">{item.item_name}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{item.category}</td>
                          <td className="px-3 py-2">
                            <input
                              placeholder="Quantity"
                              aria-label="Quantity"
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                              className="w-20 rounded border border-border bg-background/60 px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 text-xs">{item.unit}</td>
                          <td className="px-3 py-2">
                            <input
                              placeholder="Rate"
                              aria-label="Rate" 
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateItem(idx, "rate", parseFloat(e.target.value) || 0)}
                              className="w-20 rounded border border-border bg-background/60 px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="px-3 py-2 text-[10px] text-muted-foreground">
                            {(item as LineItem & { rate_source?: string }).rate_source ?? "Rate library"}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {(item.quantity * item.rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-background-secondary border-t border-border">
                    {categorySubtotals.map(([cat, amt]) => (
                      <tr key={cat} className="text-xs text-muted-foreground">
                        <td colSpan={6} className="px-3 py-1 text-right">{cat} subtotal</td>
                        <td />
                        <td className="px-3 py-1 font-medium text-foreground">
                          {amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td colSpan={6} className="px-3 py-2 text-right">Phase total</td>
                      <td />
                      <td className="px-3 py-2">{footerTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    </tr>
                  </tfoot>
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

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary bg-primary/5" : ""}>
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="font-data font-semibold text-sm">{value}</p>
      </CardContent>
    </Card>
  );
}
