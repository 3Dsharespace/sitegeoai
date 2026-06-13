"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectType } from "@/lib/types";
import { selectClassName } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FieldDef {
  name: string;
  label: string;
  shortLabel?: string;
  unit?: string;
  step?: number;
  options?: string[];
}

const num = (min: number, max: number) => z.coerce.number().min(min).max(max);

const SCHEMAS: Record<ProjectType, z.ZodObject<z.ZodRawShape>> = {
  flyover: z.object({
    length_m: num(50, 10000),
    deck_width_m: num(6, 60),
    lanes: num(1, 12),
    clearance_m: num(4, 12),
    pier_spacing_m: num(15, 60),
    foundation_depth_m_assumed: num(3, 40),
    concrete_grade: z.string(),
    asphalt_thickness_mm: num(40, 150),
  }),
  building: z.object({
    builtup_area_sqm: num(50, 100000),
    floors: num(1, 60),
    floor_height_m: num(2.5, 6),
    slab_thickness_m: num(0.1, 0.4),
    column_grid_m: num(3, 12),
    concrete_grade: z.string(),
  }),
  pipeline: z.object({
    length_m: num(10, 50000),
    pipe_diameter_mm: num(100, 3000),
    trench_width_m: num(0.6, 5),
    trench_depth_m: num(0.8, 10),
    utility_type: z.string(),
  }),
  road: z.object({
    length_m: num(50, 100000),
    road_width_m: num(3, 40),
    lanes: num(1, 10),
    asphalt_thickness_mm: num(40, 150),
    base_thickness_mm: num(100, 500),
    shoulder_width_m: num(0, 5),
  }),
};

const FIELDS: Record<ProjectType, FieldDef[]> = {
  flyover: [
    { name: "length_m", label: "Length", unit: "m" },
    { name: "deck_width_m", label: "Deck width", shortLabel: "Deck w", unit: "m" },
    { name: "lanes", label: "Lanes" },
    { name: "clearance_m", label: "Vertical clearance", shortLabel: "Clearance", unit: "m", step: 0.1 },
    { name: "pier_spacing_m", label: "Pier spacing", shortLabel: "Pier space", unit: "m" },
    {
      name: "foundation_depth_m_assumed",
      label: "Foundation depth (assumed)",
      shortLabel: "Fdn depth",
      unit: "m",
    },
    { name: "concrete_grade", label: "Concrete grade", shortLabel: "Concrete" },
    { name: "asphalt_thickness_mm", label: "Asphalt thickness", shortLabel: "Asphalt", unit: "mm" },
  ],
  building: [
    { name: "builtup_area_sqm", label: "Built-up area / floor", shortLabel: "Area/floor", unit: "m²" },
    { name: "floors", label: "Floors" },
    { name: "floor_height_m", label: "Floor height", shortLabel: "Flr height", unit: "m", step: 0.1 },
    { name: "slab_thickness_m", label: "Slab thickness", shortLabel: "Slab", unit: "m", step: 0.01 },
    { name: "column_grid_m", label: "Column grid", shortLabel: "Col grid", unit: "m", step: 0.5 },
    { name: "concrete_grade", label: "Concrete grade", shortLabel: "Concrete" },
  ],
  pipeline: [
    { name: "length_m", label: "Alignment length", shortLabel: "Length", unit: "m" },
    { name: "pipe_diameter_mm", label: "Pipe diameter", shortLabel: "Pipe Ø", unit: "mm" },
    { name: "trench_width_m", label: "Trench width", shortLabel: "Trench w", unit: "m", step: 0.1 },
    { name: "trench_depth_m", label: "Trench depth", shortLabel: "Trench d", unit: "m", step: 0.1 },
    { name: "utility_type", label: "Utility type", shortLabel: "Utility" },
  ],
  road: [
    { name: "length_m", label: "Length", unit: "m" },
    { name: "road_width_m", label: "Carriageway width", shortLabel: "Width", unit: "m", step: 0.5 },
    { name: "lanes", label: "Lanes" },
    { name: "asphalt_thickness_mm", label: "Asphalt thickness", shortLabel: "Asphalt", unit: "mm" },
    { name: "base_thickness_mm", label: "Base thickness", shortLabel: "Base", unit: "mm" },
    { name: "shoulder_width_m", label: "Shoulder width", shortLabel: "Shoulder", unit: "m", step: 0.5 },
  ],
};

