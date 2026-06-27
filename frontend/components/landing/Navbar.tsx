"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { appEntryPath, loginPath } from "@/lib/auth-routes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BRAND_NAME, NAV_LINKS } from "./landing-theme";

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
          ? "border-b border-[var(--border-marketing)] bg-[var(--header-bg)] backdrop-blur-xl shadow-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(56,189,248,0.25)] bg-[rgba(56,189,248,0.08)]">
            <Building2 className="h-4 w-4 text-[var(--marketing-primary)]" strokeWidth={2} />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-foreground">{BRAND_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04]"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href={loginPath("/dashboard")} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}>
            Sign In
          </Link>
          <Link href={appEntryPath("/dashboard")} className={cn(buttonVariants({ variant: "marketing", size: "sm" }))}>
            Launch Platform
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
