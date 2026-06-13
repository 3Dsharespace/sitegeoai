"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Box,
  Check,
  Circle,
  FolderOpen,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { computeHealth, type ProjectHealth } from "@/lib/project-workflow";
import { useDemoProjectId } from "@/lib/useDemoProjectId";
import { api } from "@/lib/api";
import type { DesignScenario, Project, SiteAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_VARIANT: Record<string, "primary" | "accent" | "warning" | "success"> = {
  flyover: "primary",
  building: "accent",
  pipeline: "warning",
  road: "success",
};

const HEALTH_LABELS: { key: keyof ProjectHealth; label: string }[] = [
  { key: "hasLocation", label: "Site" },
  { key: "hasBoundary", label: "Boundary" },
  { key: "hasAnalysis", label: "Analysis" },
  { key: "hasParameters", label: "Params" },
  { key: "hasDesign", label: "Design" },
  { key: "hasEstimate", label: "BOQ" },
];

async function fetchProjectHealth(project: Project): Promise<ProjectHealth> {
  let scenarios: DesignScenario[] = [];
  let hasEstimate = false;
  let hasAnalysis = false;
  try {
    scenarios = await api.get<DesignScenario[]>(`/api/projects/${project.id}/scenarios`);
  } catch {
    /* ignore */
  }
  try {
    await api.get(`/api/projects/${project.id}/estimates`);
    hasEstimate = true;
  } catch {
    /* ignore */
  }
  try {
    await api.get<SiteAnalysis>(`/api/projects/${project.id}/site-analysis`);
    hasAnalysis = true;
  } catch {
    /* ignore */
  }
  return computeHealth(project, scenarios, hasEstimate, hasAnalysis);
}

function HealthStrip({ health }: { health: ProjectHealth }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {HEALTH_LABELS.map(({ key, label }) => {
        const done = health[key] as boolean;
        return (
          <span
            key={key}
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md border",
              done
                ? "border-success/30 bg-success/10 text-success"
                : "border-border text-muted-foreground",
            )}
          >
            {done ? <Check className="h-2.5 w-2.5" /> : <Circle className="h-2.5 w-2.5 opacity-40" />}
            {label}
          </span>
        );
      })}
    </div>
  );
}

async function loadProjectsWithHealth() {
  const list = await api.get<Project[]>("/api/projects");
  let healthEntries: [number, ProjectHealth][] = [];
  try {
    const summaries = await api.get<
      {
        project_id: number;
        has_location: boolean;
        has_boundary: boolean;
        has_analysis: boolean;
        has_parameters: boolean;
        has_design: boolean;
        has_estimate: boolean;
        scenario_count: number;
        progress: number;
      }[]
    >("/api/projects/summaries");
    healthEntries = summaries.map((s) => [
      s.project_id,
      {
        hasLocation: s.has_location,
        hasBoundary: s.has_boundary,
        hasAnalysis: s.has_analysis,
        hasParameters: s.has_parameters,
        hasDesign: s.has_design,
        hasEstimate: s.has_estimate,
        scenarioCount: s.scenario_count,
        progress: s.progress,
      },
    ]);
  } catch {
    healthEntries = await Promise.all(
      list.map(async (p) => [p.id, await fetchProjectHealth(p)] as const),
    );
  }
  return { list, healthMap: Object.fromEntries(healthEntries) as Record<number, ProjectHealth> };
}

export default function DashboardPage() {
  const demoId = useDemoProjectId();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [healthMap, setHealthMap] = useState<Record<number, ProjectHealth>>({});
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    loadProjectsWithHealth()
      .then(({ list, healthMap: hm }) => {
        setProjects(list);
        setHealthMap(hm);
      })
      .catch((e) => setError(String(e.message ?? e)));

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: number) => {
    if (!confirm("Delete this project and all its data?")) return;
    await api.delete(`/api/projects/${id}`);
    load();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight">Project Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Infrastructure planning projects · GIS · AI · BIM
            </p>
          </div>
          <Link href="/projects/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">
              Could not reach the backend API: {error}. Start the backend at localhost:8000.
            </p>
          </Card>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <Link href="/projects/new">
            <Card float className="hover:border-primary/40 cursor-pointer h-full group">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <Plus className="h-5 w-5 text-accent" />
                </div>
                <CardTitle>New Project</CardTitle>
                <CardDescription>Select a site and start planning</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href={`/projects/${demoId}/workspace`}>
            <Card float className="hover:border-primary/40 cursor-pointer h-full group">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center bg-accent/10 group-hover:bg-accent/15 transition-colors">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <CardTitle>Demo Project</CardTitle>
                <CardDescription>Explore Bengaluru flyover sample</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href={`/projects/${demoId}/model`}>
            <Card float className="hover:border-primary/40 cursor-pointer h-full group">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center bg-muted group-hover:bg-muted/80 transition-colors">
                  <Box className="h-5 w-5 text-accent" />
                </div>
                <CardTitle>3D Model Viewer</CardTitle>
                <CardDescription>Inspect layers and structure</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-accent" />
            Your Projects
          </h2>

          {!projects && !error && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}

          {projects && projects.length === 0 && (
            <Card className="border-dashed p-12 text-center">
              <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">No projects yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first preliminary plan or explore the demo project.
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/projects/new">
                  <Button size="sm">Create Project</Button>
                </Link>
                <Link href={`/projects/${demoId}/workspace`}>
                  <Button size="sm" variant="outline">
                    View Demo
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          <div className="grid gap-3">
            {projects?.map((p) => {
              const health = healthMap[p.id];
              return (
                <Card key={p.id} float className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link
                          href={`/projects/${p.id}/workspace`}
                          className="font-semibold hover:text-accent transition-colors truncate"
                        >
                          {p.name}
                        </Link>
                        <Badge variant={TYPE_VARIANT[p.project_type] ?? "default"}>
                          {p.project_type}
                        </Badge>
                        <Badge variant="default">{p.status}</Badge>
                        {health && (
                          <span className="text-[10px] font-data text-muted-foreground">
                            {health.progress}% complete
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {p.location_name ||
                          (p.center_lat != null
                            ? `${p.center_lat.toFixed(5)}, ${p.center_lng?.toFixed(5)}`
                            : "No location set")}
                      </p>
                      {health && <HealthStrip health={health} />}
                    </div>
                    <div className="flex gap-2 shrink-0 flex-wrap">
                      <Link href={`/projects/${p.id}/workspace`}>
                        <Button size="sm" variant="secondary" className="gap-1">
                          Open <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Link href={`/projects/${p.id}/estimate`}>
                        <Button size="sm" variant="outline">
                          BOQ
                        </Button>
                      </Link>
                      {health && health.scenarioCount > 1 && (
                        <Link href={`/projects/${p.id}/scenarios`}>
                          <Button size="sm" variant="outline">
                            Compare
                          </Button>
                        </Link>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => remove(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <DisclaimerBanner />
      </div>
    </div>
  );
}