export const DEFAULTS: Record<ProjectType, Record<string, number | string>> = {
  flyover: {
    length_m: 500, deck_width_m: 16, lanes: 4, clearance_m: 5.5, pier_spacing_m: 30,
    foundation_depth_m_assumed: 8, concrete_grade: "M35", asphalt_thickness_mm: 80,
  },
  building: {
    builtup_area_sqm: 400, floors: 4, floor_height_m: 3.2, slab_thickness_m: 0.15,
    column_grid_m: 5, concrete_grade: "M25",
  },
  pipeline: {
    length_m: 300, pipe_diameter_mm: 600, trench_width_m: 1.2, trench_depth_m: 2,
    utility_type: "drainage",
  },
  road: {
    length_m: 1000, road_width_m: 7.5, lanes: 2, asphalt_thickness_mm: 80,
    base_thickness_mm: 250, shoulder_width_m: 1.5,
  },
};

interface ParameterFormProps {
  projectType: ProjectType;
  initialValues?: Record<string, unknown> | null;
  onGenerate: (params: Record<string, unknown>) => void;
  generating: boolean;
  /** Narrow sidebar: 2-column grid + pinned generate button. */
  compact?: boolean;
}

const fieldInputClass = cn(
  "h-7 px-2 text-[11px] bg-background",
);
const fieldSelectClass = cn(
  selectClassName,
  "mt-0.5 h-7 px-2 py-1 text-[11px]",
);

export default function ParameterForm({
  projectType,
  initialValues,
  onGenerate,
  generating,
  compact,
}: ParameterFormProps) {
  const fields = FIELDS[projectType];
  const form = useForm({
    resolver: zodResolver(SCHEMAS[projectType]),
    defaultValues: { ...DEFAULTS[projectType], ...(initialValues ?? {}) },
  });

  useEffect(() => {
    if (initialValues) form.reset({ ...DEFAULTS[projectType], ...initialValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  const renderField = (f: FieldDef) => {
    const error = form.formState.errors[f.name];
    const displayLabel = compact ? (f.shortLabel ?? f.label) : f.label;

    return (
      <label key={f.name} className="block min-w-0" title={f.label}>
        <span
          className={cn(
            "block truncate font-medium text-muted-foreground",
            compact ? "text-[10px] leading-tight" : "text-xs text-muted-foreground",
          )}
        >
          {displayLabel}
          {f.unit && !compact && <span className="text-muted-foreground/70"> ({f.unit})</span>}
          {f.unit && compact && <span className="text-muted-foreground/70"> ({f.unit})</span>}
        </span>
        {f.options ? (
          <select {...form.register(f.name)} className={fieldSelectClass}>
            {f.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type="number"
            step={f.step ?? 1}
            {...form.register(f.name)}
            className={cn(fieldInputClass, compact ? "mt-0.5" : "mt-0.5")}
          />
        )}
        {error && (
          <span className="text-[10px] text-destructive leading-tight">{String(error.message)}</span>
        )}
      </label>
    );
  };

  return (
    <form
      onSubmit={form.handleSubmit((values) => onGenerate(values))}
      className={cn(compact ? "flex flex-col gap-2" : "space-y-3")}
    >
      <div
        className={cn(
          compact
            ? "grid grid-cols-2 gap-x-2 gap-y-2 content-start"
            : "space-y-3",
        )}
      >
        {fields.map(renderField)}
      </div>
      <Button
        type="submit"
        disabled={generating}
        size="sm"
        className={cn(
          "w-full shrink-0",
          compact ? "h-8 text-[11px]" : "mt-auto h-9",
        )}
      >
        {generating ? "Generating…" : compact ? "Generate Design" : "Generate Preliminary Design"}
      </Button>
    </form>
  );
}
