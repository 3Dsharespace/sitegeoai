"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe, Map as MapIcon, PanelLeft, Bot } from "lucide-react";
import SiteSuggestionsPanel from "@/components/map/SiteSuggestionsPanel";
import MapToolbarExtended from "@/components/map/MapToolbarExtended";
import Scene3DOverlay from "@/components/map/Scene3DOverlay";
import ElevationProfileChart from "@/components/map/ElevationProfileChart";
import CommandPalette from "@/components/layout/CommandPalette";
import { useWorkspaceMap } from "@/components/layout/WorkspaceMapContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { GeoJSONFeature, GeoJSONGeometry, GeocodeResult, Project, SiteAnalysis } from "@/lib/types";
import type { SiteSuggestion } from "@/lib/site-suggestions";
import { generateSiteSuggestions } from "@/lib/site-suggestions";
import SurveyVisualWarning from "@/components/survey/SurveyVisualWarning";
import { useProjectStore } from "@/stores/projectStore";
import { fetchTileProviders } from "@/lib/map-imagery";
import { cn } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });
const CesiumView = dynamic(() => import("@/components/map/CesiumView"), { ssr: false });

interface Props {
  project: Project;
  modelUrl?: string | null;
  excavationUrl?: string | null;
  onBoundaryDrawn?: (g: GeoJSONGeometry) => void;
  onAlignmentDrawn?: (g: GeoJSONGeometry) => void;
  onLocationChange?: (lng: number, lat: number, name: string) => void | Promise<void>;
  onGenerate?: () => void;
  onAnalyze?: () => void;
  defaultView?: "2d" | "3d";
  showToolbar?: boolean;
  showSuggestionsPanel?: boolean;
}

