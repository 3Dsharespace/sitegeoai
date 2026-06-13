"""Flyover conceptual generator: quantities + 3D geometry spec."""

import math

from app.services.calculations import concrete, earthwork, steel
from app.services.design.geometry_utils import box

DECK_THICKNESS_M = 0.6
PIER_CROSS_SECTION_M2 = 3.2          # ~1.6m x 2.0m rectangular pier
PIER_CAP_VOLUME_M3 = 12.0
FOUNDATION_VOLUME_PER_PIER_M3 = 45.0  # assumed pile cap / open foundation
FOUNDATION_PLAN_M = (6.0, 6.0)


def generate(params: dict, design: dict) -> dict:
    geom = design.get("geometry", {})
    length = float(geom.get("length_m") or params.get("length_m", 500))
    deck_width = float(geom.get("deck_width_m") or params.get("deck_width_m", 16))
    clearance = float(geom.get("clearance_m") or params.get("clearance_m", 5.5))
    pier_spacing = float(geom.get("pier_spacing_m") or params.get("pier_spacing_m", 30))
    foundation_depth = float(geom.get("foundation_depth_m_assumed") or params.get("foundation_depth_m_assumed", 8))
    asphalt_thk = float(design.get("materials", {}).get("asphalt_thickness_mm", 80)) / 1000
    grade = design.get("materials", {}).get("concrete_grade", "M35").split()[0]

    pier_count = int(geom.get("pier_count") or max(2, math.floor(length / pier_spacing) + 1))
    pier_height = clearance + 1.0  # cap depth allowance

    conc = concrete.flyover_concrete(
        length, deck_width, DECK_THICKNESS_M, pier_count,
        PIER_CROSS_SECTION_M2, pier_height, PIER_CAP_VOLUME_M3,
        FOUNDATION_VOLUME_PER_PIER_M3,
    )
    excavation = earthwork.rectangular_excavation_m3(
        FOUNDATION_PLAN_M[0], FOUNDATION_PLAN_M[1], foundation_depth
    ) * pier_count
    steel_total = steel.steel_kg(conc["total_m3"], "flyover")
    cement = concrete.cement_bags(conc["total_m3"], grade)
    formwork = concrete.formwork_sqm(conc["total_m3"])
    asphalt = length * deck_width * asphalt_thk

    quantities = {
        "concrete_m3": conc["total_m3"],
        "cement_bags": cement,
        "steel_kg": steel_total,
        "rebar_kg": steel_total,
        "excavation_m3": round(excavation, 1),
        "backfill_m3": round(excavation * 0.6, 1),
        "formwork_sqm": formwork,
        "asphalt_m3": round(asphalt, 1),
        "pipe_length_m": 0,
        "pipe_diameter_mm": 0,
    }
    boq_inputs = [
        {"item_code": "EXC-SOIL", "item_name": "Foundation excavation", "category": "earthwork",
         "quantity": quantities["excavation_m3"], "unit": "m3", "assumption": f"Assumed {foundation_depth}m deep open/pile foundation per pier"},
        {"item_code": "CONC-M35", "item_name": f"Structural concrete {grade}", "category": "concrete",
         "quantity": conc["total_m3"], "unit": "m3", "assumption": "Deck/pier/cap/foundation massing approximation"},
        {"item_code": "STEEL-FE500", "item_name": "Reinforcement steel", "category": "steel",
         "quantity": steel_total, "unit": "kg", "assumption": "160 kg/m3 preliminary factor"},
        {"item_code": "FORMWORK", "item_name": "Formwork", "category": "concrete",
         "quantity": formwork, "unit": "sqm", "assumption": "4 sqm per m3 factor"},
        {"item_code": "ASPHALT", "item_name": "Wearing coat asphalt", "category": "road",
         "quantity": quantities["asphalt_m3"], "unit": "m3", "assumption": f"{int(asphalt_thk*1000)}mm thickness"},
        {"item_code": "BARRIER", "item_name": "Crash barriers (both sides)", "category": "safety",
         "quantity": length * 2, "unit": "m", "assumption": "Both deck edges"},
    ]

    # --- 3D geometry spec (local meters, X along alignment) ---
    deck_top = clearance + DECK_THICKNESS_M
    objects = [
        box("deck_slab", "deck", (0, 0, clearance + DECK_THICKNESS_M / 2), (length, deck_width, DECK_THICKNESS_M)),
        box("road_surface", "asphalt", (0, 0, deck_top + asphalt_thk / 2), (length, deck_width - 1.0, asphalt_thk)),
        box("barrier_left", "barrier", (0, deck_width / 2 - 0.25, deck_top + 0.55), (length, 0.5, 1.1)),
        box("barrier_right", "barrier", (0, -deck_width / 2 + 0.25, deck_top + 0.55), (length, 0.5, 1.1)),
    ]
    start_x = -length / 2
    for i in range(pier_count):
        x = start_x + i * (length / max(pier_count - 1, 1))
        objects.append(box(f"pier_{i+1}", "piers", (x, 0, clearance / 2), (1.6, 2.0, clearance)))
        objects.append(box(f"pier_cap_{i+1}", "pier_caps", (x, 0, clearance + 0.0), (2.4, deck_width * 0.8, 1.0)))
        objects.append(box(f"foundation_{i+1}", "foundation", (x, 0, -foundation_depth / 2), (*FOUNDATION_PLAN_M, foundation_depth)))
        objects.append(box(f"excavation_{i+1}", "excavation", (x, 0, -foundation_depth / 2), (FOUNDATION_PLAN_M[0] + 1, FOUNDATION_PLAN_M[1] + 1, foundation_depth)))

    return {
        "quantities": quantities,
        "boq_inputs": boq_inputs,
        "geometry_spec": {"objects": objects, "frame": "local_meters", "length_m": length},
        "timeline_driver": ("length_m", length),
        "derived": {"pier_count": pier_count, "pier_height_m": pier_height, "concrete_breakdown": conc},
    }
