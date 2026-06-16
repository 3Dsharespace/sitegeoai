"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SidebarMetricChip, SidebarStatusCard } from "@/components/layout/SidebarStatusCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api, uploadSurveyFile } from "@/lib/api";
import type {
  EngineeringLayer,
  GroundControlPoint,
  SurveyDataset,
  SurveyStatus,
  ValidationReport,
} from "@/lib/types";
import AccuracyBadge from "./AccuracyBadge";
import EngineeringLayerPanel from "./EngineeringLayerPanel";
import OffsetCorrectionTool from "./OffsetCorrectionTool";
import SurveyLayerToggles from "./SurveyLayerToggles";

interface Props {
  projectId: number;
  onStatusChange?: (status: SurveyStatus) => void;
  onDataLoaded?: (layers: EngineeringLayer[], gcps: GroundControlPoint[]) => void;
}

const VECTOR_FORMATS = new Set(["geojson", "shapefile", "dxf"]);

export default function SurveyModePanel({ projectId, onStatusChange, onDataLoaded }: Props) {
  const [status, setStatus] = useState<SurveyStatus | null>(null);
  const [layers, setLayers] = useState<EngineeringLayer[]>([]);
  const [datasets, setDatasets] = useState<SurveyDataset[]>([]);
  const [gcps, setGcps] = useState<GroundControlPoint[]>([]);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [adjustment, setAdjustment] = useState<ValidationReport["gcp_adjustment"] | null>(null);
  const [importFormat, setImportFormat] = useState("geojson");
  const [layerType, setLayerType] = useState("road_centerline");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [st, ly, ds, gp, adj] = await Promise.all([
      api.get<SurveyStatus>(`/api/projects/${projectId}/survey/status`),
      api.get<EngineeringLayer[]>(`/api/projects/${projectId}/survey/layers`),
      api.get<SurveyDataset[]>(`/api/projects/${projectId}/survey/datasets`),
      api.get<GroundControlPoint[]>(`/api/projects/${projectId}/survey/gcp`),
      api.get<ValidationReport["gcp_adjustment"]>(`/api/projects/${projectId}/survey/gcp/adjustment`).catch(() => null),
    ]);
    setStatus(st);
    setLayers(ly);
    setDatasets(ds);
    setGcps(gp);
    setAdjustment(adj);
    onStatusChange?.(st);
    onDataLoaded?.(ly, gp);
  }, [projectId, onStatusChange, onDataLoaded]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      void refresh()
        .catch(() => setError("Survey API unavailable"))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const enableSurveyMode = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/projects/${projectId}/survey/mode`, { enabled: true });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enable Survey Mode");
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      await uploadSurveyFile(projectId, file, {
        format: importFormat,
        layer_type: layerType,
        name: file.name,
        kind: importFormat === "geotiff" ? "dem" : "vector",
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const runValidation = async () => {
    setBusy(true);
    try {
      const report = await api.post<ValidationReport>(`/api/projects/${projectId}/survey/validate`);
      setValidation(report);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setBusy(false);
    }
  };

  const activeAdjustment = validation?.gcp_adjustment ?? adjustment;
  const passedCount = validation ? validation.checks.filter((c) => c.passed).length : 0;
  const failedChecks = validation?.checks.filter((c) => !c.passed) ?? [];

  if (loading && !status) {
    return (
      <SidebarStatusCard title="Survey">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading…
        </div>
      </SidebarStatusCard>
    );
  }

  return (
    <SidebarStatusCard
      title="Survey"
      trailing={status ? <AccuracyBadge tier={status.accuracy_tier} compact /> : null}
    >
      {!status?.postgis_available && (
        <p className="text-[10px] text-warning leading-snug rounded-md border border-warning/25 bg-warning/5 px-2 py-1">
          PostGIS required — start Docker for full survey mode.
        </p>
      )}

      {error && <p className="text-[10px] text-destructive">{error}</p>}

      {!status?.survey_mode_enabled ? (
        <Button
          size="sm"
          className="w-full h-8 text-xs"
          disabled={busy || !status?.postgis_available}
          onClick={enableSurveyMode}
        >
          Enable Survey Mode
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1">
            <SidebarMetricChip label="Layers" value={layers.length} />
            <SidebarMetricChip label="Data" value={datasets.length} />
            <SidebarMetricChip label="GCPs" value={gcps.length} />
          </div>

          {status.engineering_crs_epsg && (
            <p className="text-[10px] text-muted-foreground">CRS EPSG:{status.engineering_crs_epsg}</p>
          )}

          <SurveyLayerToggles compact />

          <div className="space-y-1.5 rounded-md border border-border/50 bg-muted/10 p-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Import</p>
            <Select
              value={importFormat}
              onChange={(e) => setImportFormat(e.target.value)}
              className="h-7 text-xs px-2 w-full"
            >
              <option value="geojson">GeoJSON</option>
              <option value="shapefile">Shapefile (.zip)</option>
              <option value="geotiff">GeoTIFF DEM/Ortho</option>
              <option value="gcp_csv">GCP CSV</option>
              <option value="las">LAS/LAZ</option>
              <option value="dxf">DXF</option>
            </Select>
            {VECTOR_FORMATS.has(importFormat) && (
              <Select
                value={layerType}
                onChange={(e) => setLayerType(e.target.value)}
                className="h-7 text-xs px-2 w-full"
              >
                <option value="road_centerline">Road centerline</option>
                <option value="pipeline_centerline">Pipeline centerline</option>
                <option value="site_boundary">Site boundary</option>
                <option value="building_footprint">Building footprint</option>
              </Select>
            )}
            <Input
              type="file"
              className="h-7 text-[10px]"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
              }}
            />
          </div>

          {layers.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Layers ({layers.length})
              </p>
              <EngineeringLayerPanel layers={layers} compact />
            </div>
          )}

          {activeAdjustment && (
            <OffsetCorrectionTool
              projectId={projectId}
              adjustment={activeAdjustment}
              onApplied={refresh}
              compact
            />
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full h-7 text-xs"
            disabled={busy}
            onClick={runValidation}
          >
            Run validation
          </Button>

          {validation && (
            <div className="text-[10px] space-y-1 border-t border-border/50 pt-1.5">
              <p className="text-muted-foreground">
                {passedCount}/{validation.checks.length} checks passed
                {failedChecks.length > 0 && ` · ${failedChecks.length} issues`}
              </p>
              {failedChecks.slice(0, 2).map((c) => (
                <p key={c.id} className="text-warning line-clamp-2">
                  {c.label}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </SidebarStatusCard>
  );
}
