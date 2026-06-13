"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type {
  DesignScenario,
  GeneratedFileInfo,
  Project,
  QuantityEstimate,
  SiteAnalysis,
} from "@/lib/types";
import type { SummaryStats } from "@/components/layout/BottomSummaryBar";
import { useProjectStore } from "@/stores/projectStore";

const scenarioStorageKey = (projectId: number) => `project-${projectId}-scenario-id`;

export function useProjectData(projectId: number) {
  const [project, setProject] = useState<Project | null>(null);
  const [scenarios, setScenarios] = useState<DesignScenario[]>([]);
  const [scenario, setScenario] = useState<DesignScenario | null>(null);
  const [estimate, setEstimate] = useState<QuantityEstimate | null>(null);
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);
  const [files, setFiles] = useState<GeneratedFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pickScenario = useCallback((list: DesignScenario[], preferredId?: number | null) => {
    if (preferredId) {
      const found = list.find((s) => s.id === preferredId);
      if (found) return found;
    }
    return list.find((s) => s.status === "completed") ?? list[0] ?? null;
  }, []);

  const load = useCallback(async () => {
    if (!projectId || Number.isNaN(projectId)) return;
    setLoading(true);
    setError("");
    try {
      const storedId =
        typeof window !== "undefined"
          ? Number(localStorage.getItem(scenarioStorageKey(projectId)) || "") || null
          : null;

      const [p, scenarioList, fileList] = await Promise.all([
        api.get<Project>(`/api/projects/${projectId}`),
        api.get<DesignScenario[]>(`/api/projects/${projectId}/scenarios`),
        api.get<GeneratedFileInfo[]>(`/api/projects/${projectId}/exports/files`),
      ]);
      setProject(p);
      useProjectStore.getState().setProject(p);
      setScenarios(scenarioList);
      setScenario(pickScenario(scenarioList, storedId));
      setFiles(fileList);

      try {
        const e = await api.get<QuantityEstimate>(`/api/projects/${projectId}/estimates`);
        setEstimate(e);
      } catch {
        setEstimate(null);
      }

      try {
        const a = await api.get<SiteAnalysis>(`/api/projects/${projectId}/site-analysis`);
        setAnalysis(a);
      } catch {
        setAnalysis(null);
      }
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, [projectId, pickScenario]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      await load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const selectScenario = useCallback((s: DesignScenario) => {
    setScenario(s);
    if (typeof window !== "undefined") {
      localStorage.setItem(scenarioStorageKey(projectId), String(s.id));
    }
  }, [projectId]);

  const calc = scenario?.design_output_json?.calculated;
  const modelFile = useMemo(
    () =>
      files.find((f) => f.file_type === "glb" && (f.scenario_id === scenario?.id || !f.scenario_id)) ??
      files.find((f) => f.file_type === "glb"),
    [files, scenario?.id],
  );
  const excavationFile = useMemo(
    () =>
      files.find(
        (f) => f.file_type === "glb-excavation" && (f.scenario_id === scenario?.id || !f.scenario_id),
      ) ?? files.find((f) => f.file_type === "glb-excavation"),
    [files, scenario?.id],
  );

  const summaryStats: SummaryStats = {
    totalCost: estimate?.total_cost_estimate ?? calc?.cost_summary.total_medium,
    cementBags: estimate?.cement_bags ?? calc?.quantities.cement_bags,
    steelKg: estimate?.steel_kg ?? calc?.quantities.steel_kg,
    excavationM3: estimate?.excavation_m3 ?? calc?.quantities.excavation_m3,
    timelineMonths: calc?.timeline.estimated_months_medium as number | undefined,
    areaSqm: analysis?.area_sqm ?? undefined,
    riskScore: analysis?.risks_json?.length
      ? Math.min(10, analysis.risks_json.length + 3)
      : scenario?.design_output_json?.risks?.length
        ? Math.min(10, scenario.design_output_json.risks.length + 4)
        : undefined,
    currency: calc?.cost_summary.currency,
  };

  return {
    project,
    scenarios,
    scenario,
    selectScenario,
    estimate,
    analysis,
    files,
    loading,
    error,
    load,
    calc,
    modelFile,
    excavationFile,
    summaryStats,
    design: scenario?.design_output_json ?? null,
  };
}
