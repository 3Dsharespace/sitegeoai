"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {  BarChart3,
  Box,
  Clock,
  FileText,
  GitCompareArrows,
  Globe,
  Menu,
  Mountain,
  Package,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";

const PRIMARY_TABS = (projectId: number) => [
  { href: `/projects/${projectId}/map`, label: "Map", icon: Globe },
  { href: `/projects/${projectId}/workspace`, label: "Studio", icon: Sparkles },
  { href: `/projects/${projectId}/model`, label: "3D", icon: Box },
  { href: `/projects/${projectId}/estimate`, label: "BOQ", icon: Package },
];

const MORE_TABS = (projectId: number) => [
  { href: `/projects/${projectId}/cost`, label: "Cost", icon: BarChart3 },
  { href: `/projects/${projectId}/timeline`, label: "Timeline", icon: Clock },
  { href: `/projects/${projectId}/analysis`, label: "Analysis", icon: Mountain },
  { href: `/projects/${projectId}/scenarios`, label: "Compare", icon: GitCompareArrows },
  { href: `/projects/${projectId}/report`, label: "Reports", icon: FileText },
];

export default function MobileBottomNav({ projectId }: { projectId: number }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const tabs = PRIMARY_TABS(projectId);
  const moreTabs = MORE_TABS(projectId);
  const moreActive = moreTabs.some((t) => pathname === t.href || pathname?.startsWith(t.href));

  useFocusTrap(morePanelRef, moreOpen, () => setMoreOpen(false));

  useEffect(() => {
    if (!moreOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMoreOpen(false)}
          aria-hidden
        />
      )}
      {moreOpen && (
        <div
          ref={morePanelRef}
          id="mobile-more-menu"
          role="menu"
          aria-label="More project pages"
          className="md:hidden fixed bottom-14 inset-x-2 z-40 rounded-xl border border-border bg-card p-2 shadow-lg grid grid-cols-3 gap-1"
        >
          {moreTabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg py-2 text-[10px]",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border panel-glass safe-area-pb">
        <div className="flex items-stretch justify-around h-14">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors duration-200",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            aria-controls="mobile-more-menu"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px]",
              moreActive || moreOpen ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Menu className="h-4 w-4" />
            More
          </button>
        </div>
      </nav>
    </>
  );
}
