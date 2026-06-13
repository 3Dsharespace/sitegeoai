"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Box,
  Eye,
  Layers,
  Maximize2,
  Move3d,
  Rotate3d,
  Scissors,
  SlidersHorizontal,
  ZoomIn,
} from "lucide-react";
import BottomSummaryBar from "@/components/layout/BottomSummaryBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ProjectError, ProjectLoading } from "@/components/layout/ProjectHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProjectData } from "@/hooks/useProjectData";
import { cn } from "@/lib/utils";
import { type ModelLayerVisibility, useProjectStore } from "@/stores/projectStore";

const CesiumView = dynamic(() => import("@/components/map/CesiumView"), { ssr: false });

const MODEL_LAYERS: { key: keyof ModelLayerVisibility; label: string; group: string }[] = [
  { key: "outer", label: "Terrain", group: "Site" },
  { key: "foundation", label: "Foundation", group: "Structure" },
  { key: "inner", label: "Structure", group: "Structure" },
  { key: "steel", label: "Reinforcement", group: "Structure" },
  { key: "concrete", label: "Concrete", group: "Structure" },
  { key: "electrical", label: "Electrical", group: "MEP" },
  { key: "drainage", label: "Drainage", group: "MEP" },
  { key: "pipeline", label: "Plumbing", group: "MEP" },
  { key: "traffic", label: "Roads / Traffic", group: "Site" },
];

const VIEW_TOOLS: {
  icon: typeof Rotate3d;
  label: string;
  tool: "orbit" | "pan" | "zoom" | "exploded" | "section";
}[] = [
  { icon: Rotate3d, label: "Orbit", tool: "orbit" },
  { icon: Move3d, label: "Pan", tool: "pan" },
  { icon: ZoomIn, label: "Zoom", tool: "zoom" },
  { icon: Eye, label: "Exploded", tool: "exploded" },
  { icon: Scissors, label: "Section", tool: "section" },
];

export default function ModelViewerPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { project, modelFile, excavationFile, summaryStats, loading, error, load } =
    useProjectData(projectId);
  const { modelLayers, toggleModelLayer, cesiumTool, setCesiumTool } = useProjectStore();
  const [transparency, setTransparency] = useState(100);

  if (loading) return <ProjectLoading message="Loading 3D model…" />;
  if (error || !project) return <ProjectError error={error || "Not found"} onRetry={load} />;

  const center: [number, number] = [project.center_lng ?? 77.5946, project.center_lat ?? 12.9716];
  const hasModel = !!modelFile?.file_url;

  const groups = [...new Set(MODEL_LAYERS.map((l) => l.group))];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background pb-14 md:pb-0">
      <div className="flex-1 flex min-h-0 p-2 gap-2">
        <aside className="w-56 shrink-0 panel-elevated rounded-lg overflow-y-auto hidden md:block">
          <div className="p-3 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Layers className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Layer Controls</p>
            </div>
            <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
              Layers map to structure vs excavation GLBs. Single-mesh models toggle as a group.
            </p>
            {groups.map((group) => (
              <div key={group}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {MODEL_LAYERS.filter((l) => l.group === group).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleModelLayer(key)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-all duration-200 border",
                        modelLayers[key]
                          ? "bg-primary/10 text-foreground border-primary/25"
                          : "text-muted-foreground border-transparent hover:bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-sm shrink-0",
                          modelLayers[key] ? "bg-primary" : "bg-muted-foreground/30",
                        )}
                      />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Transparency
              </div>
              <input
                aria-label="Transparency"
                placeholder="Transparency"
                type="range"
                min={20}
                max={100}
                value={transparency}
                onChange={(e) => setTransparency(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="font-data text-[10px] text-muted-foreground">{transparency}%</p>
            </div>
          </div>
        </aside>

        <div className="flex-1 relative min-w-0 rounded-lg map-viewport overflow-hidden">
          <div className="absolute top-3 left-3 z-20 flex gap-1 panel-glass rounded-md p-1">
            {VIEW_TOOLS.map(({ icon: Icon, label, tool }) => (
              <Button
                key={label}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 gap-1 text-[10px] px-2",
                  cesiumTool === tool && "bg-primary/15 text-primary",
                )}
                onClick={() => setCesiumTool(tool)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>

          <div className="absolute top-3 right-3 z-20">
            <Button variant="secondary" size="icon" className="h-8 w-8 panel-glass">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {!hasModel ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Card float className="p-8 text-center max-w-md">
                <Box className="h-12 w-12 text-primary/50 mx-auto mb-4" />
                <p className="font-semibold text-base mb-2">No 3D model generated</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Run AI Design Studio to produce a conceptual GLB model for BIM inspection.
                </p>
                <Badge variant="warning">Preliminary visualization</Badge>
              </Card>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
              style={{ opacity: transparency / 100 }}
            >
              <CesiumView
                center={center}
                boundary={project.boundary_geojson}
                alignment={project.alignment_geojson}
                modelUrl={modelFile?.file_url ?? null}
                excavationUrl={excavationFile?.file_url ?? null}
                useModelLayers
              />
            </motion.div>
          )}
        </div>
      </div>

      <MobileBottomNav projectId={projectId} />

      <BottomSummaryBar stats={summaryStats} />
    </div>
  );
}
