"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { SatelliteTileConfig, TerrainTileConfig } from "@/lib/map-imagery";

interface Providers {
  cesium_ion_available: boolean;
  google_3d_tiles_available: boolean;
  mapbox_available: boolean;
  satellite_config: SatelliteTileConfig;
  terrain_config: TerrainTileConfig;
}

const PROVIDERS = [
  { env: "GOOGLE_MAPS_API_KEY", label: "Google Maps Platform", use: "Photorealistic 3D Tiles + geocoding" },
  { env: "CESIUM_ION_TOKEN", label: "Cesium ion", use: "World terrain & OSM 3D buildings" },
  { env: "MAPBOX_TOKEN", label: "Mapbox", use: "Geocoding + HD satellite imagery" },
  { env: "OPENAI_API_KEY", label: "OpenAI", use: "AI design generation" },
  { env: "ANTHROPIC_API_KEY", label: "Anthropic", use: "AI design generation" },
  { env: "GEMINI_API_KEY", label: "Google Gemini", use: "AI design generation" },
];

export default function ProviderStatusPage() {
  const [providers, setProviders] = useState<Providers | null>(null);
  useEffect(() => {
    api.get<Providers>("/api/geocode/tile-providers").then(setProviders).catch(() => {});
  }, []);

  const status = (env: string): boolean | null => {
    if (!providers) return null;
    if (env === "CESIUM_ION_TOKEN") return providers.cesium_ion_available;
    if (env === "GOOGLE_MAPS_API_KEY") return providers.google_3d_tiles_available;
    if (env === "MAPBOX_TOKEN") return providers.mapbox_available;
    return null;
  };

  const satelliteLabel =
    providers?.satellite_config.provider === "mapbox"
      ? "Mapbox HD satellite (512px, zoom 22)"
      : "Esri World Imagery (zoom 22 fallback)";

  const terrainLabel = `Esri World Topo (tiles to z${providers?.terrain_config.max_zoom ?? 17}, overzoom to z20)`;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-6 py-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Provider Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All API keys are configured by your deployment team in the backend{" "}
            <code className="font-data text-xs">.env</code> file. End users never enter or manage keys
            in this app.
          </p>
        </div>

        {providers && (
          <Card float className="divide-y divide-border">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Satellite imagery</div>
                <div className="text-xs text-muted-foreground">{satelliteLabel}</div>
              </div>
              <Badge variant={providers.satellite_config.provider === "mapbox" ? "success" : "default"}>
                {providers.satellite_config.provider === "mapbox" ? "HD" : "standard"}
              </Badge>
            </CardContent>
            <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Terrain basemap</div>
                <div className="text-xs text-muted-foreground">{terrainLabel}</div>
              </div>
              <Badge variant="success">HD</Badge>
            </CardContent>
            <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">3D buildings</div>
                <div className="text-xs text-muted-foreground">
                  {providers.google_3d_tiles_available
                    ? "Google Photorealistic 3D Tiles"
                    : providers.cesium_ion_available
                      ? "Cesium OSM Buildings (Ion)"
                      : "Procedural OSM extrusions only"}
                </div>
              </div>
              <Badge
                variant={
                  providers.google_3d_tiles_available || providers.cesium_ion_available
                    ? "success"
                    : "warning"
                }
              >
                {providers.google_3d_tiles_available
                  ? "Google"
                  : providers.cesium_ion_available
                    ? "Cesium"
                    : "fallback"}
              </Badge>
            </CardContent>
          </Card>
        )}

        <Card float className="divide-y divide-border">
          {PROVIDERS.map((k) => {
            const s = status(k.env);
            return (
              <CardContent key={k.env} className="flex items-center gap-4 py-3 px-4">
                <div className="flex-1">
                  <div className="text-sm font-medium">{k.label}</div>
                  <div className="text-xs text-muted-foreground">
                    <code className="font-data">{k.env}</code> — {k.use}
                  </div>
                </div>
                {s === null ? (
                  <Badge variant="default">server-side</Badge>
                ) : s ? (
                  <Badge variant="success">active</Badge>
                ) : (
                  <Badge variant="warning">fallback</Badge>
                )}
              </CardContent>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
