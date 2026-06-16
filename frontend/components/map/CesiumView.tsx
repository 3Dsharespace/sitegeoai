"use client";

import {
  applyGlobeTranslucency,
  cesiumDevLog,
  corridorRing,
  createElevationTerrain,
  createFlatTerrain,
  buildDesignModelMatrix,
  designModelGroundHeightM,
  resetGlobeTranslucency,
  resetImageryAlpha,
  estimateBuildingHeight,
  objectInfoFromFeature,
  roadWidthM,
  type Scene3DLayerKey,
} from "@/lib/cesium-scene";
import {
  createPhotorealisticTileState,
  destroyPhotorealisticTiles,
  setPhotorealisticTilesVisible,
  syncPhotorealisticTiles,
  type PhotorealisticTileState,
} from "@/lib/cesium-photorealistic-tiles";
import { formatDistanceForUnit, haversineM, lineLengthM } from "@/lib/geo";
import {
  basemapFor3d,
  createCesiumBasemapProvider,
  fetchMapRuntimeConfig,
  fetchTileProviders,
  type MapBasemap,
} from "@/lib/map-imagery";
import { MAP_COLORS } from "@/lib/map-colors";
import { designModelAnchor, alignmentBearing, modelLayerVisibility } from "@/lib/project-workflow";
import { applyDesignMeshVisibilityWhenReady } from "@/lib/design-mesh-layers";
import type { GeoJSONFeature, GeoJSONGeometry } from "@/lib/types";
import { useProjectStore } from "@/stores/projectStore";
import { useEffect, useMemo, useRef, useState } from "react";

interface CesiumViewProps {
  center: [number, number];
  boundary?: GeoJSONGeometry | null;
  alignment?: GeoJSONGeometry | null;
  modelUrl?: string | null;
  excavationUrl?: string | null;
  useModelLayers?: boolean;
  roadFeatures?: GeoJSONFeature[];
  buildingFeatures?: GeoJSONFeature[];
  waterFeatures?: GeoJSONFeature[];
  surveyGcpFeatures?: GeoJSONFeature[];
  surveyMode?: boolean;
  disableVendor3DTiles?: boolean;
  basemap?: MapBasemap;
}

const LAYER_DS: Scene3DLayerKey[] = [
  "roads",
  "buildings",
  "water",
  "trees",
  "pipeline",
  "construction",
  "labels",
];

type CesiumInputHandler = {
  isDestroyed?: () => boolean;
  destroy: () => void;
};

function destroyInputHandler(handler: CesiumInputHandler | null | undefined) {
  if (!handler) return;
  try {
    if (handler.isDestroyed?.()) return;
    handler.destroy();
  } catch {
    /* handler or viewer already torn down */
  }
}

