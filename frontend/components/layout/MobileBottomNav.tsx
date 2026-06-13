"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Box, Globe, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileBottomNav({ projectId }: { projectId: number }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/projects/${projectId}/map`, label: "Map", icon: Globe },
    { href: `/projects/${projectId}/workspace`, label: "AI Studio", icon: Sparkles },
    { href: `/projects/${projectId}/model`, label: "3D", icon: Box },
    { href: `/projects/${projectId}/estimate`, label: "BOQ", icon: Package },
    { href: `/projects/${projectId}/cost`, label: "Cost", icon: BarChart3 },
  ];

  return (
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
      </div>
    </nav>
  );
}
