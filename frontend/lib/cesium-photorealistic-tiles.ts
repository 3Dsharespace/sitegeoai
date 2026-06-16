/**
 * Photorealistic 3D city tiles for Cesium (Google Photorealistic → Cesium Ion fallback).
 */

import { cesiumDevLog, applyIonOsmBuildingTileStyle } from "@/lib/cesium-scene";
import type { MapRuntimeConfig, TileProvidersResponse } from "@/lib/map-imagery";

/** Cesium Ion global OSM 3D buildings (fallback when Google is unavailable). */
export const CESIUM_ION_OSM_BUILDINGS_ASSET_ID = 96188;

export type PhotorealisticTileProvider = "google" | "ion-osm" | null;

export interface PhotorealisticTileState {
  google: unknown | null;
  ion: unknown | null;
  activeProvider: PhotorealisticTileProvider;
  loadGeneration: number;
}

export function createPhotorealisticTileState(): PhotorealisticTileState {
  return {
    google: null,
    ion: null,
    activeProvider: null,
    loadGeneration: 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function destroyTileset(viewer: any, tileset: any | null) {
  if (!tileset) return;
  try {
    tileset.show = false;
    viewer?.scene?.primitives?.remove(tileset);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(tileset as any).isDestroyed?.()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tileset as any).destroy?.();
    }
  } catch {
    /* viewer shutting down */
  }
}

/** Remove all managed photorealistic tilesets from the scene. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function destroyPhotorealisticTiles(viewer: any, state: PhotorealisticTileState, reason?: string) {
  destroyTileset(viewer, state.google);
  destroyTileset(viewer, state.ion);
  if (reason) {
    cesiumDevLog("tiles-google", `Photorealistic 3D tiles destroyed (${reason})`);
  }
  viewer?.scene?.requestRender?.();
  return createPhotorealisticTileState();
}

/** Apply quality defaults — never force white/debug colors on photorealistic tiles. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function configurePhotorealisticTileset(tileset: any, provider: PhotorealisticTileProvider) {
  tileset.show = true;
  tileset.maximumScreenSpaceError = 8;
  tileset.dynamicScreenSpaceError = true;
  if (provider === "google") {
    tileset.style = undefined;
  }
}

export interface SyncPhotorealisticTilesParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Cesium: any;
  enabled: boolean;
  state: PhotorealisticTileState;
  providers: TileProvidersResponse;
  runtime: Pick<MapRuntimeConfig, "google_maps_api_key" | "cesium_ion_token">;
}

/**
 * Rebuild photorealistic 3D tiles from scratch when enabled.
 * Returns updated state; stale async loads are ignored via loadGeneration.
 */
export async function syncPhotorealisticTiles({
  viewer,
  Cesium,
  enabled,
  state,
  providers,
  runtime,
}: SyncPhotorealisticTilesParams): Promise<PhotorealisticTileState> {
  const nextGeneration = state.loadGeneration + 1;

  if (!enabled || viewer.isDestroyed?.()) {
    destroyPhotorealisticTiles(viewer, state, enabled ? "viewer destroyed" : "disabled");
    return { ...createPhotorealisticTileState(), loadGeneration: nextGeneration };
  }

  // Full rebuild — destroy any previous tilesets before loading fresh ones.
  destroyPhotorealisticTiles(viewer, state);
  const working: PhotorealisticTileState = {
    google: null,
    ion: null,
    activeProvider: null,
    loadGeneration: nextGeneration,
  };

  const stillEnabled = () => working.loadGeneration === nextGeneration && !viewer.isDestroyed?.();

  // --- Google Photorealistic 3D Tiles (preferred) ---
  if (providers.google_3d_tiles_available && runtime.google_maps_api_key) {
    try {
      Cesium.GoogleMaps.defaultApiKey = runtime.google_maps_api_key;
      const tileset = await Cesium.createGooglePhotorealistic3DTileset({
        onlyUsingWithGoogleGeocoder: true,
      });
      if (!stillEnabled()) {
        destroyTileset(viewer, tileset);
        return working;
      }
      configurePhotorealisticTileset(tileset, "google");
      viewer.scene.primitives.add(tileset);
      working.google = tileset;
      working.activeProvider = "google";
      cesiumDevLog("tiles-google", "Photorealistic 3D tiles rebuilt (Google)");
      viewer.scene.requestRender();
      return working;
    } catch (error) {
      cesiumDevLog("tiles-google", "Google Photorealistic 3D tiles failed", error);
    }
  }

  // --- Cesium Ion OSM 3D buildings (fallback) ---
  const ionToken = runtime.cesium_ion_token;
  if (stillEnabled() && providers.cesium_ion_available && ionToken) {
    try {
      if (!Cesium.Ion.defaultAccessToken) {
        Cesium.Ion.defaultAccessToken = ionToken;
      }
      const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(CESIUM_ION_OSM_BUILDINGS_ASSET_ID);
      if (!stillEnabled()) {
        destroyTileset(viewer, tileset);
        return working;
      }
      applyIonOsmBuildingTileStyle(Cesium, tileset);
      configurePhotorealisticTileset(tileset, "ion-osm");
      viewer.scene.primitives.add(tileset);
      working.ion = tileset;
      working.activeProvider = "ion-osm";
      cesiumDevLog("tiles-ion", "3D tiles rebuilt (Cesium Ion OSM fallback)");
      viewer.scene.requestRender();
      return working;
    } catch (error) {
      cesiumDevLog("tiles-ion", "Cesium Ion 3D tiles failed", error);
    }
  }

  cesiumDevLog("tiles-google", "No photorealistic 3D tile provider available");
  return working;
}

/** Toggle visibility without rebuilding (layer panel / quick hide). */
export function setPhotorealisticTilesVisible(state: PhotorealisticTileState, visible: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setShow = (t: any) => {
    if (t && !t.isDestroyed?.()) t.show = visible;
  };
  setShow(state.google);
  setShow(state.ion);
}