export default function CesiumView({
  center,
  boundary,
  alignment,
  modelUrl,
  excavationUrl,
  useModelLayers = false,
  roadFeatures = [],
  buildingFeatures = [],
  waterFeatures = [],
  surveyGcpFeatures = [],
  surveyMode = false,
  disableVendor3DTiles = false,
  basemap = "satellite",
}: CesiumViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cesiumRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataSourcesRef = useRef<Map<string, any>>(new Map());
  const photorealisticTilesRef = useRef<PhotorealisticTileState>(createPhotorealisticTileState());
  const terrainModeRef = useRef<"flat" | "elevation">("elevation");
  const measurePointsRef = useRef<[number, number, number][]>([]);
  const handlerRef = useRef<CesiumInputHandler | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelsRef = useRef<{ main: any; excav: any }>({ main: null, excav: null });
  const basemapRef = useRef(basemap);
  const mapRuntimeRef = useRef<{ cesium_ion_token: string | null; google_maps_api_key: string | null }>({
    cesium_ion_token: null,
    google_maps_api_key: null,
  });

  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  /** Bumped after terrain provider switches so clamped entities re-bind to the globe. */
  const [terrainEpoch, setTerrainEpoch] = useState(0);

  const layers = useProjectStore((s) => s.layers);
  const surveyLayers = useProjectStore((s) => s.surveyLayers);
  const modelLayers = useProjectStore((s) => s.modelLayers);
  const cesiumTool = useProjectStore((s) => s.cesiumTool);
  const scene3dLayers = useProjectStore((s) => s.scene3dLayers);
  const undergroundView = useProjectStore((s) => s.undergroundView);
  const scene3dMeasureTool = useProjectStore((s) => s.scene3dMeasureTool);
  const measureUnit = useProjectStore((s) => s.measureUnit);
  const designMeshCatalog = useProjectStore((s) => s.designMeshCatalog);
  const designMeshVisibility = useProjectStore((s) => s.designMeshVisibility);

  const centerLng = center[0];
  const centerLat = center[1];

  useEffect(() => {
    basemapRef.current = basemap;
  }, [basemap]);

  const visibility = useMemo(
    () =>
      useModelLayers
        ? modelLayerVisibility(modelLayers)
        : { showProjectModel: layers.projectModel, showExcavation: layers.excavation },
    [useModelLayers, modelLayers, layers.projectModel, layers.excavation],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDs = (viewer: any, Cesium: any, key: string) => {
    const map = dataSourcesRef.current;
    if (map.has(key)) return map.get(key)!;
    const ds = new Cesium.CustomDataSource(key);
    viewer.dataSources.add(ds);
    map.set(key, ds);
    return ds;
  };

  const clearDs = (key: string) => {
    dataSourcesRef.current.get(key)?.entities.removeAll();
  };

  /** Photorealistic Ion/Google 3D tiles — gated by the "3D city tiles" layer. */
  const vendorPhotorealisticTilesEnabled = () =>
    !disableVendor3DTiles && useProjectStore.getState().layers.tiles3d;

  // Init viewer
  useEffect(() => {
    const dataSources = dataSourcesRef.current;
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).CESIUM_BASE_URL = "/cesium";
        if (!document.getElementById("cesium-widgets-css")) {
          const link = document.createElement("link");
          link.id = "cesium-widgets-css";
          link.rel = "stylesheet";
          link.href = "/cesium/Widgets/widgets.css";
          document.head.appendChild(link);
        }
        const Cesium = await import("cesium");
        if (cancelled || !containerRef.current || viewerRef.current) return;
        cesiumRef.current = Cesium;

        const providers = await fetchTileProviders();
        const runtime = await fetchMapRuntimeConfig();
        mapRuntimeRef.current = runtime;

        const token = runtime.cesium_ion_token ?? undefined;
        if (token) Cesium.Ion.defaultAccessToken = token;

        const resolvedBasemap = basemapFor3d(basemapRef.current);
        const imageryProvider = await createCesiumBasemapProvider(
          Cesium,
          resolvedBasemap,
          providers,
        );
        if (cancelled || !containerRef.current || viewerRef.current) return;

        const viewer = new Cesium.Viewer(containerRef.current, {
          baseLayer: new Cesium.ImageryLayer(imageryProvider),
          baseLayerPicker: false,
          geocoder: false,
          timeline: false,
          animation: false,
          sceneModePicker: true,
          navigationHelpButton: false,
          infoBox: false,
          selectionIndicator: true,
          terrain: createFlatTerrain(Cesium),
        });
        viewer.scene.requestRenderMode = false;
        viewer.scene.maximumRenderTimeChange = Infinity;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.enableLighting = false;
        viewerRef.current = viewer;
        setLoaded(true);
      } catch (e) {
        setError(`Cesium failed to load: ${e instanceof Error ? e.message : e}`);
      }
    })();
    return () => {
      cancelled = true;
      destroyInputHandler(handlerRef.current);
      handlerRef.current = null;
      const viewer = viewerRef.current;
      if (viewer) {
        photorealisticTilesRef.current = destroyPhotorealisticTiles(
          viewer,
          photorealisticTilesRef.current,
          "viewer destroyed",
        );
      }
      dataSources.clear();
      viewerRef.current?.destroy?.();
      viewerRef.current = null;
    };
  }, []);

  // Swap basemap imagery in 3D
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !loaded) return;

    let cancelled = false;
    void (async () => {
      try {
        const providers = await fetchTileProviders();
        const provider = await createCesiumBasemapProvider(
          Cesium,
          basemapFor3d(basemap),
          providers,
        );
        if (cancelled || viewer.isDestroyed?.()) return;
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(provider);
        resetImageryAlpha(viewer);
        cesiumDevLog("basemap", `Basemap switched to ${basemap}`);
        viewer.scene.requestRender();
      } catch {
        /* keep current imagery */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [basemap, loaded]);

  // Terrain — elevation when terrain layer or photorealistic tiles need it.
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !loaded) return;

    const vendorTilesOn = !disableVendor3DTiles && layers.tiles3d;
    const needElevation = vendorTilesOn;
    const nextTerrainMode: "flat" | "elevation" = needElevation ? "elevation" : "flat";

    cesiumDevLog(
      "terrain",
      `${nextTerrainMode} terrain (3D city tiles ${layers.tiles3d ? "on" : "off"})`,
    );

    viewer.scene.globe.show = true;
    viewer.scene.globe.terrainExaggeration = 1;
    viewer.scene.globe.terrainExaggerationRelativeHeight = 0;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.depthTestAgainstTerrain = false;

    let cancelled = false;
    const terrainChanged = terrainModeRef.current !== nextTerrainMode;
    terrainModeRef.current = nextTerrainMode;

    void (async () => {
      if (terrainChanged) {
        try {
          viewer.scene.setTerrain(
            nextTerrainMode === "elevation"
              ? createElevationTerrain(Cesium, mapRuntimeRef.current.cesium_ion_token ?? undefined)
              : createFlatTerrain(Cesium),
          );
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
        } catch {
          /* keep current terrain */
        }
      }

      if (!cancelled) {
        setTerrainEpoch((n) => n + 1);
        viewer.scene.requestRender();
      }
    })();

    viewer.scene.requestRender();

    return () => {
      cancelled = true;
    };
  }, [loaded, layers.tiles3d, disableVendor3DTiles]);

  // Transparent / underground — globe translucency only (not pipeline/drainage).
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !loaded) return;

    const transparentOn = undergroundView;
    cesiumDevLog(
      "transparent",
      transparentOn ? "Transparent ON (globe translucency)" : "Transparent OFF (opaque globe)",
    );

    if (transparentOn) {
      applyGlobeTranslucency(viewer, Cesium);
    } else {
      resetGlobeTranslucency(viewer, Cesium);
      resetImageryAlpha(viewer);
    }
    viewer.scene.requestRender();
  }, [loaded, undergroundView]);

  // Photorealistic 3D tiles — rebuild when terrain is ready or tile config changes.
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !loaded) return;

    const enabled = vendorPhotorealisticTilesEnabled();

    cesiumDevLog(
      "buildings",
      `Photorealistic 3D tiles ${enabled ? "rebuilding" : "off"}`,
    );

    let cancelled = false;

    void (async () => {
      if (!enabled) {
        photorealisticTilesRef.current = destroyPhotorealisticTiles(
          viewer,
          photorealisticTilesRef.current,
          "3D tiles disabled",
        );
        return;
      }

      const providers = await fetchTileProviders();
      if (cancelled || !vendorPhotorealisticTilesEnabled()) return;

      photorealisticTilesRef.current = await syncPhotorealisticTiles({
        viewer,
        Cesium,
        enabled: true,
        state: photorealisticTilesRef.current,
        providers,
        runtime: mapRuntimeRef.current,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [loaded, disableVendor3DTiles, layers.tiles3d, terrainEpoch]);

  // Context layers: roads, buildings, water, alignment, boundary
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !loaded) return;

    clearDs("roads");
    clearDs("buildings");
    clearDs("water");
    clearDs("trees");
    clearDs("pipeline");
    clearDs("construction");
    clearDs("labels");
    clearDs("project");

    const roadsDs = getDs(viewer, Cesium, "roads");
    const buildingsDs = getDs(viewer, Cesium, "buildings");
    const waterDs = getDs(viewer, Cesium, "water");
    const pipelineDs = getDs(viewer, Cesium, "pipeline");
    const constructionDs = getDs(viewer, Cesium, "construction");
    const projectDs = getDs(viewer, Cesium, "project");

    roadsDs.show = scene3dLayers.roads;
    buildingsDs.show = scene3dLayers.buildings;
    waterDs.show = scene3dLayers.water;
    pipelineDs.show = scene3dLayers.pipeline || scene3dLayers.drainage;
    constructionDs.show = scene3dLayers.construction;

    if (boundary?.type === "Polygon" && scene3dLayers.construction) {
      const ring = (boundary.coordinates as number[][][])[0];
      constructionDs.entities.add({
        id: "construction-boundary",
        name: "Construction zone",
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(ring.flat()),
          material: Cesium.Color.fromCssColorString(MAP_COLORS.valid).withAlpha(0.2),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(MAP_COLORS.valid),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        properties: { layer: "construction", objectType: "Construction zone" },
      });
    }

    roadFeatures.forEach((f, i) => {
      if (f.geometry.type !== "LineString") return;
      const coords = f.geometry.coordinates as [number, number][];
      const width = roadWidthM(f.properties ?? {}) || Number(f.properties?.width_m) || 7;
      const isSurvey = surveyMode && f.properties?.tier;
      const ring = corridorRing(coords, width);
      if (ring) {
        roadsDs.entities.add({
          id: `road-${i}`,
          name: String(f.properties?.name ?? `Road ${i + 1}`),
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(ring.flat()),
            material: Cesium.Color.fromCssColorString(MAP_COLORS.road).withAlpha(
              isSurvey ? 0.95 : 0.92,
            ),
            height: 0.35,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          properties: { ...f.properties, layer: "roads", objectType: isSurvey ? "Survey road" : "Road" },
        });
      } else {
        roadsDs.entities.add({
          id: `road-line-${i}`,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(
              coords.flatMap(([lng, lat]) => [lng, lat, 0.35]),
            ),
            width: Math.max(4, width / 2),
            material: Cesium.Color.fromCssColorString(MAP_COLORS.road),
            clampToGround: true,
          },
          properties: { ...f.properties, layer: "roads", objectType: isSurvey ? "Survey road" : "Road" },
        });
      }
    });

    if (surveyMode && surveyLayers.surveyGcp) {
      const gcpDs = getDs(viewer, Cesium, "labels");
      surveyGcpFeatures.forEach((f, i) => {
        if (f.geometry.type !== "Point") return;
        const [lng, lat] = f.geometry.coordinates as [number, number];
        gcpDs.entities.add({
          id: `gcp-${i}`,
          name: String(f.properties?.name ?? `GCP ${i + 1}`),
          position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString(MAP_COLORS.primary),
            outlineColor: Cesium.Color.fromCssColorString(MAP_COLORS.vertexStroke),
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: String(f.properties?.name ?? "GCP"),
            font: "11px sans-serif",
            fillColor: Cesium.Color.fromCssColorString(MAP_COLORS.primary),
            pixelOffset: new Cesium.Cartesian2(0, -14),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          properties: { layer: "gcp", objectType: "Ground control point" },
        });
      });
    }

    if (scene3dLayers.buildings) {
      buildingFeatures.forEach((f, i) => {
        if (f.geometry.type !== "Polygon") return;
        const ring = (f.geometry.coordinates as number[][][])[0];
        const height = estimateBuildingHeight(f.properties ?? {});
        buildingsDs.entities.add({
          id: `building-${i}`,
          name: String(f.properties?.name ?? f.properties?.["addr:street"] ?? `Building ${i + 1}`),
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(ring.flat()),
            height: 0,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            extrudedHeight: height,
            extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            material: Cesium.Color.fromCssColorString(MAP_COLORS.contextBuilding),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(MAP_COLORS.contextBuildingOutline),
          },
          properties: { ...f.properties, layer: "buildings", objectType: "Building", heightM: height },
        });
      });
      if (buildingFeatures.length > 0) {
        cesiumDevLog("osm", `OSM extruded buildings created (${buildingFeatures.length})`);
      }
    }

    waterFeatures.forEach((f, i) => {
      if (f.geometry.type !== "LineString" && f.geometry.type !== "Polygon") return;
      if (f.geometry.type === "Polygon") {
        const ring = (f.geometry.coordinates as number[][][])[0];
        waterDs.entities.add({
          id: `water-${i}`,
          name: "Water body",
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(ring.flat()),
            material: Cesium.Color.fromCssColorString(MAP_COLORS.water).withAlpha(0.55),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          properties: { layer: "water", objectType: "Water" },
        });
      }
    });

    if (alignment?.type === "LineString" && scene3dLayers.flyover) {
      const coords = alignment.coordinates as [number, number][];
      projectDs.entities.add({
        id: "alignment-centerline",
        name: "Alignment / flyover path",
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(
            coords.flatMap(([lng, lat]) => [lng, lat, 2]),
          ),
          width: 3,
          material: Cesium.Color.fromCssColorString(MAP_COLORS.primary).withAlpha(0.9),
        },
        properties: { layer: "flyover", objectType: "Alignment" },
      });

      if (scene3dLayers.pipeline) {
        pipelineDs.entities.add({
          id: "pipeline-under-alignment",
          name: "Pipeline (underground)",
          polylineVolume: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(
              coords.flatMap(([lng, lat]) => [lng, lat, -3]),
            ),
            shape: computePipeShape(Cesium, 0.6),
            material: Cesium.Color.fromCssColorString(MAP_COLORS.water).withAlpha(0.85),
          },
          properties: { layer: "pipeline", objectType: "Pipeline", material: "HDPE" },
        });
      }
    }

    projectDs.show =
      scene3dLayers.flyover || scene3dLayers.bridge || scene3dLayers.excavation;

    if (cesiumTool === "section") {
      const plane = Cesium.ClippingPlane.fromPointNormal(
        Cesium.Cartesian3.fromDegrees(centerLng, centerLat, 15),
        new Cesium.Cartesian3(0, 1, 0),
      );
      viewer.scene.globe.clippingPlanes = new Cesium.ClippingPlaneCollection({
        planes: [plane],
        edgeWidth: 1,
      });
    } else {
      viewer.scene.globe.clippingPlanes = undefined as never;
    }
  }, [
    loaded,
    boundary,
    alignment,
    modelUrl,
    excavationUrl,
    centerLng,
    centerLat,
    roadFeatures,
    buildingFeatures,
    waterFeatures,
    surveyMode,
    surveyGcpFeatures,
    surveyLayers.surveyGcp,
    scene3dLayers,
    cesiumTool,
    terrainEpoch,
  ]);

  // AI design GLB models (per-mesh layer visibility via node names)
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !loaded) return;

    let cancelled = false;

    const destroyModel = (model: { destroy?: () => void; isDestroyed?: () => boolean } | null) => {
      if (!model) return;
      try {
        viewer.scene.primitives.remove(model);
        if (!model.isDestroyed?.()) model.destroy?.();
      } catch {
        /* viewer shutting down */
      }
    };

    (async () => {
      destroyModel(modelsRef.current.main);
      destroyModel(modelsRef.current.excav);
      modelsRef.current = { main: null, excav: null };

      const placement = designModelAnchor(alignment ?? null, centerLng, centerLat);
      const groundHeight = await designModelGroundHeightM(
        Cesium,
        viewer,
        placement.lng,
        placement.lat,
      );
      const modelOpts = {
        minimumPixelSize: 48,
        maximumScale: 20000,
        silhouetteColor: Cesium.Color.fromCssColorString(MAP_COLORS.primary).withAlpha(0.4),
        silhouetteSize: 2,
      };

      if (modelUrl && scene3dLayers.flyover && (useModelLayers ? visibility.showProjectModel : layers.projectModel)) {
        const modelMatrix = buildDesignModelMatrix(
          Cesium,
          placement.lng,
          placement.lat,
          placement.bearingRad,
          groundHeight,
        );
        const model = await Cesium.Model.fromGltfAsync({
          url: modelUrl,
          modelMatrix,
          ...modelOpts,
        });
        if (cancelled) {
          model.destroy();
          return;
        }
        viewer.scene.primitives.add(model);
        modelsRef.current.main = model;
        applyDesignMeshVisibilityWhenReady(
          model,
          useProjectStore.getState().designMeshCatalog,
          useProjectStore.getState().designMeshVisibility,
        );
      }

      const showExcav = useModelLayers ? visibility.showExcavation : layers.excavation;
      if (excavationUrl && scene3dLayers.excavation && showExcav) {
        const excavHeight = groundHeight + (cesiumTool === "exploded" ? -25 : 0);
        const excavMatrix = buildDesignModelMatrix(
          Cesium,
          placement.lng,
          placement.lat,
          placement.bearingRad,
          excavHeight,
        );
        const excav = await Cesium.Model.fromGltfAsync({
          url: excavationUrl,
          modelMatrix: excavMatrix,
          ...modelOpts,
        });
        if (cancelled) {
          excav.destroy();
          return;
        }
        viewer.scene.primitives.add(excav);
        modelsRef.current.excav = excav;
        applyDesignMeshVisibilityWhenReady(
          excav,
          useProjectStore.getState().designMeshCatalog,
          useProjectStore.getState().designMeshVisibility,
        );
        if (!useProjectStore.getState().designMeshCatalog.length) {
          excav.show = useProjectStore.getState().designMeshVisibility.excavation !== false;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    loaded,
    modelUrl,
    excavationUrl,
    centerLng,
    centerLat,
    alignment,
    scene3dLayers.flyover,
    scene3dLayers.excavation,
    cesiumTool,
    useModelLayers,
    visibility.showProjectModel,
    visibility.showExcavation,
    layers.projectModel,
    layers.excavation,
    designMeshCatalog,
    designMeshVisibility,
    terrainEpoch,
  ]);

  // Re-anchor design models when terrain changes (keep ENU up, no axis tilt).
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !loaded) return;

    let cancelled = false;

    void (async () => {
      const placement = designModelAnchor(alignment ?? null, centerLng, centerLat);
      const groundHeight = await designModelGroundHeightM(
        Cesium,
        viewer,
        placement.lng,
        placement.lat,
      );
      if (cancelled) return;

      const { main, excav } = modelsRef.current;
      if (main && !main.isDestroyed?.()) {
        main.modelMatrix = buildDesignModelMatrix(
          Cesium,
          placement.lng,
          placement.lat,
          placement.bearingRad,
          groundHeight,
        );
      }
      if (excav && !excav.isDestroyed?.()) {
        excav.modelMatrix = buildDesignModelMatrix(
          Cesium,
          placement.lng,
          placement.lat,
          placement.bearingRad,
          groundHeight + (cesiumTool === "exploded" ? -25 : 0),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    loaded,
    centerLng,
    centerLat,
    alignment,
    terrainEpoch,
    cesiumTool,
  ]);

  // Layer visibility toggles without full rebuild (except buildings handled above on rebuild).
  useEffect(() => {
    if (!loaded) return;
    const map = dataSourcesRef.current;
    LAYER_DS.forEach((key) => {
      const ds = map.get(key);
      if (ds) ds.show = scene3dLayers[key];
    });
    const projectDs = map.get("project");
    if (projectDs) {
      projectDs.show = scene3dLayers.flyover || scene3dLayers.excavation;
    }

    const showVendor = !disableVendor3DTiles && layers.tiles3d;
    setPhotorealisticTilesVisible(photorealisticTilesRef.current, showVendor);
    viewerRef.current?.scene?.requestRender?.();

    const { main, excav } = modelsRef.current;
    if (main) {
      main.show = scene3dLayers.flyover && (useModelLayers ? visibility.showProjectModel : layers.projectModel);
      if (designMeshCatalog.length) {
        applyDesignMeshVisibilityWhenReady(main, designMeshCatalog, designMeshVisibility);
      }
    }
    if (excav) {
      const showExcav = useModelLayers ? visibility.showExcavation : layers.excavation;
      excav.show =
        scene3dLayers.excavation &&
        showExcav &&
        designMeshVisibility.excavation !== false;
      if (designMeshCatalog.length) {
        applyDesignMeshVisibilityWhenReady(excav, designMeshCatalog, designMeshVisibility);
      }
    }
  }, [loaded, scene3dLayers, visibility, layers.projectModel, layers.excavation, layers.tiles3d, useModelLayers, designMeshCatalog, designMeshVisibility, disableVendor3DTiles]);

  // Camera home
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !loaded) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(centerLng, centerLat - 0.008, 1800),
      orientation: {
        heading: alignmentBearing(alignment ?? null),
        pitch: Cesium.Math.toRadians(-45),
      },
      duration: 1.2,
    });
  }, [centerLng, centerLat, loaded, alignment]);

  // Camera controls
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !loaded) return;
    const ctrl = viewer.scene.screenSpaceCameraController;
    ctrl.enableRotate = cesiumTool === "orbit";
    ctrl.enableTranslate = cesiumTool === "pan" || cesiumTool === "orbit";
    ctrl.enableZoom = true;
    ctrl.enableTilt = cesiumTool === "orbit";
    if (cesiumTool === "zoom") {
      ctrl.enableRotate = false;
      ctrl.enableTranslate = false;
    }
  }, [cesiumTool, loaded]);

  // Pick + measure
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || !loaded) return;

    destroyInputHandler(handlerRef.current);
    handlerRef.current = null;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((click: { position: { x: number; y: number } }) => {
      const picked = viewer.scene.pick(click.position);
      const store = useProjectStore.getState();

      if (scene3dMeasureTool !== "none") {
        const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
        if (!cartesian) return;
        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        const pt: [number, number, number] = [
          Cesium.Math.toDegrees(carto.longitude),
          Cesium.Math.toDegrees(carto.latitude),
          carto.height,
        ];
        measurePointsRef.current.push(pt);
        const pts = measurePointsRef.current;

        if (scene3dMeasureTool === "distance" && pts.length >= 2) {
          const d = haversineM([pts[0][0], pts[0][1]], [pts[1][0], pts[1][1]]);
          store.setScene3dMeasureReadout(`Distance: ${formatDistanceForUnit(d, measureUnit)}`);
          measurePointsRef.current = [];
        } else if (scene3dMeasureTool === "height" && pts.length >= 1) {
          store.setScene3dMeasureReadout(`Height: ${pts[0][2].toFixed(1)} m`);
          measurePointsRef.current = [];
        } else if (scene3dMeasureTool === "slope" && pts.length >= 2) {
          const run = haversineM([pts[0][0], pts[0][1]], [pts[1][0], pts[1][1]]);
          const rise = pts[1][2] - pts[0][2];
          const pct = run > 0 ? (rise / run) * 100 : 0;
          store.setScene3dMeasureReadout(`Slope: ${pct.toFixed(1)}% (${rise.toFixed(1)} m rise)`);
          measurePointsRef.current = [];
        } else if (scene3dMeasureTool === "depth" && pts.length >= 1) {
          store.setScene3dMeasureReadout(`Depth below ellipsoid: ${Math.max(0, -pts[0][2]).toFixed(1)} m`);
          measurePointsRef.current = [];
        }
        return;
      }

      if (!picked?.id) {
        store.setSelectedObject3d(null);
        return;
      }

      const entity = picked.id;
      const props = entity.properties?.getValue?.(Cesium.JulianDate.now()) ?? {};
      const layer = (props.layer ?? "buildings") as Scene3DLayerKey;
      store.setSelectedObject3d(
        objectInfoFromFeature(String(entity.id), layer, undefined, {
          name: entity.name ?? String(entity.id),
          type: String(props.objectType ?? layer),
          material: props.material ? String(props.material) : undefined,
          heightM: props.heightM ? Number(props.heightM) : undefined,
          lengthM:
            alignment?.type === "LineString" && entity.id === "alignment-centerline"
              ? lineLengthM(alignment.coordinates as [number, number][])
              : undefined,
          properties: props,
        }),
      );
      viewer.selectedEntity = entity;
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handlerRef.current = handler;
    return () => {
      if (handlerRef.current === handler) handlerRef.current = null;
      destroyInputHandler(handler);
    };
  }, [loaded, scene3dMeasureTool, measureUnit, alignment]);

  useEffect(() => {
    measurePointsRef.current = [];
    useProjectStore.getState().setScene3dMeasureReadout(null);
  }, [scene3dMeasureTool]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-destructive p-6 text-center">
        {error}
      </div>
    );
  }
  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computePipeShape(Cesium: any, radius: number) {
  const segments = 12;
  const shape = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    shape.push(new Cesium.Cartesian2(radius * Math.cos(angle), radius * Math.sin(angle)));
  }
  return shape;
}
