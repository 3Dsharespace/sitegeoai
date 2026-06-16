"use client";

import {
  Bot,
  Building2,
  Layers,
  MapPinned,
  Mountain,
  Shovel,
} from "lucide-react";
import FeatureCard from "./FeatureCard";

const FEATURES = [
  {
    icon: MapPinned,
    title: "Exact Location Mapping",
    description:
      "Pin any real-world coordinate, search addresses, and draw site boundaries with survey-grade GIS tools.",
  },
  {
    icon: Mountain,
    title: "3D Terrain & Elevation View",
    description:
      "Visualize topography, contour context, and elevation change before committing to a layout.",
  },
  {
    icon: Building2,
    title: "Road, Flyover & Building Layouts",
    description:
      "Generate alignments and 3D concept massing for transport, structures, and mixed infrastructure.",
  },
  {
    icon: Shovel,
    title: "Excavation and Cut/Fill Planning",
    description:
      "Plan earthworks zones with preliminary cut-fill volumes tied to terrain and corridor geometry.",
  },
  {
    icon: Layers,
    title: "Cement, Steel and Material Quantity Estimates",
    description:
      "BOQ outputs from deterministic calculators — concrete, reinforcement, asphalt, and labor bands.",
  },
  {
    icon: Bot,
    title: "AI-Assisted Engineering Report",
    description:
      "GeoAI Copilot drafts concept summaries, risks, sequences, and exportable PDF / Excel reports.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#38BDF8] mb-3">
            Platform capabilities
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Everything required for concept-stage civil planning
          </h2>
          <p className="mt-4 text-[#94A3B8] leading-relaxed">
            From satellite selection to material quantities — one workflow for infrastructure teams,
            authorities, and engineering consultants.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