export default function MapViewerArea({
  project,
  modelUrl,
  excavationUrl,
  onBoundaryDrawn,
  onAlignmentDrawn,
  onLocationChange,
  onGenerate,
  onAnalyze,
  defaultView = "3d",
  showToolbar = true,
  showSuggestionsPanel = true,
}: Props) {
  const projectLng = project.center_lng ?? 77.5946;
  const projectLat = project.center_lat ?? 12.9716;
  const projectLocationKey = `${project.id}:${projectLng}:${projectLat}:${project.location_name ?? ""}`;

  const [view, setView] = useState<"2d" | "3d">(defaultView);
  const [basemap, setBasemap] = useState<"satellite" | "terrain" | "street">("terrain");
  const [searchDraft, setSearchDraft] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [mapCenterOverride, setMapCenterOverride] = useState<[number, number] | null>(null);
  const [locationSyncKey, setLocationSyncKey] = useState(projectLocationKey);
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);
  const { setSiteSuggestions, layers, surveyModeEnabled, surveyAccuracyTier, engineeringLayerFeatures, surveyGcpFeatures, surveyLayers } = useProjectStore();
  const { focusMode, toolsOpen, copilotOpen, onOpenTools, onOpenCopilot } = useWorkspaceMap();

  if (projectLocationKey !== locationSyncKey) {
    setLocationSyncKey(projectLocationKey);
    setMapCenterOverride(null);
    setSearchDraft(null);
  }

  useEffect(() => {
    if (defaultView !== "3d") return;
    void fetchTileProviders().then((providers) => {
      useProjectStore.getState().setLayers({
        terrain: true,
        tiles3d: providers.google_3d_tiles_available || providers.cesium_ion_available,
      });
    });
  }, [defaultView]);

  const activeBasemap: "satellite" | "terrain" | "street" =
    layers.satellite ? "satellite" : basemap === "satellite" ? "terrain" : basemap;

  const mapCenter: [number, number] = useMemo(
    () => mapCenterOverride ?? [projectLng, projectLat],
    [mapCenterOverride, projectLng, projectLat],
  );
  const search = searchDraft ?? project.location_name ?? "";

  useEffect(() => {
    let cancelled = false;
    api
      .get<SiteAnalysis>(`/api/projects/${project.id}/site-analysis`)
      .then((data) => {
        if (!cancelled) setAnalysis(data);
      })
      .catch(() => {
        if (!cancelled) setAnalysis(null);
      });
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const roadFeatures = useMemo(
    () => (analysis?.nearby_roads_json?.features ?? []) as GeoJSONFeature[],
    [analysis],
  );

  const buildingFeatures = useMemo(
    () => (analysis?.existing_buildings_json?.features ?? []) as GeoJSONFeature[],
    [analysis],
  );

  const waterFeatures = useMemo(() => {
    const raw = analysis?.raw_geojson?.features ?? [];
    return raw.filter(
      (f) => f.properties?.category === "waterway" || f.properties?.natural === "water",
    ) as GeoJSONFeature[];
  }, [analysis]);

  const analysisFeatures = useMemo(() => {
    const feats: GeoJSONFeature[] = [...roadFeatures];
    if (buildingFeatures.length) feats.push(...buildingFeatures);
    return feats;
  }, [roadFeatures, buildingFeatures]);

  useEffect(() => {
    if (!project.boundary_geojson && project.center_lng != null && project.center_lat != null) {
      api
        .post<{ suggestions: SiteSuggestion[] }>(`/api/projects/${project.id}/site-suggestions`, {
          lng: project.center_lng,
          lat: project.center_lat,
        })
        .then((res) => setSiteSuggestions(res.suggestions.slice(0, 6)))
        .catch(() => {
          const list = generateSiteSuggestions(
            project.center_lng!,
            project.center_lat!,
            project.project_type,
            roadFeatures,
          );
          setSiteSuggestions(list.slice(0, 6));
        });
    }
  }, [
    project.boundary_geojson,
    project.center_lng,
    project.center_lat,
    project.project_type,
    project.id,
    roadFeatures,
    setSiteSuggestions,
  ]);

  const doSearch = async () => {
    if (search.length < 2) return;
    setSearching(true);
    setResults([]);
    try {
      const data = await api.get<{ results: GeocodeResult[] }>(
        `/api/geocode?q=${encodeURIComponent(search)}`,
      );
      setResults(data.results);
      if (data.results.length === 1) pickResult(data.results[0]);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = async (r: GeocodeResult) => {
    setSearchDraft(r.name);
    setResults([]);
    setMapCenterOverride([r.lng, r.lat]);
    await onLocationChange?.(r.lng, r.lat, r.name);
  };

  const handleBasemap = (mode: typeof basemap) => {
    setBasemap(mode);
    useProjectStore.getState().setLayers({ satellite: mode === "satellite" });
    if (mode === "satellite" && view === "2d") {
      const controls = useProjectStore.getState().mapRef;
      const viewport = controls?.getViewport?.();
      if (viewport && viewport.zoom < 16) {
        controls?.flyToViewport?.({ ...viewport, zoom: 16 });
      }
    }
  };

  const handleViewChange = (next: "2d" | "3d") => {
    setView(next);
    if (next === "3d") {
      void fetchTileProviders().then((providers) => {
        useProjectStore.getState().setLayers({
          terrain: true,
          tiles3d: providers.google_3d_tiles_available || providers.cesium_ion_available,
        });
      });
    }
  };

  const applyBoundary = useCallback(
    async (s: SiteSuggestion) => {
      await onBoundaryDrawn?.(s.geometry);
    },
    [onBoundaryDrawn],
  );

  const applyAlignment = useCallback(
    async (s: SiteSuggestion) => {
      await onAlignmentDrawn?.(s.geometry);
    },
    [onAlignmentDrawn],
  );

  const onSuggestionApplied = useCallback(
    (kind: "boundary" | "alignment", geometry: GeoJSONGeometry) => {
      if (kind === "boundary") onBoundaryDrawn?.(geometry);
      else onAlignmentDrawn?.(geometry);
    },
    [onBoundaryDrawn, onAlignmentDrawn],
  );

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden map-viewport",
        focusMode && "rounded-none",
      )}
    >
      <CommandPalette projectId={project.id} onAnalyze={onAnalyze} onGenerate={onGenerate} />

      {showToolbar && (
        <div
          className={cn(
            "absolute z-20 top-3 flex flex-col gap-2 pointer-events-none",
            focusMode ? "left-14 right-3" : "left-3 right-3",
          )}
        >
          <div className="flex items-center gap-2">
            <div className="relative pointer-events-auto panel-glass flex min-h-10 min-w-0 max-w-sm flex-1 items-center gap-1 rounded-md px-1.5 py-1 sm:max-w-md">
              <Input
                value={search}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="Search location…"
                className="h-8 min-w-0 flex-1 border-0 bg-transparent text-xs focus:ring-0"
              />
              <Button size="sm" className="h-8 shrink-0 px-2" onClick={doSearch} disabled={searching}>
                <Globe className="h-3.5 w-3.5" />
              </Button>
              {results.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-40 overflow-hidden overflow-y-auto rounded-md panel-glass shadow-lg">
                  {results.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => pickResult(r)}
                        className="w-full border-b border-border px-3 py-2 text-left text-xs last:border-0 hover:bg-primary/10"
                      >
                        {r.name}
                        <span className="ml-1 text-muted-foreground">({r.provider})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pointer-events-auto panel-glass shrink-0 rounded-md px-1 py-1">
              <Tabs
                bare
                compact
                tabs={[
                  { id: "satellite", label: "Satellite" },
                  { id: "terrain", label: "Terrain" },
                  { id: "street", label: "Street" },
                ]}
                active={activeBasemap}
                onChange={(id) => handleBasemap(id as typeof basemap)}
              />
            </div>

            <div className="pointer-events-auto panel-glass shrink-0 rounded-md px-2 py-1 text-[10px] text-muted-foreground hidden sm:block">
              Visual reference — not for quantity takeoff
            </div>

            <div className="pointer-events-auto panel-glass flex shrink-0 items-center gap-0.5 rounded-md px-1 py-1">
              <Tabs
                bare
                compact
                tabs={[
                  { id: "2d", label: "2D" },
                  { id: "3d", label: "3D" },
                ]}
                active={view}
                onChange={(id) => handleViewChange(id as "2d" | "3d")}
              />
              <MapToolbarExtended view={view} />
            </div>
          </div>
        </div>
      )}

      {showSuggestionsPanel && view === "2d" && (
        <div className="absolute top-16 right-3 z-20 w-[220px] max-h-[calc(100%-6rem)] overflow-y-auto pointer-events-auto panel-glass rounded-lg p-2 hidden lg:block">
          <SiteSuggestionsPanel
            compact
            projectId={project.id}
            projectType={project.project_type}
            centerLng={mapCenter[0]}
            centerLat={mapCenter[1]}
            roadFeatures={roadFeatures}
            buildingFeatures={buildingFeatures}
            onApplyBoundary={applyBoundary}
            onApplyAlignment={applyAlignment}
          />
        </div>
      )}

      {focusMode && !toolsOpen && (
        <div className="absolute bottom-20 left-3 z-20 pointer-events-auto">
          <Button
            variant="default"
            size="sm"
            className="h-auto min-w-[2.75rem] flex-col gap-0.5 py-2 px-1.5 panel-glass border-primary/30 shadow-md"
            title="Engineering Tools"
            onClick={onOpenTools}
            aria-label="Open Engineering Tools"
          >
            <PanelLeft className="h-4 w-4" />
            <span className="text-[8px] font-semibold leading-none">Tools</span>
          </Button>
        </div>
      )}

      {focusMode && !copilotOpen && (
        <div className="absolute bottom-20 right-3 z-20 pointer-events-auto">
          <Button
            size="sm"
            className="h-auto min-w-[2.75rem] flex-col gap-0.5 py-2 px-1.5 panel-glass border-primary/30 shadow-md"
            title="AI Copilot"
            onClick={onOpenCopilot}
            aria-label="Open AI Copilot"
          >
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-[8px] font-semibold leading-none">Copilot</span>
          </Button>
        </div>
      )}

      {view === "2d" && <ElevationProfileChart project={project} />}
      {view === "3d" && <Scene3DOverlay />}

      <div className="absolute inset-0">
        {view === "2d" ? (
          <MapView
            center={mapCenter}
            zoom={15}
            basemap={activeBasemap}
            boundary={project.boundary_geojson}
            alignment={project.alignment_geojson}
            analysisFeatures={analysisFeatures}
            projectType={project.project_type}
            roadFeatures={roadFeatures}
            buildingFeatures={buildingFeatures}
            onBoundaryDrawn={onBoundaryDrawn}
            onAlignmentDrawn={onAlignmentDrawn}
            onSuggestionApplied={onSuggestionApplied}
            hideFloatingTools
          />
        ) : (
          <CesiumView
            center={mapCenter}
            basemap={activeBasemap}
            boundary={project.boundary_geojson}
            alignment={project.alignment_geojson}
            modelUrl={modelUrl ?? null}
            excavationUrl={excavationUrl ?? null}
            useModelLayers={!!modelUrl}
            roadFeatures={surveyModeEnabled && surveyLayers.surveyVectors ? engineeringLayerFeatures : roadFeatures}
            buildingFeatures={buildingFeatures}
            waterFeatures={waterFeatures}
            surveyMode={surveyModeEnabled}
            surveyGcpFeatures={surveyGcpFeatures}
            disableVendor3DTiles={surveyModeEnabled && !surveyLayers.visualBasemap}
            terrainExaggeration={
              analysis?.elevation_max_m != null && analysis?.elevation_min_m != null
                ? 1.2 +
                  Math.min(1.5, (analysis.elevation_max_m - analysis.elevation_min_m) / 200)
                : 1.35
            }
          />
        )}
      </div>

      {!project.boundary_geojson && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-background/40 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="panel-glass rounded-lg px-8 py-6 text-center max-w-sm mx-4 shadow-lg pointer-events-none"
          >
            <MapIcon className="h-10 w-10 text-primary mx-auto mb-3" />
            <p className="text-[15px] font-semibold mb-1">Select project site</p>
            <p className="text-[13px] text-muted-foreground">
              Use Smart Suggest, pick on map, or draw a boundary manually.
            </p>
          </motion.div>
        </div>
      )}

      <SurveyVisualWarning surveyMode={surveyModeEnabled} accuracyTier={surveyAccuracyTier} />
    </div>
  );
}
