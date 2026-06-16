/** Shared map / 3D drawing colors — keep in sync with CSS vars in globals.css */
export const MAP_COLORS = {
  road: "#F59E0B",
  valid: "#22C55E",
  primary: "#3B82F6",
  structure: "#94A3B8",
  /** Subtle OSM / fallback building extrusions in 3D workspace */
  contextBuilding: "rgba(110, 125, 145, 0.25)",
  contextBuildingOutline: "rgba(110, 125, 145, 0.45)",
  water: "#06B6D4",
  warning: "#F59E0B",
  danger: "#EF4444",
  vertexStroke: "#F8FAFC",
} as const;
