"""Build a conceptual GLB model from a geometry spec using trimesh.

Spec format (produced by design generators):
{"objects": [{"kind": "box"|"cylinder", "name", "layer", ...}], "frame": "local_meters"}

Coordinate convention: generators use Z-up local meters (X = along alignment,
Y = width, Z = height). glTF and Cesium expect Y-up, so the whole scene is
rotated -90° about X before export.
"""

import numpy as np
import trimesh

from app.services.design.geometry_utils import LAYER_COLORS

# Z-up (engineering) -> Y-up (glTF / Cesium)
_Z_UP_TO_Y_UP = trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0])


def _make_box(obj: dict) -> trimesh.Trimesh:
    mesh = trimesh.creation.box(extents=obj["size"])
    rot = obj.get("rotation_z_deg", 0.0)
    if rot:
        mesh.apply_transform(trimesh.transformations.rotation_matrix(np.radians(rot), [0, 0, 1]))
    mesh.apply_translation(obj["center"])
    return mesh


def _make_cylinder(obj: dict) -> trimesh.Trimesh:
    start = np.array(obj["start"], dtype=float)
    end = np.array(obj["end"], dtype=float)
    return trimesh.creation.cylinder(radius=obj["radius_m"], segment=np.vstack([start, end]), sections=24)


def generate_glb(geometry_spec: dict) -> bytes:
    scene = trimesh.Scene()
    for obj in geometry_spec.get("objects", []):
        try:
            mesh = _make_box(obj) if obj["kind"] == "box" else _make_cylinder(obj)
        except Exception:
            continue
        color = LAYER_COLORS.get(obj.get("layer", ""), (128, 128, 128, 255))
        mesh.visual = trimesh.visual.ColorVisuals(mesh, face_colors=np.tile(color, (len(mesh.faces), 1)))
        layer = obj.get("layer", "misc")
        scene.add_geometry(mesh, node_name=f"{layer}/{obj['name']}", geom_name=f"{layer}/{obj['name']}")
    if len(scene.geometry) == 0:
        scene.add_geometry(trimesh.creation.box(extents=[1, 1, 1]))
    scene.apply_transform(_Z_UP_TO_Y_UP)
    return scene.export(file_type="glb")
