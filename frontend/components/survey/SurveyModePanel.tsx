"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { api, uploadSurveyFile } from "@/lib/api";
import type {
  EngineeringLayer,
  GroundControlPoint,
  SurveyDataset,
  SurveyStatus,
  ValidationReport,
} from "@/lib/types";
import { cn } from "@/lib/utils";
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
  const [showValidation, setShowValidation] = useState(false);

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
      setShowValidation(true);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setBusy(false);
    }
  };

  const activeAdjustment = validation?.gcp_adjustment ?? adjustment;
  const failedChecks = validation?.checks.filter((c) => !c.passed) ?? [];
  const passedCount = validation ? validation.checks.filter((c) => c.passed).length : 0;

  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading survey…
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold truncate">Survey</span>
          {status && <AccuracyBadge tier={status.accuracy_tier} compact />}
        </div>
        {status?.survey_mode_enabled && status.engineering_crs_epsg && (
          <span className="text-[10px] text-muted-foreground shrink-0">EPSG:{status.engineering_crs_epsg}</span>
        )}
      </div>

      {!status?.postgis_available && (
        <p className="text-[10px] text-warning leading-snug">
          Requires PostGIS — use Docker for full survey mode.
        </p>
      )}

      {error && <p className="text-[10px] text-destructive">{error}</p>}

      {!status?.survey_mode_enabled ? (
        <Button
          size="sm"
          className="w-full h-7 text-xs"
          disabled={busy || !status?.postgis_available}
          onClick={enableSurveyMode}
        >
          Enable Survey Mode
        </Button>
      ) : (
        <>
          <p className="text-[10px] text-muted-foreground">
            {layers.length} layer{layers.length === 1 ? "" : "s"}
            {datasets.length > 0 && ` · ${datasets.length} dataset${datasets.length === 1 ? "" : "s"}`}
            {gcps.length > 0 && ` · ${gcps.length} GCP${gcps.length === 1 ? "" : "s"}`}
          </p>

          <SurveyLayerToggles compact />

          <CollapsibleSection title="Import data" defaultOpen={false}>
            <div className="space-y-2 px-1 pb-1">
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
          </CollapsibleSection>

          {layers.length > 0 && (
            <CollapsibleSection title={`Layers (${layers.length})`} defaultOpen={false}>
              <EngineeringLayerPanel layers={layers} compact />
            </CollapsibleSection>
          )}

          <CollapsibleSection title="GCP & checks" defaultOpen={false}>
            <div className="space-y-2 px-1 pb-1">
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
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setShowValidation((v) => !v)}
                    className="flex w-full items-center justify-between text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <span>
                      {passedCount}/{validation.checks.length} checks passed
                      {failedChecks.length > 0 && ` · ${failedChecks.length} issue${failedChecks.length === 1 ? "" : "s"}`}
                    </span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showValidation && "rotate-180")} />
                  </button>
                  {showValidation && (
                    <ul className="max-h-24 overflow-y-auto space-y-0.5 text-[10px]">
                      {validation.checks.map((c) => (
                        <li key={c.id} className={c.passed ? "text-muted-foreground" : "text-warning"}>
                          {c.passed ? "✓" : "○"} {c.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}
