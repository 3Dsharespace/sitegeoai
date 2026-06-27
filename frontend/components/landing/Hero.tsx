"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import { appEntryPath } from "@/lib/auth-routes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import HeroMockup from "./HeroMockup";
import { useDemoProjectId } from "@/lib/useDemoProjectId";

export default function Hero() {
  const demoId = useDemoProjectId();

  return (
    <section id="product" className="relative pt-28 pb-16 sm:pt-32 sm:pb-24 lg:pb-28 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(ellipse 40% 30% at 80% 20%, rgba(99,102,241,0.12), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(56,189,248,0.25)] bg-[rgba(56,189,248,0.06)] px-3.5 py-1.5 text-[11px] font-medium text-[#38BDF8]"
            >
              Civil engineering · GIS · AI 3D modeling
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="text-[1.75rem] sm:text-4xl lg:text-[2.65rem] font-bold leading-[1.12] tracking-tight text-[#F8FAFC]"
            >
              AI-Powered 3D Infrastructure Planning From Real-World Maps
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-[#94A3B8]"
            >
              Select any location, analyze terrain, map roads, plan structures, estimate materials,
              and generate accurate 3D layouts for construction and civil engineering projects.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link href={appEntryPath("/projects/new")} className={cn(buttonVariants({ variant: "marketing", size: "lg" }), "gap-2")}>
                Start Mapping
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={appEntryPath(`/projects/${demoId}/workspace`)}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2 border-white/12 bg-white/[0.04]")}
              >
                <Play className="h-4 w-4 text-[var(--marketing-primary)]" />
                View Demo
              </Link>
            </motion.div>
          </div>

          <HeroMockup />
        </div>
      </div>
    </section>
  );
}
