"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileOutput, MapPin, Scan, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEPS: { icon: LucideIcon; step: string; title: string; body: string }[] = [
  {
    icon: MapPin,
    step: "01",
    title: "Select location on map",
    body: "Search globally, drop a pin, and define boundaries or alignments on satellite imagery.",
  },
  {
    icon: Scan,
    step: "02",
    title: "Analyze terrain and surroundings",
    body: "Run site analysis for elevation, slope, roads, buildings, and planning constraints.",
  },
  {
    icon: Sparkles,
    step: "03",
    title: "Generate 3D layout",
    body: "AI-assisted design produces mesh layers, parameters, and a navigable 3D concept model.",
  },
  {
    icon: FileOutput,
    step: "04",
    title: "Export model, quantities, and report",
    body: "Download GLB, GeoJSON, CSV BOQ, and preliminary PDF reports for engineer review.",
  },
];

export default function Workflow() {
  return (
    <section id="workflow" className="relative py-20 sm:py-28 border-t border-white/[0.06] bg-[#070A0F]/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6366F1] mb-3">Workflow</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            From map pin to engineering insight in four steps
          </h2>
        </div>

        <div className="relative grid gap-6 lg:grid-cols-4">
          <div className="hidden lg:block absolute top-[2.75rem] left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-[rgba(56,189,248,0.35)] to-transparent" />

          {STEPS.map(({ icon: Icon, step, title, body }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="relative"
            >
              <div className="rounded-2xl border border-white/[0.08] bg-[#0D1117]/70 p-6 backdrop-blur-xl h-full transition-all duration-300 hover:border-[rgba(99,102,241,0.25)] hover:shadow-[0_16px_48px_-20px_rgba(99,102,241,0.3)]">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[11px] font-mono font-semibold text-[#6366F1]">{step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                    <Icon className="h-5 w-5 text-[#38BDF8]" strokeWidth={1.75} />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-[#F8FAFC]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{body}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute -right-3 top-11 h-5 w-5 text-[#38BDF8]/40 z-10" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
