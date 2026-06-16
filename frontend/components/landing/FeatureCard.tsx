"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  index = 0,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  index?: number;
  className?: string;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative rounded-2xl border border-white/[0.08] bg-[#0D1117]/80 p-6",
        "backdrop-blur-xl transition-shadow duration-300",
        "hover:border-[rgba(56,189,248,0.25)] hover:shadow-[0_0_40px_-12px_rgba(56,189,248,0.35)]",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(56,189,248,0.2)]",
          "bg-gradient-to-br from-[rgba(56,189,248,0.12)] to-[rgba(99,102,241,0.08)]",
          "transition-colors group-hover:border-[rgba(56,189,248,0.4)]",
        )}
      >
        <Icon className="h-5 w-5 text-[#38BDF8]" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-[#F8FAFC]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{description}</p>
    </motion.article>
  );
}
