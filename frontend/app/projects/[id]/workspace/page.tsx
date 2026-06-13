"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BottomSummaryBar from "@/components/layout/BottomSummaryBar";
import DrawingToolsPanel from "@/components/layout/DrawingToolsPanel";
import MobileAiDrawer from "@/components/layout/MobileAiDrawer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ProjectError, ProjectLoading } from "@/components/layout/ProjectHeader";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import WorkspaceLeftSidebar from "@/components/layout/WorkspaceLeftSidebar";
import MapViewerArea from "@/components/map/MapViewerArea";
import { SidebarSection } from "@/components/ui/collapsible-section";
import JobStatusBar from "@/components/workspace/JobStatusBar";
import ParameterForm from "@/components/workspace/ParameterForm";
import { useProjectData } from "@/hooks/useProjectData";
import { api } from "@/lib/api";
import { toast, toastPromise } from "@/lib/toast";
import type { GeoJSONGeometry, JobStatus } from "@/lib/types";
import { useProjectStore } from "@/stores/projectStore";

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = Number(params.id);
  const {
    project,
    scenario,
    design,
    modelFile,
    excavationFile,
    summaryStats,
    loading,
    error,
    load,
  } = useProjectData(projectId);

  const [pendingParams, setPendingParams] = useState<Record<string, unknown> | null>(null);
  const { setActiveJob, activeJob, workspaceFullscreen } = useProjectStore();

  const generate = useCallback(
    async (parameters: Record<string, unknown>) => {
      try {
        const res = await api.post<{ job_id: string }>(
          `/api/projects/${projectId}/design/generate`,
          { scenario_name: `Scenario ${new Date().toLocaleTimeString()}`, parameters },
        );
        setActiveJob({
          job_id: res.job_id,
          status: "queued",
          result: null,
          error: null,
        } as JobStatus);
        toast("Design generation queued", { variant: "loading" });
      } catch (e) {
        toast("Generation failed", {
          variant: "error",
          description: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [projectId, setActiveJob],
  );

  const saveBoundary = async (g: GeoJSONGeometry) => {
    await toastPromise(api.put(`/api/projects/${projectId}`, { boundary_geojson: g }), {
      loading: "Saving boundary…",
      success: "Boundary saved",
    });
    load();
  };

  const saveAlignment = async (g: GeoJSONGeometry) => {
    await toastPromise(api.put(`/api/projects/${projectId}`, { alignment_geojson: g }), {
      loading: "Saving alignment…",
      success: "Alignment saved",
    });
    load();
  };

  const deleteBoundary = async () => {
    await toastPromise(api.put(`/api/projects/${projectId}`, { boundary_geojson: null }), {
      loading: "Removing boundary…",
      success: "Boundary deleted",
    });
    load();
  };

  const deleteAlignment = async () => {
    await toastPromise(api.put(`/api/projects/${projectId}`, { alignment_geojson: null }), {
      loading: "Removing alignment…",
      success: "Alignment deleted",
    });
    load();
  };

  const saveLocation = async (lng: number, lat: number, name: string) => {
    await toastPromise(
      api.put(`/api/projects/${projectId}`, {
        center_lng: lng,
        center_lat: lat,
        location_name: name,
      }),
      { loading: "Updating location…", success: "Location updated" },
    );
    load();
  };

  const analyzeSite = () => router.push(`/projects/${projectId}/analysis`);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#parameters") {
      document.getElementById("parameters-panel")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading]);

  if (loading) return <ProjectLoading />;
  if (error || !project) return <ProjectError error={error || "Project not found"} onRetry={load} />;

  const generating = activeJob?.status === "running" || activeJob?.status === "queued";

  const leftPanel = (
    <WorkspaceLeftSidebar
      tools={
        <div className="space-y-3">
          <DrawingToolsPanel
            iconOnly
            projectId={project.id}
            projectType={project.project_type}
            boundary={project.boundary_geojson}
            alignment={project.alignment_geojson}
            onImportBoundary={async (g) => saveBoundary(g)}
            onImportAlignment={async (g) => saveAlignment(g)}
            onSaveBoundary={saveBoundary}
            onSaveAlignment={saveAlignment}
            onDeleteBoundary={deleteBoundary}
            onDeleteAlignment={deleteAlignment}
            onAnalyzeTerrain={analyzeSite}
          />
          <SidebarSection title="Design Parameters">
            <div id="parameters-panel">
              <ParameterForm
                compact
                projectType={project.project_type}
                initialValues={
                  pendingParams ??
                  (scenario?.input_parameters_json as Record<string, unknown> | null)
                }
                onGenerate={generate}
                generating={generating}
              />
            </div>
          </SidebarSection>
          <BottomSummaryBar variant="sidebar" stats={summaryStats} loading={generating} />
        </div>
      }
      footer={<JobStatusBar compact onCompleted={load} />}
    />
  );

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden pb-14 md:pb-0">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <WorkspaceLayout
          projectId={projectId}
          defaultFocus={false}
          ai={{
            projectId,
            design,
            onApplyParameters: setPendingParams,
            onRegenerate: generate,
            currentParameters:
              pendingParams ??
              (scenario?.input_parameters_json as Record<string, unknown> | undefined) ??
              null,
          }}
        leftPanel={leftPanel}
        map={
          <MapViewerArea
            project={project}
            modelUrl={modelFile?.file_url}
            excavationUrl={excavationFile?.file_url}
            onBoundaryDrawn={saveBoundary}
            onAlignmentDrawn={saveAlignment}
            onLocationChange={saveLocation}
            onGenerate={() =>
              generate(
                pendingParams ??
                  (scenario?.input_parameters_json as Record<string, unknown>) ??
                  {},
              )
            }
            onAnalyze={analyzeSite}
            showSuggestionsPanel={false}
            defaultView="3d"
          />
        }
        />

      </div>

      {!workspaceFullscreen && (
        <>
          <MobileAiDrawer
            projectId={projectId}
            design={design}
            onApplyParameters={setPendingParams}
            onRegenerate={generate}
          />
          <MobileBottomNav projectId={projectId} />
        </>
      )}
    </div>
  );
}
