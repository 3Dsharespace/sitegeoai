import { haversineM, lineLengthM, polygonAreaSqm } from "@/lib/geo";
import { corridorFromLine } from "@/lib/map-draw";
import type { GeoJSONFeature, GeoJSONGeometry } from "@/lib/types";

export interface Scene3DObjectInfo {
  id: string;
  name: string;
  type: string;
  material?: string;
  quantity?: string;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  areaSqm?: number;
  volumeM3?: number;
  properties?: Record<string, unknown>;
}

export type Scene3DLayerKey =
  | "terrain"
  | "mountains"
  | "roads"
  | "buildings"
  | "flyover"
  | "bridge"
  | "pipeline"
  | "drainage"
  | "excavation"
  | "construction"
  | "water"
  | "trees"
  | "labels";

export const SCENE3D_LAYER_LABELS: Record<Scene3DLayerKey, string> = {
  terrain: "Terrain",
  mountains: "Mountains / slopes",
  roads: "Roads (3D)",
  buildings: "Buildings",
  flyover: "Flyover / deck",
  bridge: "Bridge",
  pipeline: "Pipeline (underground)",
  drainage: "Drainage",
  excavation: "Excavation",
  construction: "Construction zone",
  water: "Water bodies",
  trees: "Trees / poles",
  labels: "Measurement labels",
};

export function defaultScene3DLayers(): Record<Scene3DLayerKey, boolean> {
  return {
    terrain: true,
    mountains: true,
    roads: true,
    buildings: true,
    flyover: true,
    bridge: true,
    pipeline: true,
    drainage: true,
    excavation: true,
    construction: true,
    water: true,
    trees: false,
    labels: true,
  };
}

export function estimateBuildingHeight(props: Record<string, unknown>): number {
  const levels = Number(props["building:levels"] ?? props.levels ?? 0);
  if (levels > 0) return levels * 3.2;
  const h = Number(props.height ?? props["building:height"] ?? 0);
  if (h > 0) return h;
  return 12;
}

export function featureFootprintArea(geom: GeoJSONGeometry): number {
  if (geom.type === "Polygon") {
    const ring = (geom.coordinates as [number, number][][])[0];
    return polygonAreaSqm(ring);
  }
  return 0;
}

export function roadWidthM(props: Record<string, unknown>): number {
  const lanes = Number(props.lanes ?? props["lanes:forward"] ?? 2);
  return Math.max(6, lanes * 3.5);
}

/** Build object metadata from a picked entity id + properties. */
export function objectInfoFromFeature(
  id: string,
  layer: Scene3DLayerKey,
  feature?: GeoJSONFeature,
  extra?: Partial<Scene3DObjectInfo>,
): Scene3DObjectInfo {
  const props = feature?.properties ?? {};
  const name = String(props.name ?? props["addr:street"] ?? id);
  const geom = feature?.geometry;
  let lengthM: number | undefined;
  let areaSqm: number | undefined;
  let heightM: number | undefined;
  let widthM: number | undefined;

  if (geom?.type === "LineString") {
    const coords = geom.coordinates as [number, number][];
    lengthM = lineLengthM(coords);
    widthM = roadWidthM(props);
  } else if (geom?.type === "Polygon") {
    areaSqm = featureFootprintArea(geom);
    heightM = estimateBuildingHeight(props);
    widthM = Math.sqrt(areaSqm);
  }

  const materialMap: Partial<Record<Scene3DLayerKey, string>> = {
    roads: "Asphalt",
    buildings: "Concrete / masonry",
    pipeline: "HDPE / steel pipe",
    drainage: "Concrete drain",
    excavation: "Soil cut",
    water: "Water surface",
    trees: "Vegetation",
    flyover: "Pre-stressed concrete deck",
    mountains: "Rock / soil",
    terrain: "Mixed terrain",
  };

  return {
    id,
    name,
    type: SCENE3D_LAYER_LABELS[layer] ?? layer,
    material: materialMap[layer],
    lengthM,
    widthM,
    heightM,
    areaSqm,
    volumeM3: areaSqm && heightM ? areaSqm * heightM : undefined,
    quantity: lengthM ? `${lengthM.toFixed(1)} m linear` : areaSqm ? `${areaSqm.toFixed(0)} m²` : undefined,
    properties: props,
    ...extra,
  };
}

export function corridorRing(coords: [number, number][], widthM: number): [number, number][] | null {
  const poly = corridorFromLine(coords, widthM);
  if (!poly || poly.type !== "Polygon") return null;
  return (poly.coordinates as [number, number][][])[0];
}

export function sampleLineAtDistance(
  coords: [number, number][],
  distM: number,
): [number, number] | null {
  if (coords.length < 2) return null;
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const seg = haversineM(coords[i - 1], coords[i]);
    if (acc + seg >= distM) return coords[i];
    acc += seg;
  }
  return coords[coords.length - 1];
}

export function slopePercent(riseM: number, runM: number): number {
  if (runM <= 0) return 0;
  return (riseM / runM) * 100;
}

/** OpenTopoMap — height-map style imagery (contours + relief). */
export const TOPO_IMAGERY_URL = "https://tile.opentopomap.org/{z}/{x}/{y}.png";

export const ARCGIS_ELEVATION_URL =
  "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer";

/** Default vertical exaggeration for readable 3D height-map terrain. */
export const DEFAULT_TERRAIN_EXAGGERATION = 1.5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createElevationTerrain(Cesium: any, ionToken?: string) {
  if (ionToken) {
    return Cesium.Terrain.fromWorldTerrain({ requestVertexNormals: true });
  }
  const providerPromise = Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
    ARCGIS_ELEVATION_URL,
  ).catch(() => new Cesium.EllipsoidTerrainProvider());
  return new Cesium.Terrain(providerPromise);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTopoImageryProvider(Cesium: any) {
  return new Cesium.UrlTemplateImageryProvider({
    url: TOPO_IMAGERY_URL,
    credit: "© OpenTopoMap contributors",
    maximumLevel: 17,
  });
}
