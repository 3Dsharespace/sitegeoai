"use client";

import { motion } from "framer-motion";
import { Box, Calculator, Map, Route } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const METRICS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Box,
    title: "3D Terrain",
    description: "Elevation meshes, slope analysis, and cut-fill visualization on real topography.",
  },
  {
    icon: Map,
    title: "Satellite Mapping",
    description: "High-resolution basemaps with precise geocoding and site boundary tools.",
  },
  {
    icon: Route,
    title: "Road & Layout Planning",
    description: "Alignments, corridors, flyovers, and structure massing on mapped coordinates.",
  },
  {
    icon: Calculator,
    title: "Material Estimation",
    description: "Deterministic cement, steel, aggregate, and BOQ from engineering calculators.",
  },
];

export default function TrustMetrics() {
  return (
    <section className="relative border-y border-white/[0.06] bg-[#070A0F]/80">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -3 }}
              className="group rounded-2xl border border-white/[0.08] bg-[#0D1117]/60 p-5 backdrop-blur-sm transition-all duration-300 hover:border-[rgba(56,189,248,0.22)] hover:shadow-[0_12px_40px_-16px_rgba(56,189,248,0.25)]"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] transition-colors group-hover:border-[rgba(56,189,248,0.3)] group-hover:bg-[rgba(56,189,248,0.06)]">
                <Icon className="h-5 w-5 text-[#38BDF8]" strokeWidth={1.75} />
              </div>
              <h3 className="text-sm font-semibold text-[#F8FAFC]">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
