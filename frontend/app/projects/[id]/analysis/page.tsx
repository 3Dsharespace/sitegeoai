"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ScanSearch } from "lucide-react";
import BottomSummaryBar from "@/components/layout/BottomSummaryBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ProjectError, ProjectLoading } from "@/components/layout/ProjectHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectData } from "@/hooks/useProjectData";
import { api } from "@/lib/api";
import { formatArea, formatDistance } from "@/lib/geo";
import type { SiteAnalysis } from "@/lib/types";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

export default function AnalysisPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { project, summaryStats, loading, error, load } = useProjectData(projectId);
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get<SiteAnalysis>(`/api/projects/${projectId}/site-analysis`)
      .then((data) => {
        if (!cancelled) setAnalysis(data);
      })
      .catch(() => {
        if (!cancelled) setAnalysis(null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const run = async () => {
    setRunning(true);
    setRunError("");
    try {
      setAnalysis(await api.post<SiteAnalysis>(`/api/projects/${projectId}/site-analysis`));
      load();
    } catch (e) {
      setRunError(String(e instanceof Error ? e.message : e));
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <ProjectLoading />;
  if (error || !project) return <ProjectError error={error || "Not found"} onRetry={load} />;

  const roads = analysis?.nearby_roads_json?.features ?? [];
  const buildings = analysis?.existing_buildings_json?.features ?? [];
  const namedRoads = [
    ...new Set(roads.map((r) => String(r.properties?.name || "")).filter(Boolean)),
  ];
  const center: [number, number] = [project.center_lng ?? 77.5946, project.center_lat ?? 12.9716];

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-14 md:pb-0">
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="lg:w-[420px] shrink-0 border-r border-border bg-sidebar/80 p-5 space-y-4 overflow-y-auto">
          <Button onClick={run} disabled={running} className="w-full gap-2">
            <ScanSearch className="h-4 w-4" />
            {running ? "Analyzing site…" : "Run Site Analysis"}
          </Button>

          {runError && <p className="text-xs text-destructive">{runError}</p>}

          {!analysis && !running && (
            <Card className="border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Draw a boundary on the map first, then run analysis for elevation, slope, and nearby context.
              </p>
            </Card>
          )}

          {analysis && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Area" value={formatArea(analysis.area_sqm ?? 0)} />
                <Metric label="Perimeter" value={formatDistance(analysis.perimeter_m ?? 0)} />
                <Metric label="Elev. min" value={`${analysis.elevation_min_m ?? "—"} m`} />
                <Metric label="Elev. max" value={`${analysis.elevation_max_m ?? "—"} m`} />
                <Metric label="Slope est." value={`${analysis.slope_percent_estimate ?? "—"}%`} />
                <Metric label="Roads nearby" value={String(roads.length)} />
              </div>

              {namedRoads.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-xs">Nearby Roads</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    {namedRoads.slice(0, 8).map((r) => (
                      <div key={r}>• {r}</div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-xs flex items-center gap-2">
                    Risks & Warnings
                    <Badge variant="warning">Review required</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {(analysis.risks_json ?? []).map((r, i) => (
                    <div
                      key={i}
                      className="text-[11px] px-2 py-1.5 rounded bg-muted text-foreground border border-border"
                    >
                      {String(r)}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <p className="text-[10px] text-muted-foreground">
                Buildings detected: {buildings.length} · OSM data may be incomplete
              </p>
            </>
          )}
        </div>

        <div className="flex-1 relative min-h-[320px]">
          <MapView
            center={center}
            zoom={15}
            boundary={project.boundary_geojson}
            alignment={project.alignment_geojson}
          />
        </div>
      </div>

      <MobileBottomNav projectId={projectId} />

      <BottomSummaryBar stats={summaryStats} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="font-semibold text-sm">{value}</p>
      </CardContent>
    </Card>
  );
}
