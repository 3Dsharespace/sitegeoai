"""GCP Helmert adjustment and validation suite."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING, Any

import numpy as np

from app.db.models import AccuracyReport, EngineeringLayer, GroundControlPoint, SurveyDataset
from app.services.survey.constants import (
    GCP_MIN_FOR_SURVEY,
    SURVEY_DEM_MAX_PIXEL_M,
    SURVEY_RMSE_H_MAX_M,
    SURVEY_RMSE_V_MAX_M,
    TIER_RANK,
)
from app.services.survey.project_helpers import ensure_project_crs

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.db.models import Project


def compute_gcp_adjustment(project: Project, gcps: list[GroundControlPoint]) -> dict[str, Any]:
    """2D translation from survey coords vs map-derived positions."""
    epsg = ensure_project_crs(project)
    residuals: list[dict] = []
    de_list: list[float] = []
    dn_list: list[float] = []
    for g in gcps:
        if g.easting_m is None or g.northing_m is None:
            continue
        map_e = g.map_derived_e_m if g.map_derived_e_m is not None else g.easting_m
        map_n = g.map_derived_n_m if g.map_derived_n_m is not None else g.northing_m
        de = g.easting_m - map_e
        dn = g.northing_m - map_n
        de_list.append(de)
        dn_list.append(dn)
        residuals.append({"name": g.name, "de_m": de, "dn_m": dn})
    if not de_list:
        return {
            "epsg": epsg,
            "count": 0,
            "offset_e_m": 0.0,
            "offset_n_m": 0.0,
            "horizontal_rmse_m": None,
            "residuals": [],
        }
    offset_e = float(np.mean(de_list))
    offset_n = float(np.mean(dn_list))
    h_rmse = math.sqrt(float(np.mean([d**2 for d in de_list]))) if de_list else None
    v_errors = [
        (g.orthometric_h_m or g.ellipsoid_h_m or 0) - (g.ellipsoid_h_m or 0)
        for g in gcps
        if g.orthometric_h_m is not None and g.ellipsoid_h_m is not None
    ]
    v_rmse = math.sqrt(float(np.mean([e**2 for e in v_errors]))) if v_errors else None
    return {
        "epsg": epsg,
        "count": len(de_list),
        "offset_e_m": offset_e,
        "offset_n_m": offset_n,
        "offset_h_m": 0.0,
        "horizontal_rmse_m": h_rmse,
        "vertical_rmse_m": v_rmse,
        "residuals": residuals,
    }


def run_validation(db: Session, project: Project) -> dict[str, Any]:
    epsg = ensure_project_crs(project)
    gcps = db.query(GroundControlPoint).filter(GroundControlPoint.project_id == project.id).all()
    datasets = db.query(SurveyDataset).filter(SurveyDataset.project_id == project.id).all()
    layers = db.query(EngineeringLayer).filter(EngineeringLayer.project_id == project.id).all()

    checks: list[dict] = []
    passed = True
    suggested_tier = "visual"

    # GCP check
    gcp_ok = len(gcps) >= GCP_MIN_FOR_SURVEY
    adj = compute_gcp_adjustment(project, gcps)
    h_rmse = adj.get("horizontal_rmse_m")
    v_rmse = adj.get("vertical_rmse_m")
    gcp_rmse_ok = h_rmse is not None and h_rmse <= SURVEY_RMSE_H_MAX_M
    checks.append({
        "id": "gcp_count",
        "label": "Ground control points",
        "passed": gcp_ok,
        "detail": f"{len(gcps)} GCPs (minimum {GCP_MIN_FOR_SURVEY} for survey-grade)",
    })
    if not gcp_ok:
        passed = False
    checks.append({
        "id": "gcp_rmse",
        "label": "GCP horizontal RMSE",
        "passed": gcp_rmse_ok or h_rmse is None,
        "detail": f"H RMSE: {h_rmse:.4f} m (max {SURVEY_RMSE_H_MAX_M} m)" if h_rmse else "Not computed",
    })

    # CRS consistency
    crs_mismatch = [
        d.id for d in datasets if d.crs_epsg and d.crs_epsg != epsg
    ] + [l.id for l in layers if l.crs_epsg and l.crs_epsg != epsg]
    crs_ok = len(crs_mismatch) == 0
    checks.append({
        "id": "crs_consistency",
        "label": "CRS consistency",
        "passed": crs_ok,
        "detail": f"Project EPSG:{epsg}; mismatched layer/dataset ids: {crs_mismatch or 'none'}",
    })
    if not crs_ok:
        passed = False

    # DEM resolution
    dems = [d for d in datasets if d.kind == "dem"]
    dem_ok = any(
        d.pixel_size_m is not None and d.pixel_size_m <= SURVEY_DEM_MAX_PIXEL_M for d in dems
    )
    best_pixel = min((d.pixel_size_m for d in dems if d.pixel_size_m), default=None)
    checks.append({
        "id": "dem_resolution",
        "label": "DEM resolution",
        "passed": dem_ok or not dems,
        "detail": f"Best pixel size: {best_pixel} m (need ≤ {SURVEY_DEM_MAX_PIXEL_M} m for cut/fill)",
    })

    # Cut/fill uncertainty estimate
    slope_pct = 5.0  # placeholder if no terrain analysis
    vert_unc = v_rmse or (dems[0].rmse_v_m if dems and dems[0].rmse_v_m else None)
    volume_unc_pct = (vert_unc / max(best_pixel or 1.0, 0.1)) * slope_pct if vert_unc else None
    checks.append({
        "id": "cut_fill_uncertainty",
        "label": "Cut/fill volume uncertainty (estimate)",
        "passed": True,
        "detail": f"~{volume_unc_pct:.1f}% band" if volume_unc_pct else "Insufficient vertical RMSE metadata",
    })

    has_vectors = len(layers) > 0
    has_dem = len(dems) > 0

    if has_vectors and crs_ok:
        suggested_tier = "gis_grade"
    if gcp_ok and has_dem and gcp_rmse_ok:
        suggested_tier = "survey_grade"
    if passed and suggested_tier == "survey_grade" and dem_ok and gcp_rmse_ok:
        suggested_tier = "engineering_ready"

    if TIER_RANK[suggested_tier] > TIER_RANK.get(project.accuracy_tier or "visual", 0):
        project.accuracy_tier = suggested_tier

    report = {
        "project_id": project.id,
        "engineering_crs_epsg": epsg,
        "tier_result": suggested_tier,
        "passed": passed and suggested_tier in ("survey_grade", "engineering_ready"),
        "checks": checks,
        "gcp_adjustment": adj,
        "layer_count": len(layers),
        "dataset_count": len(datasets),
    }

    db.add(
        AccuracyReport(
            project_id=project.id,
            tier_result=suggested_tier,
            passed=report["passed"],
            report_json=report,
        )
    )
    db.flush()
    return report


def layer_metadata_badge(layer: EngineeringLayer) -> dict:
    return {
        "source": layer.source,
        "captureDate": layer.capture_date.isoformat() if layer.capture_date else None,
        "crsEpsg": layer.crs_epsg,
        "pixelSizeM": layer.pixel_size_m,
        "rmseHM": layer.rmse_h_m,
        "rmseVM": layer.rmse_v_m,
        "tier": layer.accuracy_tier,
    }
