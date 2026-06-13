export type AccuracyTier = "visual" | "gis_grade" | "survey_grade" | "engineering_ready";

export type EngineeringLayerType =
  | "road_centerline"
  | "road_edge"
  | "parcel"
  | "drain"
  | "bridge"
  | "retaining_wall"
  | "utility"
  | "construction_zone"
  | "mask_source";

export interface LayerMetadata {
  source: string | null;
  captureDate: string | null;
  crsEpsg: number | null;
  pixelSizeM: number | null;
  rmseHM: number | null;
  rmseVM: number | null;
  tier: AccuracyTier;
}

export interface SurveyDataset {
  id: number;
  kind: string;
  name: string;
  storage_key: string | null;
  source: string | null;
  capture_date: string | null;
  crs_epsg: number | null;
  crs_label: string | null;
  pixel_size_m: number | null;
  rmse_h_m: number | null;
  rmse_v_m: number | null;
  accuracy_tier: AccuracyTier;
  metadata_json: Record<string, unknown> | null;
}

export interface EngineeringLayer {
  id: number;
  layer_type: EngineeringLayerType;
  name: string;
  width_m: number | null;
  geom_wgs84_geojson: GeoJSONGeometry | null;
  properties_json: Record<string, unknown> | null;
  metadata: LayerMetadata;
}

export interface GroundControlPoint {
  id: number;
  name: string;
  source: string;
  lng: number;
  lat: number;
  easting_m: number | null;
  northing_m: number | null;
  horizontal_accuracy_m: number | null;
  vertical_accuracy_m: number | null;
}

export interface SurveyStatus {
  postgis_available: boolean;
  survey_mode_enabled: boolean;
  accuracy_tier: AccuracyTier;
  engineering_crs_epsg: number | null;
  visual_warning: string;
  disclaimer: string;
}

export interface ValidationReport {
  tier_result: AccuracyTier;
  passed: boolean;
  checks: { id: string; label: string; passed: boolean; detail: string }[];
  gcp_adjustment: {
    offset_e_m: number;
    offset_n_m: number;
    horizontal_rmse_m: number | null;
    vertical_rmse_m: number | null;
  };
}

export type ProjectType = "flyover" | "building" | "pipeline" | "road";

export interface GeoJSONGeometry {
  type: string;
  coordinates: unknown;
}

export interface Project {
  id: number;
  name: string;
  project_type: ProjectType;
  status: string;
  units: string;
  location_name: string;
  center_lat: number | null;
  center_lng: number | null;
  boundary_geojson: GeoJSONGeometry | null;
  alignment_geojson: GeoJSONGeometry | null;
  created_at: string;
  updated_at: string;
  disclaimer: string;
}

export interface SiteAnalysis {
  id: number;
  project_id: number;
  area_sqm: number | null;
  perimeter_m: number | null;
  elevation_min_m: number | null;
  elevation_max_m: number | null;
  slope_percent_estimate: number | null;
  nearby_roads_json: { features: GeoJSONFeature[] } | null;
  existing_buildings_json: { features: GeoJSONFeature[] } | null;
  risks_json: unknown[] | null;
  raw_geojson: { features: GeoJSONFeature[] } | null;
  created_at: string;
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: GeoJSONGeometry;
  properties: Record<string, unknown>;
}

export interface DesignScenario {
  id: number;
  name: string;
  status: string;
  input_parameters_json: Record<string, unknown> | null;
  design_output_json: DesignOutput | null;
  assumptions_json: string[] | null;
  created_at: string;
}

export interface DesignOutput {
  project_type: string;
  summary: string;
  assumptions: string[];
  geometry: Record<string, number | string>;
  materials: Record<string, string | number>;
  layers: { name: string; description: string }[];
  construction_sequence: string[];
  risks: unknown[];
  required_engineer_review: boolean;
  required_permissions: string[];
  ai_provider?: string;
  calculated?: {
    quantities: Record<string, number>;
    derived: Record<string, unknown>;
    timeline: Record<string, number | string>;
    cost_summary: CostSummary;
  };
}

export interface CostSummary {
  direct_cost: number;
  contingency_percent: number;
  contingency: number;
  design_survey_approval: number;
  total_low: number;
  total_medium: number;
  total_high: number;
  currency: string;
}

export interface LineItem {
  item_code: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  assumption: string;
  currency?: string;
}

export interface QuantityEstimate {
  id: number;
  design_scenario_id: number;
  concrete_m3: number;
  cement_bags: number;
  steel_kg: number;
  rebar_kg: number;
  excavation_m3: number;
  backfill_m3: number;
  formwork_sqm: number;
  asphalt_m3: number;
  pipe_length_m: number;
  pipe_diameter_mm: number;
  total_cost_estimate: number;
  line_items: LineItem[];
  created_at: string;
}

export interface JobStatus {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  result: Record<string, unknown> | null;
  error: string | null;
}

export interface GeneratedFileInfo {
  id: number;
  file_type: string;
  file_url: string;
  scenario_id: number | null;
  created_at: string;
}

export interface RateItem {
  id: number;
  region: string;
  item_code: string;
  item_name: string;
  unit: string;
  rate: number;
  currency: string;
}

export interface ProjectTemplate {
  id: number;
  project_type: string;
  name: string;
  default_parameters_json: Record<string, unknown>;
}

export interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
  provider: string;
}
