"""Validação geométrica simples dos STL da caixa ESCOLTA.

Não depende de bibliotecas externas. Confere dimensões, triângulos degenerados
e se todas as arestas pertencem exatamente a duas faces (malha fechada), além
de rejeitar uma peça que contenha corpos desconectados no mesmo STL.
"""

from __future__ import annotations

import math
import struct
import sys
from collections import Counter
from pathlib import Path


Point = tuple[float, float, float]
Triangle = tuple[Point, Point, Point]


def read_triangles(path: Path) -> list[Triangle]:
    data = path.read_bytes()
    if data[:5].lower() == b"solid" and b"facet" in data[:1024]:
        vertices: list[Point] = []
        for raw_line in data.decode("ascii", errors="ignore").splitlines():
            parts = raw_line.strip().split()
            if len(parts) == 4 and parts[0] == "vertex":
                vertices.append(tuple(map(float, parts[1:4])))
        if len(vertices) % 3:
            raise ValueError(f"Quantidade inválida de vértices ASCII: {len(vertices)}")
        return [tuple(vertices[i : i + 3]) for i in range(0, len(vertices), 3)]

    if len(data) < 84:
        raise ValueError("Arquivo STL binário incompleto")
    count = struct.unpack_from("<I", data, 80)[0]
    expected_size = 84 + count * 50
    if len(data) != expected_size:
        raise ValueError(
            f"Tamanho binário inválido: esperado {expected_size}, recebido {len(data)}"
        )

    triangles: list[Triangle] = []
    offset = 84
    for _ in range(count):
        values = struct.unpack_from("<12fH", data, offset)
        triangles.append(
            (
                (values[3], values[4], values[5]),
                (values[6], values[7], values[8]),
                (values[9], values[10], values[11]),
            )
        )
        offset += 50
    return triangles


def canonical(point: Point) -> Point:
    return tuple(round(value, 6) for value in point)


def area2(triangle: Triangle) -> float:
    a, b, c = triangle
    ab = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    ac = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
    cross = (
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
    )
    return math.sqrt(sum(value * value for value in cross))


def signed_volume(triangle: Triangle) -> float:
    a, b, c = triangle
    return (
        a[0] * (b[1] * c[2] - b[2] * c[1])
        - a[1] * (b[0] * c[2] - b[2] * c[0])
        + a[2] * (b[0] * c[1] - b[1] * c[0])
    ) / 6.0


def validate(path: Path) -> bool:
    triangles = read_triangles(path)
    points = [point for triangle in triangles for point in triangle]
    minimum = tuple(min(point[axis] for point in points) for axis in range(3))
    maximum = tuple(max(point[axis] for point in points) for axis in range(3))
    size = tuple(maximum[axis] - minimum[axis] for axis in range(3))

    edges: Counter[tuple[Point, Point]] = Counter()
    edge_faces: dict[tuple[Point, Point], list[int]] = {}
    degenerate = 0
    degenerate_items: list[tuple[int, Triangle]] = []
    for face_index, triangle in enumerate(triangles):
        if area2(triangle) < 1e-9:
            degenerate += 1
            degenerate_items.append((face_index, triangle))
        vertices = [canonical(point) for point in triangle]
        for index in range(3):
            edge = tuple(sorted((vertices[index], vertices[(index + 1) % 3])))
            edges[edge] += 1
            edge_faces.setdefault(edge, []).append(face_index)

    parent = list(range(len(triangles)))

    def find(item: int) -> int:
        while parent[item] != item:
            parent[item] = parent[parent[item]]
            item = parent[item]
        return item

    def union(first: int, second: int) -> None:
        first_root = find(first)
        second_root = find(second)
        if first_root != second_root:
            parent[second_root] = first_root

    for faces in edge_faces.values():
        for face_index in faces[1:]:
            union(faces[0], face_index)

    connected_shells = len({find(index) for index in range(len(triangles))})

    invalid_edge_items = [
        (edge, incidence) for edge, incidence in edges.items() if incidence != 2
    ]
    invalid_edges = len(invalid_edge_items)
    volume = abs(sum(signed_volume(triangle) for triangle in triangles))
    valid = (
        bool(triangles)
        and not degenerate
        and not invalid_edges
        and connected_shells == 1
        and volume > 0
    )

    print(path.name)
    print(f"  triângulos: {len(triangles)}")
    print(f"  limites: {minimum} até {maximum}")
    print(f"  dimensões: {tuple(round(value, 3) for value in size)} mm")
    print(f"  volume: {volume:.2f} mm³")
    print(f"  triângulos degenerados: {degenerate}")
    for face_index, triangle in degenerate_items[:5]:
        print(f"    face {face_index}: {tuple(canonical(p) for p in triangle)}")
    print(f"  arestas inválidas: {invalid_edges}")
    print(f"  corpos desconectados: {connected_shells}")
    for edge, incidence in invalid_edge_items[:5]:
        print(f"    {edge} aparece em {incidence} face(s)")
    print(f"  malha fechada: {'SIM' if valid else 'NÃO'}")
    return valid


def main() -> int:
    paths = [Path(argument) for argument in sys.argv[1:]]
    if not paths:
        case_dir = Path(__file__).resolve().parents[1]
        print_dir = case_dir / "PARA_IMPRIMIR_AGORA"
        paths = [
            print_dir / "01_base_v2_6.stl",
            print_dir / "02_tampa_v2_8.stl",
            print_dir / "03_botao_vermelho_v2_7.stl",
            print_dir / "04_trava_C_v2_5.stl",
        ]
    return 0 if all(validate(path) for path in paths) else 1


if __name__ == "__main__":
    raise SystemExit(main())
