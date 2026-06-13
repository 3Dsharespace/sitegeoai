"use client";

import { useProjectStore } from "@/stores/projectStore";

const TOGGLES: { key: keyof ReturnType<typeof useProjectStore.getState>["surveyLayers"]; label: string; hint?: string }[] = [
  { key: "visualBasemap", label: "Visual satellite", hint: "Reference only — not for quantity takeoff" },
  { key: "surveyOrtho", label: "Survey ortho" },
  { key: "surveyDem", label: "DEM terrain mesh" },
  { key: "surveyVectors", label: "Engineering vectors" },
  { key: "surveyAlpha", label: "Alpha preview" },
  { key: "surveyGcp", label: "GCP points" },
];

export default function SurveyLayerToggles() {
  const surveyLayers = useProjectStore((s) => s.surveyLayers);
  const toggleSurveyLayer = useProjectStore((s) => s.toggleSurveyLayer);

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Layer visibility</p>
      {TOGGLES.map(({ key, label, hint }) => (
        <label key={key} className="flex items-start gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={surveyLayers[key]}
            onChange={() => toggleSurveyLayer(key)}
            className="mt-0.5"
          />
          <span>
            {label}
            {hint && <span className="block text-[10px] text-muted-foreground">{hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
