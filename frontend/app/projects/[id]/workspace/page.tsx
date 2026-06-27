"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BottomSummaryBar from "@/components/layout/BottomSummaryBar";
import DrawingToolsToolbar from "@/components/layout/DrawingToolsToolbar";
import MobileAiDrawer from "@/components/layout/MobileAiDrawer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ProjectError, ProjectLoading } from "@/components/layout/ProjectHeader";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import WorkspaceMapEngine from "@/components/map/WorkspaceMapEngine";
import ParameterForm from "@/components/workspace/ParameterForm";
import { useProjectData } from "@/hooks/useProjectData";
import { useActiveJobPolling } from "@/hooks/useActiveJobPolling";
import { isJobGenerating } from "@/lib/model-url-resolution";
import { api, formatApiErrorMessage, isUsageLimitError, ApiError } from "@/lib/api";
import { toast, toastPromise } from "@/lib/toast";
import type { GeoJSONGeometry, GenerationMode, JobStatus } from "@/lib/types";
import { useProjectStore } from "@/stores/projectStore";

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = Number(params.id);
  const { setActiveJob, activeJob, workspaceFullscreen } = useProjectStore();
  const {
    project,
    scenario,
    design,
    modelFile,
    excavationFile,
    resolvedModels,
    summaryStats,
    loading,
    error,
    load,
  } = useProjectData(projectId, { activeJob });

  const { cancelJob, cancelling } = useActiveJobPolling({
    onCompleted: () => load({ silent: true }),
    onPreviewReady: () => load({ silent: true }),
  });

  const [pendingParams, setPendingParams] = useState<Record<string, unknown> | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("balanced");

  const generate = useCallback(
    async (parameters: Record<string, unknown>, mode: GenerationMode = generationMode) => {
      try {
        const res = await api.post<{ job_id: string; generation_mode: string }>(
          `/api/projects/${projectId}/design/generate`,
          {
            scenario_name: `Scenario ${new Date().toLocaleTimeString()}`,
            parameters,
            generation_mode: mode,
          },
        );
        setActiveJob({
          job_id: res.job_id,
          status: "queued",
          stage: "queued",
          stage_label: "Queued",
          progress: 5,
          preview_ready: false,
          preview_glb_url: null,
          message: "Preparing generation",
          result: null,
          error: null,
        } as JobStatus);
        toast("Design generation started", { variant: "default" });
      } catch (e) {
        const requestHint = e instanceof ApiError && e.requestId ? ` Request ID: ${e.requestId}` : "";
        if (isUsageLimitError(e)) {
          toast("Usage limit reached", {
            variant: "error",
            description: `${formatApiErrorMessage(e)}${requestHint}`,
          });
          return;
        }
        if (e instanceof ApiError && e.status === 403) {
          toast("Access denied", { variant: "error", description: `${formatApiErrorMessage(e)}${requestHint}` });
          return;
        }
        if (e instanceof ApiError && e.status >= 500) {
          toast("Server error", { variant: "error", description: `${formatApiErrorMessage(e)}${requestHint}` });
          return;
        }
        toast("Generation failed", {
          variant: "error",
          description: `${formatApiErrorMessage(e)}${requestHint}`,
        });
      }
    },
    [projectId, setActiveJob, generationMode],
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

  const runSiteAnalysis = useCallback(async () => {
    await toastPromise(api.post(`/api/projects/${projectId}/site-analysis`), {
      loading: "Running site analysis…",
      success: "Site analysis complete",
      error: "Site analysis failed — draw a boundary or alignment first",
    });
    load();
  }, [projectId, load]);

  useEffect(() => {
    if (typeof window === "undefined" || loading) return;
    if (window.location.hash === "#parameters") {
      document.getElementById("parameters-panel")?.scrollIntoView({ behavior: "smooth" });
    }
    if (window.location.hash === "#copilot") {
      window.dispatchEvent(new CustomEvent("geoai:open-copilot"));
    }
  }, [loading]);

  if (loading) return <ProjectLoading />;
  if (error || !project) return <ProjectError error={error || "Project not found"} onRetry={load} />;

  const generating = isJobGenerating(activeJob);

  const liveModelUrl = modelFile?.file_url ?? null;

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden pb-14 md:pb-0">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <WorkspaceLayout
          projectId={projectId}
          defaultFocus={false}
          toolbar={
            <div className="flex items-center gap-2 w-full min-w-0">
              <DrawingToolsToolbar
                projectType={project.project_type}
                boundary={project.boundary_geojson}
                alignment={project.alignment_geojson}
                onSaveBoundary={saveBoundary}
                onSaveAlignment={saveAlignment}
                onGenerate={(mode) =>
                  generate(
                    pendingParams ??
                      (scenario?.input_parameters_json as Record<string, unknown>) ??
                      {},
                    mode ?? generationMode,
                  )
                }
                onAnalyze={analyzeSite}
                generating={generating}
                generationMode={generationMode}
                onGenerationModeChange={setGenerationMode}
              />
              <div className="w-px h-6 bg-border shrink-0" aria-hidden />
              <ParameterForm
                toolbar
                projectType={project.project_type}
                initialValues={
                  pendingParams ??
                  (scenario?.input_parameters_json as Record<string, unknown> | null)
                }
                onGenerate={(params) => generate(params, generationMode)}
                generating={generating}
              />
            </div>
          }
          ai={{
            projectId,
            design,
            onApplyParameters: setPendingParams,
            onRegenerate: generate,
            onRunSiteAnalysis: runSiteAnalysis,
            currentParameters:
              pendingParams ??
              (scenario?.input_parameters_json as Record<string, unknown> | undefined) ??
              null,
          }}
        map={
          <WorkspaceMapEngine
            project={project}
            modelUrl={liveModelUrl}
            excavationUrl={excavationFile?.file_url}
            resolvedModels={resolvedModels}
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
            onGenerationCompleted={load}
            onCancelJob={cancelJob}
            cancellingJob={cancelling}
          />
        }
        />
        <BottomSummaryBar variant="bar" stats={summaryStats} loading={generating} />

      </div>

      {!workspaceFullscreen && (
        <>
          <MobileAiDrawer
            projectId={projectId}
            design={design}
            onApplyParameters={setPendingParams}
            onRegenerate={generate}
            onRunSiteAnalysis={runSiteAnalysis}
          />
          <MobileBottomNav projectId={projectId} />
        </>
      )}
    </div>
  );
}
