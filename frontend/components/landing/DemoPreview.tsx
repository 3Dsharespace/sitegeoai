"use client";

import { motion } from "framer-motion";
import { Box, Layers, Sparkles } from "lucide-react";

const BOQ_ROWS = [
  { item: "Concrete M35", qty: "3,820", unit: "m³" },
  { item: "Steel Fe500", qty: "412", unit: "MT" },
  { item: "Asphalt AC", qty: "1,240", unit: "m³" },
  { item: "Excavation", qty: "8,200", unit: "m³" },
];

export default function DemoPreview() {
  return (
    <section className="relative py-20 sm:py-28 border-t border-white/[0.06] bg-[#070A0F]/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#38BDF8] mb-3">
            Live workspace preview
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            One dashboard for map, AI, 3D, and quantities
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="overflow-hidden rounded-2xl border border-[rgba(56,189,248,0.18)] bg-[#0D1117]/90 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5 bg-[#05070A]/90">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            </div>
            <span className="text-[10px] font-mono text-[#64748B] ml-2">GeoAI 3D · AI Design Studio</span>
          </div>

          <div className="grid lg:grid-cols-12 min-h-[420px]">
            {/* Layer controls */}
            <div className="hidden lg:flex lg:col-span-2 flex-col border-r border-white/[0.06] bg-[#070A0F]/80 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                Layers
              </p>
              {["Terrain", "Roads", "Flyover", "Buildings", "Excavation", "Utilities"].map((l, i) => (
                <div
                  key={l}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-[#94A3B8] hover:bg-white/[0.03]"
                >
                  <span
                    className={`h-2 w-2 rounded-sm ${i < 4 ? "bg-[#38BDF8]" : "bg-[#334155]"}`}
                  />
                  {l}
                </div>
              ))}
            </div>

            {/* Map viewport */}
            <div className="lg:col-span-5 relative min-h-[220px] border-b lg:border-b-0 lg:border-r border-white/[0.06]">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 30% 40%, rgba(56,189,248,0.12), transparent 50%),
                    linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px)
                  `,
                  backgroundSize: "auto, 24px 24px, 24px 24px",
                }}
              />
              <svg className="absolute inset-0 w-full h-full opacity-80" preserveAspectRatio="none">
                <path
                  d="M 0 180 Q 150 140 300 160 T 600 100"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  className="drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]"
                />
              </svg>
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center gap-2 rounded-[1.25rem] border border-white/[0.1] bg-[#05070A]/85 backdrop-blur-md px-3 py-2.5">
                  <Sparkles className="h-4 w-4 text-[#38BDF8] shrink-0" />
                  <span className="text-[11px] text-[#94A3B8]">
                    Generate road layout and estimate materials for this site
                  </span>
                  <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#38BDF8] text-[#05070A] text-xs font-bold">
                    ↑
                  </span>
                </div>
              </div>
            </div>

            {/* 3D preview */}
            <div className="lg:col-span-2 flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-[#070A0F]/80 p-3 min-h-[160px]">
              <div className="flex items-center gap-1.5 mb-2">
                <Box className="h-3.5 w-3.5 text-[#6366F1]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  3D Model
                </span>
              </div>
              <div className="flex-1 rounded-lg border border-white/[0.06] bg-gradient-to-b from-[rgba(99,102,241,0.1)] to-[#05070A] flex items-end justify-center gap-1 p-3 pb-4">
                {[28, 44, 36, 52, 40].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: h }}
                    className="w-4 rounded-t border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.15)]"
                  />
                ))}
              </div>
              <p className="mt-2 text-[9px] text-[#64748B] text-center">Concept GLB · mesh layers</p>
            </div>

            {/* BOQ table */}
            <div className="lg:col-span-3 p-3 bg-[#070A0F]/80">
              <div className="flex items-center gap-1.5 mb-3">
                <Layers className="h-3.5 w-3.5 text-[#10B981]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Quantities
                </span>
              </div>
              <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="text-left px-3 py-2 font-medium text-[#64748B]">Item</th>
                      <th className="text-right px-3 py-2 font-medium text-[#64748B]">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-[#64748B]">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BOQ_ROWS.map(({ item, qty, unit }) => (
                      <tr key={item} className="border-b border-white/[0.04] last:border-0">
                        <td className="px-3 py-2 text-[#CBD5E1]">{item}</td>
                        <td className="px-3 py-2 text-right font-mono text-[#F8FAFC]">{qty}</td>
                        <td className="px-3 py-2 text-right text-[#64748B]">{unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[9px] text-[#64748B]">Preliminary BOQ · engineer review required</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
