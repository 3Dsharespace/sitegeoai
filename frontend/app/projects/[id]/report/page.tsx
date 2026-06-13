"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Box,
  Calendar,
  FileJson,
  Ruler,
} from "lucide-react";
import BottomSummaryBar from "@/components/layout/BottomSummaryBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ProjectError, ProjectLoading } from "@/components/layout/ProjectHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ProjectValidationPanel from "@/components/project/ProjectValidationPanel";
import { useProjectData } from "@/hooks/useProjectData";
import { api, apiUrl } from "@/lib/api";
import type { DesignScenario } from "@/lib/types";

const EXPORTS = [
  { id: "pdf", label: "Download PDF Report", desc: "Full preliminary planning report with assumptions", icon: FileText, preview: "Executive summary, BOQ snapshot, risks" },
  { id: "csv", label: "Download Excel BOQ", desc: "Bill of quantities spreadsheet (CSV)", icon: FileSpreadsheet, preview: "Line items, rates, quantities" },
  { id: "dxf", label: "Download DXF", desc: "CAD exchange format for site layout", icon: Ruler, preview: "Boundary and alignment linework" },
  { id: "json", label: "Download Project Data", desc: "Complete structured JSON export", icon: FileJson, preview: "Parameters, geometry, estimates" },
  { id: "geojson", label: "Download GeoJSON", desc: "Boundary, alignment & site layers", icon: FileJson, preview: "GIS-compatible site data" },
];

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { project, design, summaryStats, loading, error, load, modelFile } = useProjectData(projectId);
  const [scenario, setScenario] = useState<DesignScenario | null>(null);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  useEffect(() => {
    api.get<DesignScenario[]>(`/api/projects/${projectId}/scenarios`).then((scenarios) => {
      const completed = scenarios.find((s) => s.status === "completed") ?? null;
      setScenario(completed);
      setAssumptions(completed?.assumptions_json ?? []);
    });
  }, [projectId]);

  const saveAssumptions = async () => {
    if (!scenario) return;
    await api.put(`/api/projects/${projectId}/scenarios/${scenario.id}/assumptions`, { assumptions });
    setEditing(false);
  };

  if (loading) return <ProjectLoading />;
  if (error || !project) return <ProjectError error={error || "Not found"} onRetry={load} />;

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-14 md:pb-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Badge variant="warning">Preliminary planning only — not for construction approval</Badge>
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight mb-1">Export Center</h2>
          <p className="text-sm text-muted-foreground">Download reports, BOQ, models, and project data</p>
        </div>

        <ProjectValidationPanel projectId={projectId} className="mb-2" defaultDetailsOpen={false} />

        <div className="grid md:grid-cols-2 gap-4">
          {EXPORTS.map(({ id, label, desc, icon: Icon, preview }, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
            >
              <Card float className="hover:border-primary/40 cursor-pointer h-full group transition-all duration-200">
                <a href={apiUrl(`/api/projects/${projectId}/exports/${id}`)} className="block">
                  <CardHeader className="flex-row items-start gap-3 space-y-0">
                    <div className="flex h-10 w-10 items-center justify-center bg-primary/10 group-hover:bg-primary/15 transition-colors duration-200 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {label}
                        <Download className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </CardTitle>
                      <CardDescription>{desc}</CardDescription>
                      <p className="text-[10px] text-muted-foreground mt-2 panel rounded px-2 py-1 inline-block">
                        Preview: {preview}
                      </p>
                    </div>
                  </CardHeader>
                </a>
                {id === "pdf" && (
                  <CardContent className="pt-0 px-5 pb-4">
                    <button
                      type="button"
                      onClick={() => setShowPdfPreview(true)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Preview in browser
                    </button>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          ))}

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <a
              aria-label="Download 3D Model"
              title="Download 3D Model"
              href={modelFile?.file_url ?? "#"}
              {...(!modelFile ? { "aria-disabled": true } : {})}
              className={!modelFile ? "pointer-events-none opacity-50" : ""}
            >
              <Card float className="hover:border-primary/40 cursor-pointer h-full group h-full">
                <CardHeader className="flex-row items-start gap-3 space-y-0">
                  <div className="flex h-10 w-10 items-center justify-center bg-accent/10">
                    <Box className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Download 3D Model</CardTitle>
                    <CardDescription>
                      {modelFile ? "Conceptual GLB for BIM review" : "Generate a design first"}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <a href={`/projects/${projectId}/timeline`}>
              <Card float className="hover:border-primary/40 cursor-pointer h-full group">
                <CardHeader className="flex-row items-start gap-3 space-y-0">
                  <div className="flex h-10 w-10 items-center justify-center bg-muted">
                    <Calendar className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Construction Timeline</CardTitle>
                    <CardDescription>View sequence and export from Timeline page</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </a>
          </motion.div>
        </div>

        {showPdfPreview && (
          <Card glow>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">PDF Report Preview</CardTitle>
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowPdfPreview(false)}>
                Close
              </button>
            </CardHeader>
            <CardContent>
              <iframe
                title="PDF preview"
                src={apiUrl(`/api/projects/${projectId}/exports/pdf`)}
                className="w-full h-[480px] rounded-md border border-border bg-card"
              />
            </CardContent>
          </Card>
        )}

        {design && (
          <Card glow>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>{design.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Assumptions</h3>
                  <button
                    type="button"
                    onClick={() => (editing ? saveAssumptions() : setEditing(true))}
                    className="text-xs text-primary hover:underline"
                  >
                    {editing ? "Save" : "Edit"}
                  </button>
                </div>
                {editing ? (
                  <div className="space-y-1.5">
                    {assumptions.map((a, i) => (
                      <Input
                        key={i}
                        aria-label={`Assumption ${i + 1}`}
                        value={a}
                        onChange={(e) =>
                          setAssumptions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                        }
                        className="h-8 text-xs"
                      />
                    ))}
                  </div>
                ) : (
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                    {assumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold mb-2">Risk Checklist</h3>
                <div className="space-y-1">
                  {design.risks.map((r, i) => (
                    <div
                      key={i}
                      className="text-[11px] px-2 py-1.5 rounded-md bg-warning/10 text-warning border border-warning/20"
                    >
                      {String(r)}
                    </div>
                  ))}
                </div>
              </section>
            </CardContent>
          </Card>
        )}

        {!design && (
          <Card className="border-dashed p-8 text-center text-muted-foreground">
            No completed design yet — generate one in AI Design Studio.
          </Card>
        )}
      </div>

      <MobileBottomNav projectId={projectId} />

      <BottomSummaryBar stats={summaryStats} />
    </div>
  );
}
