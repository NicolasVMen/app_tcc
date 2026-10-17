"""Inspeção não destrutiva do STL entregue; não altera o modelo da caixa."""
from pathlib import Path
import sys
import math
import json

CASE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(CASE / "ferramentas"))
from validate_stl import read_triangles


def vertical_intersections(triangles, x, y):
    heights = set()
    for a, b, c in triangles:
        denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(denominator) < 1e-10:
            continue
        first = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / denominator
        second = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / denominator
        third = 1 - first - second
        if min(first, second, third) >= -1e-7:
            heights.add(round(first * a[2] + second * b[2] + third * c[2], 5))
    return sorted(heights)


def main():
    lid = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else CASE / "PARA_IMPRIMIR_AGORA/02_tampa_v2_8.stl"
    cap = CASE / "PARA_IMPRIMIR_AGORA/03_botao_vermelho_v2_7.stl"
    triangles = read_triangles(lid)
    left = vertical_intersections(triangles, 44.4, 11)
    right = vertical_intersections(triangles, 49.6, 11)
    center = vertical_intersections(triangles, 47, 11)
    expected = [0, 2.4, 11, 12.8] if "v2_8" in lid.name else [0, 2.4, 10.1, 11]
    assert left == right == expected, (left, right)
    assert center == [], center
    # Coordenadas da tampa orientada para impressão: Y invertido, Z=2,4-z.
    hole_points = [p for t in triangles for p in t
                   if abs(math.hypot(p[0] - 47, p[1] - 11) - 2.4) < .0001]
    assert len(hole_points) >= 112
    hole_diameters = [max(p[i] for p in hole_points) - min(p[i] for p in hole_points) for i in (0, 1)]
    cap_points = [p for t in read_triangles(cap) for p in t if p[2] > 2.21]
    stem_max_diameter = 2 * max(math.hypot(p[0], p[1]) for p in cap_points)
    body_height, actuator_height, top_gap = 4, 1, 4.6
    support_thickness = left[-1] - left[-2]
    intended_body_bottom = -(body_height + top_gap)
    actual_support_top = 2.4 - left[-2]
    cap_tip = -top_gap + actuator_height + .5
    intended_actuator_top = intended_body_bottom + body_height + actuator_height
    seated_actuator_top = actual_support_top + body_height + actuator_height
    print(json.dumps({
        "lid": str(lid), "cap": str(cap),
        "hole_diameter_xy_mm": hole_diameters,
        "max_shaft_diameter_mm": round(stem_max_diameter, 5),
        "nominal_radial_clearance_mm": .3,
        "support_faces_in_print_coordinates_mm": {"left": left, "right": right},
        "support_thickness_mm": support_thickness,
        "central_bottom_opening_mm": 6.4 - 2 * 1.2,
        "body_bottom_in_visualization_mm": intended_body_bottom,
        "actual_support_top_from_inside_lid_mm": round(actual_support_top, 5),
        "button_support_overlap_in_visualization_mm": round(actual_support_top - intended_body_bottom, 5),
        "gap_if_button_bottom_follows_visualization_mm": round(cap_tip - intended_actuator_top, 5),
        "gap_if_button_is_seated_on_actual_support_mm": round(cap_tip - seated_actuator_top, 5),
        "interpretation": "A folga resulta da face superior real dos apoios, não da face inferior. Valores positivos são folga; negativos são interferência. A medição do CAD não substitui o teste impresso com pernas e soldas reais.",
    }, ensure_ascii=False, indent=2))
    if "v2_8" in lid.name:
        assert abs(actual_support_top - intended_body_bottom) < .0001
        assert abs(cap_tip - seated_actuator_top - .5) < .0001
        assert support_thickness >= 1.7999


if __name__ == "__main__":
    main()
