"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Shield } from "lucide-react";

const POINTS = [
  "Uses high-resolution satellite and terrain context for site selection",
  "Supports precise road, corridor, and structure overlays on mapped coordinates",
  "Designed for civil engineering pre-planning — not final construction approval",
  "Calculates elevation, slope, area, distance, and preliminary material quantities",
];

export default function AccuracySection() {
  return (
    <section id="accuracy" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#10B981] mb-3">
              Engineering integrity
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
              Built for Mapping Accuracy
            </h2>
            <p className="mt-4 text-[#94A3B8] leading-relaxed">
              GeoAI 3D is built for teams who need trustworthy spatial context before detailed
              design — combining GIS precision with AI-assisted layout generation and deterministic
              quantity engines.
            </p>

            <ul className="mt-8 space-y-4">
              {POINTS.map((point, i) => (
                <motion.li
                  key={point}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-3 text-sm text-[#CBD5E1]"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#10B981]" strokeWidth={1.75} />
                  {point}
                </motion.li>
              ))}
            </ul>

            <div className="mt-8 flex gap-3 rounded-xl border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.05)] p-4">
              <Shield className="h-5 w-5 shrink-0 text-[#10B981]" />
              <p className="text-xs leading-relaxed text-[#94A3B8]">
                Final construction drawings must be verified by licensed engineers and survey data.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative rounded-2xl border border-white/[0.08] bg-[#0D1117]/80 p-6 backdrop-blur-xl"
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Elevation range", value: "842 – 861 m" },
                { label: "Site area", value: "4.2 ha" },
                { label: "Alignment length", value: "648 m" },
                { label: "Avg. slope", value: "4.2%" },
                { label: "Cut volume", value: "8,200 m³" },
                { label: "Fill volume", value: "4,180 m³" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/[0.06] bg-[#070A0F]/80 px-4 py-3"
                >
                  <p className="text-[10px] uppercase tracking-wide text-[#64748B]">{label}</p>
                  <p className="mt-1 text-sm font-semibold font-mono text-[#38BDF8]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 h-24 rounded-xl border border-[rgba(56,189,248,0.15)] bg-gradient-to-r from-[rgba(56,189,248,0.08)] to-[rgba(99,102,241,0.06)] flex items-end px-4 pb-3 gap-1">
              {[40, 55, 48, 72, 65, 80, 58, 90, 75, 68].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-[#38BDF8]/60 to-[#6366F1]/40"
                />
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] text-[#64748B] font-mono">
              Elevation profile · preliminary GIS analysis
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
