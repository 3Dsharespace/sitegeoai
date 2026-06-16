"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Droplets,
  MapPin,
  Route,
  Ruler,
  Sparkles,
  Sun,
} from "lucide-react";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import NewProjectBoundaryPanel from "@/components/projects/NewProjectBoundaryPanel";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import MapStyleToggle from "@/components/ui/map-style-toggle";
import WizardStepper from "@/components/ui/wizard-stepper";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { MapBasemap } from "@/lib/map-imagery";
import {
  PROJECT_TYPE_CATEGORIES,
  PROJECT_TYPE_OPTIONS,
  UNIT_OPTIONS,
  projectTypeLabel,
  unitLabel,
} from "@/lib/project-catalog";
import { toastPromise } from "@/lib/toast";
import type { GeocodeResult, GeoJSONGeometry, Project, ProjectType } from "@/lib/types";
import { ringCentroid } from "@/lib/geo";
import { cn } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

const STEPS = ["Details", "Location", "Boundary", "Review"] as const;

const CATEGORY_ICONS = {
  transport: Route,
  structures: Building2,
  utilities: Droplets,
  civil: Sun,
} as const;

const RECOMMENDED_UNITS = new Set(["metric", "indian"]);

function StepActions({
  step,
  saving,
  error,
  onBack,
  onNext,
  onCreate,
}: {
  step: number;
  saving: boolean;
  error: string;
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-[rgba(148,163,184,0.12)] bg-[rgba(13,17,23,0.95)] backdrop-blur-xl px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        {error && <p className="flex-1 text-sm text-destructive min-w-0 truncate">{error}</p>}
        {!error && <div className="flex-1" />}
        {step > 0 && (
          <Button variant="secondary" onClick={onBack} className="gap-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={onNext} className="gap-2 shrink-0 min-w-[140px] bg-gradient-to-r from-[#3B82F6] to-[#6366F1] border-0 hover:brightness-110">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onCreate} disabled={saving} className="gap-2 shrink-0 min-w-[160px] bg-gradient-to-r from-[#3B82F6] to-[#6366F1] border-0 hover:brightness-110">
            {saving ? "Creating…" : "Create Project"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function DetailsStep({
  name,
  setName,
  projectType,
  setProjectType,
  units,
  setUnits,
}: {
  name: string;
  setName: (v: string) => void;
  projectType: ProjectType;
  setProjectType: (v: ProjectType) => void;
  units: string;
  setUnits: (v: string) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 space-y-8">
      <DisclaimerBanner compact />

      <GlassCard className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[#F8FAFC]">Create infrastructure project</h2>
        <p className="mt-1.5 text-sm text-[#94A3B8] leading-relaxed">
          Define the project type, units, and base design parameters before selecting the site location.
        </p>
      </GlassCard>

      <div className="space-y-2">
        <label className="block">
          <span className="text-sm font-medium text-[#F8FAFC]">Project name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. NH-48 Junction Flyover"
            className="mt-1.5 h-11 text-base bg-[rgba(15,23,42,0.6)] border-[rgba(148,163,184,0.18)]"
          />
        </label>
      </div>

      <div className="space-y-6">
        {PROJECT_TYPE_CATEGORIES.map((cat) => {
          const options = PROJECT_TYPE_OPTIONS.filter((t) => t.category === cat.id);
          const CatIcon = CATEGORY_ICONS[cat.id];
          if (options.length === 0) return null;
          return (
            <section key={cat.id}>
              <div className="flex items-center gap-2 mb-3">
                <CatIcon className="h-4 w-4 text-[#22D3EE]" strokeWidth={1.75} />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  {cat.label}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {options.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setProjectType(t.id)}
                    className={cn(
                      "rounded-xl border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5",
                      projectType === t.id
                        ? "border-[#3B82F6] bg-[rgba(59,130,246,0.12)] ring-1 ring-[rgba(59,130,246,0.35)] shadow-[0_0_24px_-8px_rgba(59,130,246,0.5)]"
                        : "border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.5)] hover:border-[rgba(56,189,248,0.25)]",
                    )}
                  >
                    <div className="text-sm font-medium leading-tight text-[#F8FAFC]">{t.label}</div>
                    <div className="text-[11px] text-[#94A3B8] mt-1 leading-snug">{t.desc}</div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Ruler className="h-3.5 w-3.5 text-[#22D3EE]" />
          <h2 className="text-sm font-semibold text-[#F8FAFC]">Units</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {UNIT_OPTIONS.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setUnits(u.id)}
              className={cn(
                "relative rounded-xl border px-3.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5",
                units === u.id
                  ? "border-[#3B82F6] bg-[rgba(59,130,246,0.12)] ring-1 ring-[rgba(59,130,246,0.3)]"
                  : "border-[rgba(148,163,184,0.18)] bg-[rgba(15,23,42,0.5)] hover:border-[rgba(56,189,248,0.25)]",
              )}
            >
              {RECOMMENDED_UNITS.has(u.id) && (
                <Badge variant="accent" className="absolute top-2 right-2 text-[9px] px-1.5 py-0">
                  Recommended
                </Badge>
              )}
              <span className="text-sm font-medium text-[#F8FAFC]">{u.label}</span>
              <p className="text-[11px] text-[#64748B] mt-1 font-mono">{u.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LocationStep({
  query,
  setQuery,
  results,
  search,
  pickResult,
  lat,
  setLat,
  lng,
  setLng,
  locationName,
  locationSource,
  mapBasemap,
  setMapBasemap,
  onUseMapCenter,
}: {
  query: string;
  setQuery: (v: string) => void;
  results: GeocodeResult[];
  search: () => void;
  pickResult: (r: GeocodeResult) => void;
  lat: string;
  setLat: (v: string) => void;
  lng: string;
  setLng: (v: string) => void;
  locationName: string;
  locationSource: "search" | "map" | "manual";
  mapBasemap: MapBasemap;
  setMapBasemap: (v: MapBasemap) => void;
  onUseMapCenter: () => void;
}) {
  const statusLabel =
    locationSource === "search"
      ? "Search result selected"
      : locationSource === "map"
        ? "Map center selected"
        : "Manual coordinates";

  return (
    <>
      <GlassCard className="pointer-events-auto absolute left-3 top-3 z-20 w-[min(100%,400px)] p-4 space-y-4 sm:left-4 sm:top-4">
        <div>
          <span className="text-sm font-semibold flex items-center gap-1.5 text-[#F8FAFC]">
            <MapPin className="h-4 w-4 text-[#22D3EE]" />
            Site location
          </span>
          <p className="text-xs text-[#94A3B8] mt-1">
            Search, click the map, or enter coordinates manually.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search address or place"
            className="flex-1 h-10 bg-[rgba(5,7,10,0.5)] border-[rgba(148,163,184,0.18)]"
          />
          <Button onClick={search} variant="secondary" className="h-10">
            Search
          </Button>
        </div>
        {results.length > 0 && (
          <ul className="border border-[rgba(148,163,184,0.15)] rounded-lg divide-y divide-[rgba(148,163,184,0.1)] max-h-44 overflow-y-auto">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="w-full text-left px-3 py-2.5 text-xs hover:bg-[rgba(59,130,246,0.08)] text-[#CBD5E1]"
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="outline" size="sm" className="w-full h-9 text-xs" onClick={onUseMapCenter}>
          Use current map center
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] font-medium text-[#64748B] uppercase tracking-wide">Latitude</span>
            <Input value={lat} onChange={(e) => setLat(e.target.value)} className="mt-1 font-mono text-xs h-9 bg-[rgba(5,7,10,0.5)]" />
          </label>
          <label className="block">
            <span className="text-[10px] font-medium text-[#64748B] uppercase tracking-wide">Longitude</span>
            <Input value={lng} onChange={(e) => setLng(e.target.value)} className="mt-1 font-mono text-xs h-9 bg-[rgba(5,7,10,0.5)]" />
          </label>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="accent" className="text-[10px] font-normal truncate max-w-[60%]">
            {statusLabel}
          </Badge>
          <MapStyleToggle value={mapBasemap} onChange={setMapBasemap} compact />
        </div>
        {locationName && (
          <p className="text-xs text-[#94A3B8] truncate" title={locationName}>
            {locationName}
          </p>
        )}
      </GlassCard>

      <GlassCard className="pointer-events-none absolute bottom-20 left-3 z-20 max-w-xs p-3 text-[10px] space-y-1 sm:left-4">
        <p className="text-[#64748B]">
          Accuracy: <span className="text-[#F59E0B]">Visual planning</span> / GIS estimate
        </p>
        <p className="font-mono text-[#94A3B8]">
          {parseFloat(lat).toFixed(6)}°, {parseFloat(lng).toFixed(6)}°
        </p>
        <p className="text-[#64748B]">Map: {mapBasemap}</p>
      </GlassCard>
    </>
  );
}

function BoundaryStep({
  projectType,
  lng,
  lat,
  boundary,
  alignment,
  onBoundary,
  onClearBoundary,
  onClearAlignment,
  setAlignment,
}: {
  projectType: ProjectType;
  lng: string;
  lat: string;
  boundary: GeoJSONGeometry | null;
  alignment: GeoJSONGeometry | null;
  onBoundary: (g: GeoJSONGeometry) => void;
  onClearBoundary: () => void;
  onClearAlignment: () => void;
  setAlignment: (g: GeoJSONGeometry | null) => void;
}) {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <NewProjectBoundaryPanel
        projectType={projectType}
        centerLng={parseFloat(lng) || 77.5946}
        centerLat={parseFloat(lat) || 12.9716}
        boundary={boundary}
        alignment={alignment}
        onApplyBoundary={onBoundary}
        onApplyAlignment={setAlignment}
        onClearBoundary={onClearBoundary}
        onClearAlignment={onClearAlignment}
      />
    </div>
  );
}

function ReviewStep({
  name,
  projectType,
  units,
  locationName,
  lat,
  lng,
  boundary,
  alignment,
  mapBasemap,
  onEditStep,
}: {
  name: string;
  projectType: ProjectType;
  units: string;
  locationName: string;
  lat: string;
  lng: string;
  boundary: GeoJSONGeometry | null;
  alignment: GeoJSONGeometry | null;
  mapBasemap: MapBasemap;
  onEditStep: (step: number) => void;
}) {
  const checklist = [
    { label: "Project details completed", done: !!name.trim() },
    { label: "Location selected", done: !!(locationName || lat) },
    { label: boundary ? "Boundary drawn" : "Boundary skipped (optional)", done: true },
    { label: "Ready for AI Design Studio", done: !!name.trim() && !!(locationName || lat) },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)]">
                <Sparkles className="h-5 w-5 text-[#3B82F6]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#F8FAFC]">Project summary</h2>
                <p className="text-sm text-[#94A3B8] mt-1">Review before opening AI Design Studio.</p>
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                { label: "Name", value: name },
                { label: "Type", value: projectTypeLabel(projectType) },
                { label: "Units", value: unitLabel(units) },
                { label: "Location", value: locationName || `${lat}, ${lng}` },
                { label: "Boundary", value: boundary ? "Drawn on map" : "Not set" },
                { label: "Alignment", value: alignment ? "Drawn on map" : "Not set" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-[10px] font-medium text-[#64748B] uppercase tracking-wide">{label}</dt>
                  <dd className="mt-1 font-medium text-[#F8FAFC]">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={() => onEditStep(0)}>
                Edit details
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={() => onEditStep(1)}>
                Edit location
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={() => onEditStep(2)}>
                Edit boundary
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Readiness</p>
            <ul className="space-y-2">
              {checklist.map(({ label, done }) => (
                <li key={label} className="flex items-center gap-2 text-sm text-[#CBD5E1]">
                  <CheckCircle2 className={cn("h-4 w-4 shrink-0", done ? "text-[#10B981]" : "text-[#64748B]")} />
                  {label}
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="text-sm font-medium text-[#F8FAFC]">What happens next?</p>
            <p className="mt-2 text-xs leading-relaxed text-[#94A3B8]">
              GeoAI will open the project in AI Design Studio where you can generate preliminary 3D layouts,
              BOQ estimates, terrain analysis, and engineering planning insights.
            </p>
          </GlassCard>
        </div>

        <GlassCard className="overflow-hidden p-0 min-h-[320px] lg:min-h-[420px]">
          <div className="border-b border-[rgba(148,163,184,0.12)] px-4 py-2 text-[11px] text-[#64748B]">
            Map preview · {mapBasemap}
          </div>
          <div className="relative h-[280px] lg:h-[380px] bg-[#05070A]">
            <MapView
              center={[parseFloat(lng) || 77.5946, parseFloat(lat) || 12.9716]}
              boundary={boundary}
              alignment={alignment}
              projectType={projectType}
              basemap={mapBasemap}
              hideFloatingTools
              showCenterMarker
            />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

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
  const [mapBasemap, setMapBasemap] = useState<MapBasemap>("satellite");
  const [locationSource, setLocationSource] = useState<"search" | "map" | "manual">("manual");

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
    setLocationSource("search");
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
    setError("");
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

  const mapCenter: [number, number] = [parseFloat(lng) || 77.5946, parseFloat(lat) || 12.9716];
  const showMap = step === 1 || step === 2;

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[#05070A]">
      <div className="shrink-0 border-b border-[rgba(148,163,184,0.12)] bg-[rgba(13,17,23,0.92)] backdrop-blur-xl px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold sm:text-xl text-[#F8FAFC]">New Project</h1>
            <p className="text-[11px] text-[#64748B] mt-0.5">GeoAI Infrastructure Studio</p>
          </div>
          <WizardStepper steps={STEPS} current={step} onStepClick={(i) => setStep(i)} />
        </div>
      </div>

      <div className="relative flex flex-1 min-h-0 bg-[#05070A]">
        {showMap && (
          <div className="absolute inset-0 z-0">
            <MapView
              center={mapCenter}
              boundary={boundary}
              alignment={alignment}
              projectType={projectType}
              basemap={mapBasemap}
              showCenterMarker={step === 1}
              onBoundaryDrawn={onBoundary}
              onAlignmentDrawn={setAlignment}
              onSuggestionApplied={(kind, g) => {
                if (kind === "boundary") onBoundary(g);
                else setAlignment(g);
              }}
              onMapClick={(lngV, latV) => {
                setLng(lngV.toFixed(6));
                setLat(latV.toFixed(6));
                setLocationSource("map");
              }}
              hideFloatingTools={step === 1 || step === 2}
            />
          </div>
        )}

        {step === 0 && (
          <div className="relative z-10 flex-1 overflow-y-auto">
            <DetailsStep
              name={name}
              setName={setName}
              projectType={projectType}
              setProjectType={setProjectType}
              units={units}
              setUnits={setUnits}
            />
          </div>
        )}
        {step === 1 && (
          <LocationStep
            query={query}
            setQuery={setQuery}
            results={results}
            search={search}
            pickResult={pickResult}
            lat={lat}
            setLat={(v) => {
              setLat(v);
              setLocationSource("manual");
            }}
            lng={lng}
            setLng={(v) => {
              setLng(v);
              setLocationSource("manual");
            }}
            locationName={locationName}
            locationSource={locationSource}
            mapBasemap={mapBasemap}
            setMapBasemap={setMapBasemap}
            onUseMapCenter={() => setLocationSource("map")}
          />
        )}
        {step === 2 && (
          <BoundaryStep
            projectType={projectType}
            lng={lng}
            lat={lat}
            boundary={boundary}
            alignment={alignment}
            onBoundary={onBoundary}
            onClearBoundary={() => setBoundary(null)}
            onClearAlignment={() => setAlignment(null)}
            setAlignment={setAlignment}
          />
        )}
        {step === 3 && (
          <div className="relative z-10 flex-1 overflow-y-auto">
            <ReviewStep
              name={name}
              projectType={projectType}
              units={units}
              locationName={locationName}
              lat={lat}
              lng={lng}
              boundary={boundary}
              alignment={alignment}
              mapBasemap={mapBasemap}
              onEditStep={setStep}
            />
          </div>
        )}
      </div>

      <StepActions
        step={step}
        saving={saving}
        error={error}
        onBack={() => {
          setError("");
          setStep((s) => s - 1);
        }}
        onNext={next}
        onCreate={create}
      />
    </div>
  );
}
