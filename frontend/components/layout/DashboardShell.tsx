"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Building2, Download, Menu, Plus, Save, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRequireAuth } from "@/components/auth/RequireAuth";
import { BRAND_NAME } from "@/components/landing/landing-theme";
import ProjectStepper from "@/components/layout/ProjectStepper";
import UserMenu from "@/components/layout/UserMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import PageTransition from "@/components/motion/PageTransition";
import { ProjectHeaderContent } from "@/components/layout/ProjectHeader";
import { useDemoProjectId } from "@/lib/useDemoProjectId";
import { useAuthUser } from "@/lib/useAuthUser";
import {
  ENGINEERING_TOOLS,
  MAIN_NAV,
  PROJECT_NAV,
  projectPageSubtitle,
  SETTINGS_NAV,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { type MapTool, useProjectStore } from "@/stores/projectStore";

const NAV_WIDTH = 248;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all duration-200 border",
        active
          ? "bg-[rgba(59,130,246,0.18)] text-foreground border-primary"
          : "text-[#CBD5E1] border-transparent hover:bg-[var(--nav-hover)] hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="truncate">{label}</span>
      {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary/70" />}
    </Link>
  );
}

function EngineeringToolButton({
  id,
  label,
  icon: Icon,
  toolHint,
  onClick,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  toolHint?: "flyover" | "pipeline" | "building" | "terrain";
  onClick?: () => void;
}) {
  const { activeTool, toolHint: activeHint, activateTool } = useProjectStore();
  const active = activeTool === id && (!toolHint || activeHint === toolHint);

  return (
    <button
      type="button"
      onClick={() => {
        if (toolHint === "terrain") {
          onClick?.();
          return;
        }
        activateTool(id as MapTool, toolHint ?? null);
        onClick?.();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-all duration-200 border",
        active
          ? "bg-[rgba(59,130,246,0.18)] text-foreground border-primary"
          : "text-[#CBD5E1] border-transparent hover:bg-[var(--nav-hover)] hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate text-left">{label}</span>
    </button>
  );
}

function SidebarContent({
  pathname,
  projectId,
  inProject,
  onNavigate,
  isAdmin,
}: {
  pathname: string | null;
  projectId: number | null;
  inProject: boolean;
  onNavigate: () => void;
  isAdmin: boolean;
}) {
  const demoId = useDemoProjectId();

  return (
    <>
      <div className="flex h-14 items-center gap-2.5 border-b border-[rgba(148,163,184,0.14)] px-4 shrink-0 bg-sidebar">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary border border-primary/50">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <Link href="/" className="font-semibold text-sm text-foreground tracking-tight block leading-tight" onClick={onNavigate}>
            {BRAND_NAME}
          </Link>
          <p className="text-[10px] text-muted-foreground truncate">Infrastructure planning</p>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground p-1 hover:bg-[var(--surface-hover)]"
          onClick={onNavigate}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        <CollapsibleSection title="Navigation" defaultOpen>
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.label}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={
                pathname === item.href ||
                !!("matchPrefix" in item && item.matchPrefix && pathname?.startsWith(item.matchPrefix))
              }
              onClick={onNavigate}
            />
          ))}
        </CollapsibleSection>

        {projectId && (
          <CollapsibleSection title="Project Workflow" defaultOpen>
            {PROJECT_NAV(projectId).map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname === item.href}
                onClick={onNavigate}
              />
            ))}
          </CollapsibleSection>
        )}

        {inProject && (
          <CollapsibleSection title="Engineering Tools" defaultOpen={false}>
            {ENGINEERING_TOOLS.map((tool, i) => (
              <EngineeringToolButton
                key={`${tool.id}-${i}`}
                id={tool.id}
                label={tool.label}
                icon={tool.icon}
                toolHint={"toolHint" in tool ? tool.toolHint : undefined}
                onClick={
                  "toolHint" in tool && tool.toolHint === "terrain" && projectId
                    ? () => {
                        window.location.href = `/projects/${projectId}/analysis`;
                      }
                    : onNavigate
                }
              />
            ))}
          </CollapsibleSection>
        )}

        <CollapsibleSection title="System" defaultOpen={false}>
          {SETTINGS_NAV.filter((item) => {
            if (item.href.startsWith("/admin") && !isAdmin) return false;
            return true;
          }).map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={!!pathname?.startsWith(item.href)}
              onClick={onNavigate}
            />
          ))}
          <NavLink
            href={`/projects/${demoId}/workspace`}
            label="Demo Project"
            icon={Building2}
            active={false}
            onClick={onNavigate}
          />
        </CollapsibleSection>
      </nav>

      <div className="border-t border-border p-3 shrink-0">
        <Badge variant="warning" className="w-full justify-center py-1 text-[10px]">
          Preliminary planning only
        </Badge>
      </div>
    </>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isLogin = pathname === "/login";
  const { isAdmin } = useAuthUser();
  useRequireAuth();
  const workspaceFullscreen = useProjectStore((s) => s.workspaceFullscreen);
  const project = useProjectStore((s) => s.project);

  const projectMatch = pathname?.match(/\/projects\/(\d+)/);
  const projectId = projectMatch ? Number(projectMatch[1]) : null;
  const inProject = !!projectId;
  const isProjectWorkspace =
    !!pathname?.match(/\/projects\/\d+\/(workspace|map|model|analysis)/);

  const [navOpen, setNavOpen] = useState(() => !isProjectWorkspace);
  const [navPath, setNavPath] = useState(pathname);
  const navAsideRef = useRef<HTMLElement>(null);
  const navToggleRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(navAsideRef, navOpen, () => setNavOpen(false));

  if (pathname !== navPath) {
    setNavPath(pathname);
    setNavOpen(!isProjectWorkspace);
  }

  useEffect(() => {
    const onOpenNav = () => setNavOpen(true);
    window.addEventListener("geoai:open-nav", onOpenNav);
    return () => window.removeEventListener("geoai:open-nav", onOpenNav);
  }, []);

  useEffect(() => {
    if (!inProject) {
      useProjectStore.getState().setProject(null);
    }
  }, [inProject]);

  useEffect(() => {
    if (!navOpen) {
      navToggleRef.current?.focus();
      return;
    }
    const firstLink = navAsideRef.current?.querySelector<HTMLElement>("a[href]");
    firstLink?.focus();
  }, [navOpen]);

  if (isLanding || isLogin) {
    return (
      <main id="main-content" className="flex flex-1 flex-col min-h-screen bg-background">
        <PageTransition>{children}</PageTransition>
      </main>
    );
  }

  const closeNav = () => setNavOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Overlay drawer — hidden until hamburger opens it */}
      <AnimatePresence>
        {navOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 modal-overlay"
            onClick={closeNav}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <motion.aside
        ref={navAsideRef}
        initial={false}
        animate={{ x: navOpen ? 0 : -NAV_WIDTH }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[rgba(148,163,184,0.14)] bg-sidebar shadow-xl",
          !navOpen && "pointer-events-none",
        )}
        aria-hidden={!navOpen}
      >
        <SidebarContent
          pathname={pathname}
          projectId={projectId}
          inProject={inProject}
          onNavigate={closeNav}
          isAdmin={isAdmin}
        />
      </motion.aside>

      {/* Full-width main column — no sidebar gutter */}
      <div className="flex flex-1 flex-col min-w-0 w-full min-h-0 overflow-hidden">
        {!workspaceFullscreen && (
          <header className="app-header sticky top-0 z-30 flex min-h-12 items-center gap-2 border-b border-[rgba(148,163,184,0.16)] bg-[rgba(5,7,10,0.88)] px-3 py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <Button
              ref={navToggleRef}
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-[#CBD5E1] hover:bg-white/[0.06] hover:text-[#F8FAFC]"
              onClick={() => setNavOpen((o) => !o)}
              aria-label={navOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={navOpen}
            >
              {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {project && inProject ? (
              <ProjectHeaderContent
                project={project}
                subtitle={projectPageSubtitle(pathname) ?? undefined}
                compact
              />
            ) : (
              <div className="min-w-0 hidden sm:block">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">
                  GeoAI Infrastructure Studio
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  AI-powered site planning and 3D infrastructure design
                </p>
              </div>
            )}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              {project && projectId && (
                <div className="hidden items-center gap-1 md:flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-[11px] text-[#CBD5E1] hover:bg-white/[0.06] hover:text-[#F8FAFC]"
                    title="Save project geometry"
                    onClick={() => window.dispatchEvent(new CustomEvent("geoai:save-project"))}
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Save</span>
                  </Button>
                  <Link href={`/projects/${projectId}/report`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 px-2 text-[11px] text-[#CBD5E1] hover:bg-white/[0.06] hover:text-[#F8FAFC]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline">Export</span>
                    </Button>
                  </Link>
                </div>
              )}
              <Link href="/projects/new">
                <Button size="sm" variant="default" className="gap-1.5 h-8 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New Project</span>
                </Button>
              </Link>
              <UserMenu pathname={pathname} />
            </div>
          </header>
        )}

        {inProject && project && !workspaceFullscreen && (
          <ProjectStepper
            projectId={projectId!}
            hasLocation={project.center_lat != null}
            hasBoundary={!!project.boundary_geojson}
            hasParameters={project.status !== "draft"}
            hasDesign={project.status === "designed" || project.status === "completed"}
            compact
          />
        )}

        <main id="main-content" className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <PageTransition>{children}</PageTransition>
        </main>

        {!pathname?.includes("/workspace") &&
          !pathname?.includes("/map") &&
          !pathname?.includes("/projects/new") &&
          pathname !== "/dashboard" && (
          <div className="border-t border-border px-4 py-2 hidden lg:block panel">
            <DisclaimerBanner compact />
          </div>
        )}
      </div>
    </div>
  );
}
