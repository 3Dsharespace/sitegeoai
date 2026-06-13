"use client";

import { useCallback, useEffect, useState } from "react";
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
    void refresh().catch(() => setError("Survey API unavailable"));
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

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">Survey Mode</h3>
        {status && <AccuracyBadge tier={status.accuracy_tier} />}
      </div>

      {!status?.postgis_available && (
        <p className="text-xs text-warning rounded border border-warning/30 p-2">
          Survey Mode requires PostgreSQL + PostGIS. Start Docker services and connect the backend to PostGIS.
        </p>
      )}

      {status?.visual_warning && (
        <p className="text-[10px] leading-snug text-muted-foreground border-l-2 border-warning pl-2">
          {status.visual_warning}
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!status?.survey_mode_enabled ? (
        <Button size="sm" className="w-full" disabled={busy || !status?.postgis_available} onClick={enableSurveyMode}>
          Enable Survey Mode
        </Button>
      ) : (
        <>
          {status.engineering_crs_epsg && (
            <p className="text-[10px] text-muted-foreground">Engineering CRS: EPSG:{status.engineering_crs_epsg}</p>
          )}

          <SurveyLayerToggles />

          <div className="space-y-2 border-t border-border pt-2">
            <p className="text-xs font-semibold">Import</p>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={importFormat}
                onChange={(e) => setImportFormat(e.target.value)}
                className="h-7 text-xs px-2"
              >
                <option value="geojson">GeoJSON</option>
                <option value="shapefile">Shapefile (.zip)</option>
                <option value="geotiff">GeoTIFF DEM/Ortho</option>
                <option value="gcp_csv">GCP CSV</option>
                <option value="las">LAS/LAZ</option>
                <option value="dxf">DXF</option>
              </Select>
              <Input
                value={layerType}
                onChange={(e) => setLayerType(e.target.value)}
                className="h-7 text-xs"
                placeholder="layer_type"
              />
            </div>
            <Input
              type="file"
              className="h-8 text-xs"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
              }}
            />
          </div>

          <EngineeringLayerPanel layers={layers} />

          {datasets.length > 0 && (
            <div className="text-[10px] text-muted-foreground">
              {datasets.length} dataset(s): {datasets.map((d) => d.kind).join(", ")}
            </div>
          )}

          {gcps.length > 0 && (
            <p className="text-[10px] text-muted-foreground">{gcps.length} GCP(s) on file</p>
          )}

          <OffsetCorrectionTool
            projectId={projectId}
            adjustment={activeAdjustment}
            onApplied={refresh}
          />

          <Button size="sm" variant="outline" className="w-full h-7 text-xs" disabled={busy} onClick={runValidation}>
            Run validation
          </Button>

          {validation && (
            <ul className="space-y-1 text-[10px]">
              {validation.checks.map((c) => (
                <li key={c.id} className={c.passed ? "text-muted-foreground" : "text-warning"}>
                  {c.passed ? "✓" : "○"} {c.label}: {c.detail}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
