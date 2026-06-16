"""Shared project type and unit catalog for API validation and AI pipelines."""

PROJECT_TYPES = frozenset({
    "flyover",
    "building",
    "pipeline",
    "road",
    "bridge",
    "interchange",
    "railway",
    "tunnel",
    "dam",
    "substation",
    "retaining_wall",
    "culvert",
    "wastewater",
    "solar_farm",
})

UNIT_OPTIONS = frozenset({
    "metric",
    "metric_mt",
    "si",
    "imperial",
    "ft_in",
    "us_customary",
    "indian",
})

# Maps extended types to existing design generator families.
TYPE_FAMILY: dict[str, str] = {
    "flyover": "flyover",
    "bridge": "flyover",
    "interchange": "flyover",
    "building": "building",
    "dam": "building",
    "substation": "building",
    "wastewater": "building",
    "solar_farm": "building",
    "pipeline": "pipeline",
    "culvert": "pipeline",
    "road": "road",
    "railway": "road",
    "tunnel": "road",
    "retaining_wall": "road",
}

ALIGNMENT_TYPES = frozenset({
    "flyover",
    "bridge",
    "interchange",
    "pipeline",
    "culvert",
    "road",
    "railway",
    "tunnel",
    "retaining_wall",
})


def project_type_family(project_type: str) -> str:
    return TYPE_FAMILY.get(project_type, project_type)
