"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Box } from "lucide-react";
import { motion } from "framer-motion";
import { appEntryPath } from "@/lib/auth-routes";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./landing-theme";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/[0.08] bg-[#05070A]/75 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(56,189,248,0.25)] bg-[rgba(56,189,248,0.08)]">
            <Box className="h-4 w-4 text-[#38BDF8]" strokeWidth={2} />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-[#F8FAFC]">GeoAI 3D</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#94A3B8] transition-colors hover:text-[#F8FAFC] hover:bg-white/[0.04]"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href={appEntryPath("/dashboard")}
            className="hidden sm:inline-flex rounded-lg px-3 py-2 text-[13px] font-medium text-[#94A3B8] transition-colors hover:text-[#F8FAFC]"
          >
            Sign In
          </Link>
          <Link
            href={appEntryPath("/dashboard")}
            className={cn(
              "inline-flex items-center justify-center rounded-xl px-4 py-2 text-[13px] font-semibold",
              "bg-gradient-to-r from-[#38BDF8] to-[#6366F1] text-[#05070A]",
              "shadow-[0_0_24px_-4px_rgba(56,189,248,0.5)] transition-all duration-300",
              "hover:brightness-110 hover:shadow-[0_0_32px_-4px_rgba(56,189,248,0.65)]",
            )}
          >
            Launch Platform
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
