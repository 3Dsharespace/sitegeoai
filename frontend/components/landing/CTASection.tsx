"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function CTASection() {
  return (
    <section id="pricing" className="relative py-20 sm:py-28 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(99,102,241,0.15), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-white/[0.1] bg-[#0D1117]/80 p-10 sm:p-14 backdrop-blur-xl shadow-[0_24px_80px_-24px_rgba(56,189,248,0.2)]"
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Plan Smarter Before Construction Starts
          </h2>
          <p className="mt-4 text-[#94A3B8] leading-relaxed max-w-lg mx-auto">
            Turn real-world location data into 3D layouts, material estimates, and engineering-ready
            planning insights.
          </p>
          <Link
            href="/projects/new"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold bg-gradient-to-r from-[#38BDF8] to-[#6366F1] text-[#05070A] shadow-[0_0_32px_-4px_rgba(56,189,248,0.55)] transition-all hover:brightness-110 hover:scale-[1.02]"
          >
            Launch GeoAI 3D
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-6 text-xs text-[#64748B]">
            Free to start · 14 project types · Export PDF, Excel & GLB
          </p>
        </motion.div>
      </div>
    </section>
  );
}
