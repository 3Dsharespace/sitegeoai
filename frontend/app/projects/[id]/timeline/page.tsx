"use client";

import { useParams } from "next/navigation";
import { CheckCircle2, Circle, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomSummaryBar from "@/components/layout/BottomSummaryBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ProjectError, ProjectLoading } from "@/components/layout/ProjectHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectData } from "@/hooks/useProjectData";
import { cn } from "@/lib/utils";

export default function TimelinePage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { project, design, calc, summaryStats, loading, error, load } = useProjectData(projectId);

  if (loading) return <ProjectLoading />;
  if (error || !project) return <ProjectError error={error || "Not found"} onRetry={load} />;

  const sequence = design?.construction_sequence ?? [];
  const timeline = calc?.timeline;
  const months = timeline?.estimated_months_medium as number | undefined;

  const downloadTimeline = () => {
    if (!design) return;
    const payload = {
      project: project.name,
      disclaimer: "Preliminary planning only — not for construction approval",
      timeline,
      construction_sequence: sequence,
      required_permissions: design.required_permissions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-timeline.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-14 md:pb-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
        {!design && (
          <Card className="border-dashed p-8 text-center">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Generate a design to see the construction sequence and timeline.</p>
          </Card>
        )}

        {design && (
          <>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" className="gap-2" onClick={downloadTimeline}>
                <Download className="h-3.5 w-3.5" />
                Download Timeline
              </Button>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Estimated Duration (low)</p>
                  <p className="text-2xl font-bold">{timeline?.estimated_months_low ?? "—"} mo</p>
                </CardContent>
              </Card>
              <Card glow>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Estimated Duration (medium)</p>
                  <p className="text-2xl font-bold text-accent">{months ?? "—"} mo</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Estimated Duration (high)</p>
                  <p className="text-2xl font-bold">{timeline?.estimated_months_high ?? "—"} mo</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Construction Sequence
                  <Badge variant="warning">Preliminary</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {sequence.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full border",
                            i === 0 ? "bg-primary/20 border-primary text-accent" : "border-border",
                          )}
                        >
                          {i < sequence.length - 1 ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </div>
                        {i < sequence.length - 1 && (
                          <div className="w-px flex-1 bg-border min-h-[24px]" />
                        )}
                      </div>
                      <div className="pb-6 pt-1">
                        <p className="text-sm font-medium">Phase {i + 1}</p>
                        <p className="text-sm text-muted-foreground">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {design.required_permissions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Required Permissions & Surveys</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {design.required_permissions.map((p, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-accent">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <MobileBottomNav projectId={projectId} />

      <BottomSummaryBar stats={summaryStats} />
    </div>
  );
}
