"use client";

import { Box, Building2, Download, Layers3, Map, Mountain, RotateCcw } from "lucide-react";
import type { WorkspaceMapStyle } from "@/components/map/mapTypes";
import { styleProviderLabel } from "@/lib/map/styles";
import { cn } from "@/lib/utils";

interface MapToolbarProps {
  mapStyle: WorkspaceMapStyle;
  onMapStyleChange: (style: WorkspaceMapStyle) => void;
  terrainEnabled: boolean;
  onTerrainToggle: () => void;
  terrainDisabled?: boolean;
  google3dEnabled: boolean;
  onGoogle3dToggle: () => void;
  google3dDisabled?: boolean;
  buildingsEnabled: boolean;
  onBuildingsToggle: () => void;
  onExport: () => void;
  onResetView: () => void;
  warning?: string | null;
}

export default function MapToolbar({
  mapStyle,
  onMapStyleChange,
  terrainEnabled,
  onTerrainToggle,
  terrainDisabled,
  google3dEnabled,
  onGoogle3dToggle,
  google3dDisabled,
  buildingsEnabled,
  onBuildingsToggle,
  onExport,
  onResetView,
  warning,
}: MapToolbarProps) {
  return (
    <div className="pointer-events-auto absolute left-4 right-4 top-4 z-30 flex flex-wrap items-center gap-2">
      <div className="flex min-h-10 items-center gap-2 rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(5,7,10,0.78)] px-2 py-1.5 shadow-2xl backdrop-blur-xl">
        <Map className="h-4 w-4 text-[#22D3EE]" />
        <select
          value={mapStyle}
          onChange={(event) => onMapStyleChange(event.target.value as WorkspaceMapStyle)}
          className="h-8 rounded-lg border border-[rgba(148,163,184,0.18)] bg-[#05070A] px-2 text-[12px] text-[#F8FAFC]"
          aria-label="Map style"
        >
          <option value="dark">Dark</option>
          <option value="streets">Streets</option>
          <option value="satellite">Satellite</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <span className="hidden text-[10px] text-[#94A3B8] md:inline">{styleProviderLabel(mapStyle)}</span>
      </div>

      <div className="flex min-h-10 items-center gap-1 rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(5,7,10,0.78)] p-1.5 shadow-2xl backdrop-blur-xl">
        {[
          {
            label: "Terrain",
            icon: Mountain,
            active: terrainEnabled,
            onClick: onTerrainToggle,
            disabled: terrainDisabled,
          },
          {
            label: "Google 3D",
            icon: Layers3,
            active: google3dEnabled,
            onClick: onGoogle3dToggle,
            disabled: google3dDisabled,
          },
          {
            label: "Buildings",
            icon: Building2,
            active: buildingsEnabled,
            onClick: onBuildingsToggle,
          },
        ].map(({ label, icon: Icon, active, onClick, disabled }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={onClick}
            title={disabled ? `${label} unavailable` : label}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-xl border px-2 text-[11px] transition-all disabled:opacity-40",
              active
                ? "border-[rgba(34,211,238,0.38)] bg-[rgba(34,211,238,0.12)] text-[#A5F3FC]"
                : "border-transparent text-[#CBD5E1] hover:border-[rgba(148,163,184,0.18)] hover:bg-white/[0.07] hover:text-[#F8FAFC]",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="ml-auto flex min-h-10 items-center gap-1 rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(5,7,10,0.78)] p-1.5 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={onResetView}
          className="flex h-8 items-center gap-1.5 rounded-xl px-2 text-[11px] text-[#CBD5E1] hover:bg-white/[0.08] hover:text-[#F8FAFC]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex h-8 items-center gap-1.5 rounded-xl border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.12)] px-2 text-[11px] text-[#BFDBFE] hover:bg-[rgba(59,130,246,0.18)]"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      {warning && (
        <div className="basis-full rounded-xl border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.1)] px-3 py-1.5 text-[11px] text-[#FCD34D] lg:basis-auto">
          {warning}
        </div>
      )}

      <div className="hidden items-center gap-1 rounded-full border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.1)] px-2.5 py-1 text-[10px] text-[#A7F3D0] xl:flex">
        <Box className="h-3 w-3" />
        MapLibre engine active
      </div>
    </div>
  );
}
