"""Road segment conceptual generator."""

from app.services.calculations import earthwork
from app.services.design.geometry_utils import box


def generate(params: dict, design: dict) -> dict:
    geom = design.get("geometry", {})
    length = float(geom.get("length_m") or params.get("length_m", 1000))
    width = float(geom.get("road_width_m") or params.get("road_width_m", 7.5))
    lanes = int(params.get("lanes", 2))
    asphalt_thk = float(params.get("asphalt_thickness_mm", 80)) / 1000
    base_thk = float(params.get("base_thickness_mm", 250)) / 1000
    shoulder_w = float(params.get("shoulder_width_m", 1.5))

    strip_depth = asphalt_thk + base_thk + 0.15  # formation preparation
    asphalt_vol = length * width * asphalt_thk
    base_vol = length * (width + 2 * shoulder_w) * base_thk
    excavation = earthwork.rectangular_excavation_m3(length, width + 2 * shoulder_w, strip_depth)

    quantities = {
        "concrete_m3": round(length * 0.12, 1),  # kerbs and side drains allowance
        "cement_bags": round(length * 0.12 * 7.0),
        "steel_kg": round(length * 0.12 * 30),
        "rebar_kg": round(length * 0.12 * 30),
        "excavation_m3": round(excavation, 1),
        "backfill_m3": 0,
        "formwork_sqm": round(length * 0.5, 1),
        "asphalt_m3": round(asphalt_vol, 1),
        "pipe_length_m": 0,
        "pipe_diameter_mm": 0,
    }
    boq_inputs = [
        {"item_code": "EXC-SOIL", "item_name": "Formation excavation/stripping", "category": "earthwork",
         "quantity": quantities["excavation_m3"], "unit": "m3", "assumption": f"{round(strip_depth,2)}m formation depth"},
        {"item_code": "ROAD-BASE", "item_name": "Granular base/WMM", "category": "road",
         "quantity": round(base_vol, 1), "unit": "m3", "assumption": f"{int(base_thk*1000)}mm base"},
        {"item_code": "ASPHALT", "item_name": "Bituminous surfacing", "category": "road",
         "quantity": quantities["asphalt_m3"], "unit": "m3", "assumption": f"{int(asphalt_thk*1000)}mm asphalt, {lanes} lanes"},
        {"item_code": "CONC-M25", "item_name": "Kerbs and drains concrete", "category": "concrete",
         "quantity": quantities["concrete_m3"], "unit": "m3", "assumption": "0.12 m3 per running meter allowance"},
    ]

    objects = [
        box("excavation", "excavation", (0, 0, -strip_depth / 2), (length, width + 2 * shoulder_w, strip_depth)),
        box("base_course", "foundation", (0, 0, -asphalt_thk - base_thk / 2), (length, width + 2 * shoulder_w, base_thk)),
        box("pavement", "asphalt", (0, 0, -asphalt_thk / 2), (length, width, asphalt_thk)),
        box("shoulder_left", "shoulder", (0, width / 2 + shoulder_w / 2, -asphalt_thk / 2), (length, shoulder_w, asphalt_thk)),
        box("shoulder_right", "shoulder", (0, -width / 2 - shoulder_w / 2, -asphalt_thk / 2), (length, shoulder_w, asphalt_thk)),
        box("drain_left", "pipe_drain", (0, width / 2 + shoulder_w + 0.3, -0.3), (length, 0.6, 0.6)),
        box("drain_right", "pipe_drain", (0, -width / 2 - shoulder_w - 0.3, -0.3), (length, 0.6, 0.6)),
    ]
    # Lane markings on top of pavement
    for i in range(1, lanes):
        y = -width / 2 + i * (width / lanes)
        objects.append(box(f"lane_marking_{i}", "road_marking", (0, y, 0.005), (length, 0.15, 0.01)))

    return {
        "quantities": quantities,
        "boq_inputs": boq_inputs,
        "geometry_spec": {"objects": objects, "frame": "local_meters", "length_m": length},
        "timeline_driver": ("length_m", length),
        "derived": {"base_volume_m3": round(base_vol, 1), "lanes": lanes},
    }
