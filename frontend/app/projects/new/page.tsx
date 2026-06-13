"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin } from "lucide-react";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import DrawingToolsPanel from "@/components/layout/DrawingToolsPanel";
import SiteSuggestionsPanel from "@/components/map/SiteSuggestionsPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toastPromise } from "@/lib/toast";
import type { GeocodeResult, GeoJSONGeometry, Project, ProjectType } from "@/lib/types";
import { ringCentroid } from "@/lib/geo";
import { cn } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

const STEPS = ["Details", "Location", "Boundary", "Review"] as const;

const PROJECT_TYPES: { id: ProjectType; label: string; desc: string }[] = [
  { id: "flyover", label: "Flyover / Overpass", desc: "Elevated road on piers" },
  { id: "building", label: "Building Massing", desc: "Multi-floor RCC concept" },
  { id: "pipeline", label: "Pipeline / Drainage", desc: "Trench + pipe alignment" },
  { id: "road", label: "Road Segment", desc: "At-grade pavement" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("flyover");
  const [units, setUnits] = useState("metric");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState("12.9716");
  const [lng, setLng] = useState("77.5946");
  const [boundary, setBoundary] = useState<GeoJSONGeometry | null>(null);
  const [alignment, setAlignment] = useState<GeoJSONGeometry | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (query.length < 2) return;
    try {
      const data = await api.get<{ results: GeocodeResult[] }>(
        `/api/geocode?q=${encodeURIComponent(query)}`,
      );
      setResults(data.results);
    } catch (e) {
      setError(String(e));
    }
  };

  const pickResult = (r: GeocodeResult) => {
    setLat(r.lat.toFixed(6));
    setLng(r.lng.toFixed(6));
    setLocationName(r.name);
    setResults([]);
  };

  const onBoundary = (g: GeoJSONGeometry) => {
    setBoundary(g);
    const ring = (g.coordinates as [number, number][][])[0];
    const [cx, cy] = ringCentroid(ring.slice(0, -1));
    setLng(cx.toFixed(6));
    setLat(cy.toFixed(6));
  };

  const next = () => {
    setError("");
    if (step === 0 && !name.trim()) {
      setError("Project name is required");
      return;
    }
    if (step === 1 && !locationName && !lat) {
      setError("Select or enter a location");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const create = async () => {
    setSaving(true);
    try {
      const project = await toastPromise(
        api.post<Project>("/api/projects", {
          name,
          project_type: projectType,
          units,
          location_name: locationName,
          center_lat: parseFloat(lat),
          center_lng: parseFloat(lng),
          boundary_geojson: boundary,
          alignment_geojson: alignment,
        }),
        { loading: "Creating project…", success: "Project created" },
      );
      router.push(`/projects/${project.id}/workspace`);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background-secondary px-6 py-4">
        <h1 className="text-xl font-bold mb-3">New Project</h1>
        <div className="flex items-center gap-2 overflow-x-auto">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 shrink-0">
              {i > 0 && <div className="w-6 h-px bg-border" />}
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
                  i === step && "bg-primary/10 text-primary border border-primary/20",
                  i < step && "text-success",
                  i > step && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] border",
                    i < step && "bg-success/20 border-success/40",
                    i === step && "border-primary/40",
                  )}
                >
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {label}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="lg:w-[420px] shrink-0 p-6 space-y-5 overflow-y-auto border-r border-border bg-background-secondary">
          <DisclaimerBanner compact />

          {step === 0 && (
            <>
              <label className="block">
                <span className="text-sm font-medium">Project name</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. NH-48 Junction Flyover"
                  className="mt-1"
                />
              </label>
              <div>
                <span className="text-sm font-medium">Project type</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PROJECT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setProjectType(t.id)}
                      className={cn(
                        "rounded-lg border p-2.5 text-left transition-all",
                        projectType === t.id
                          ? "border-primary/50 bg-primary/10 border-primary"
                          : "border-border hover:border-accent/30",
                      )}
                    >
                      <div className="text-sm font-medium">{t.label}</div>
                      <div className="text-[11px] text-muted-foreground">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-sm font-medium">Units</span>
                <Select
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  className="mt-1"
                >
                  <option value="metric">Metric (m, m³, kg)</option>
                  <option value="imperial">Imperial (ft, yd³, lb)</option>
                </Select>
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <span className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                  Location search
                </span>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    placeholder="Search address or place"
                    className="flex-1"
                  />
                  <Button onClick={search} variant="secondary">
                    Search
                  </Button>
                </div>
                {results.length > 0 && (
                  <ul className="mt-1 border border-border rounded-lg divide-y divide-border max-h-44 overflow-y-auto">
                    {results.map((r, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => pickResult(r)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60"
                        >
                          {r.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-sm font-medium">Latitude</span>
                  <Input value={lat} onChange={(e) => setLat(e.target.value)} className="mt-1 font-mono text-xs" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Longitude</span>
                  <Input value={lng} onChange={(e) => setLng(e.target.value)} className="mt-1 font-mono text-xs" />
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <DrawingToolsPanel compact />
              <SiteSuggestionsPanel
                compact
                projectType={projectType}
                centerLng={parseFloat(lng) || 77.5946}
                centerLat={parseFloat(lat) || 12.9716}
                onApplyBoundary={async (s) => onBoundary(s.geometry)}
                onApplyAlignment={async (s) => setAlignment(s.geometry)}
              />
              <Card className="p-3 text-xs text-muted-foreground space-y-1">
                <p>
                  Draw a <strong className="text-foreground">boundary</strong> or{" "}
                  <strong className="text-foreground">alignment</strong> on the map.
                </p>
                <p>
                  Boundary: {boundary ? "✓ drawn" : "optional"} · Alignment:{" "}
                  {alignment ? "✓ drawn" : "optional"}
                </p>
              </Card>
            </>
          )}

          {step === 3 && (
            <Card className="p-4 space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span> {name}
              </p>
              <p>
                <span className="text-muted-foreground">Type:</span> {projectType}
              </p>
              <p>
                <span className="text-muted-foreground">Location:</span> {locationName || `${lat}, ${lng}`}
              </p>
              <p>
                <span className="text-muted-foreground">Boundary:</span> {boundary ? "Yes" : "No"}
              </p>
              <p>
                <span className="text-muted-foreground">Alignment:</span> {alignment ? "Yes" : "No"}
              </p>
            </Card>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={next} className="flex-1 gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={create} disabled={saving} className="flex-1 gap-2">
                {saving ? "Creating…" : "Create Project"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {(step === 1 || step === 2) && (
          <div className="flex-1 min-h-[420px] relative">
            <MapView
              center={[parseFloat(lng) || 77.5946, parseFloat(lat) || 12.9716]}
              boundary={boundary}
              alignment={alignment}
              projectType={projectType}
              onBoundaryDrawn={onBoundary}
              onAlignmentDrawn={setAlignment}
              onSuggestionApplied={(kind, g) => {
                if (kind === "boundary") onBoundary(g);
                else setAlignment(g);
              }}
              onMapClick={(lngV, latV) => {
                setLng(lngV.toFixed(6));
                setLat(latV.toFixed(6));
              }}
            />
          </div>
        )}

        {(step === 0 || step === 3) && (
          <div className="flex-1 hidden lg:flex items-center justify-center p-12 bg-background">
            <div className="max-w-md text-center text-muted-foreground">
              {step === 0 && (
                <>
                  <p className="text-lg font-semibold text-foreground mb-2">Start with project details</p>
                  <p className="text-sm">Choose infrastructure type and units. You can refine parameters later in AI Design Studio.</p>
                </>
              )}
              {step === 3 && (
                <>
                  <p className="text-lg font-semibold text-foreground mb-2">Ready to create</p>
                  <p className="text-sm">Your project will open in AI Design Studio where you can run site analysis and generate designs.</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
