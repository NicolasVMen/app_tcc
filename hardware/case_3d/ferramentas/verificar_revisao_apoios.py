"""Exporta a tampa corrigida e verifica que base e prolongador nao mudaram."""
from pathlib import Path
import subprocess
import sys
import json

from validate_stl import read_triangles, validate, canonical

CASE = Path(__file__).resolve().parents[1]
WORKSPACE = CASE.parents[1]
CLI = WORKSPACE / "local_tools/OpenSCAD-portable/openscad-2021.01/openscad.com"
SOURCE = CASE / "escolta_case_v2.scad"
MESHES = CASE / "verificacoes/malhas"
IMAGES = CASE / "verificacoes/imagens"
DESTINATION = CASE / "PARA_IMPRIMIR_AGORA/02_tampa_v2_8.stl"


def run(output, source, **definitions):
    args = [str(CLI), "-o", str(output)]
    for name, value in definitions.items():
        args.extend(["-D", name + "=" + json.dumps(value)])
    if output.suffix == ".png":
        args.extend(["--imgsize=1400,1100", "--camera=47,35,-5,135,0,25,45",
                     "--projection=o", "--colorscheme=Tomorrow"])
    args.append(str(source))
    result = subprocess.run(args, capture_output=True, text=True, errors="replace")
    log = result.stdout + result.stderr
    print(log)
    if "ERROR:" in log or "WARNING:" in log:
        raise RuntimeError(log)
    empty = "Current top level object is empty" in log
    if result.returncode and not empty:
        raise RuntimeError(log)
    return empty


def signature(path):
    return sorted(tuple(sorted(canonical(p) for p in t)) for t in read_triangles(path))


def export_and_check():
    assert CLI.is_file()
    assert MESHES.is_dir() and IMAGES.is_dir()
    assert not run(DESTINATION, SOURCE, part="lid")
    assert validate(DESTINATION)
    for part, before in (("base", "01_base_v2_6.stl"), ("button_cap", "03_botao_vermelho_v2_7.stl"),
                         ("button_retainer", "04_trava_C_v2_5.stl")):
        regenerated = MESHES / ("regressao_v2_8_" + part + ".stl")
        assert not run(regenerated, SOURCE, part=part)
        assert signature(regenerated) == signature(CASE / "PARA_IMPRIMIR_AGORA" / before), part
        print("GEOMETRIA PRESERVADA: " + before)
    assert run(MESHES / "interferencia_fechamento_v2_8.stl", SOURCE, part="closure_interference")
    assert run(MESHES / "interferencia_apoio_botao_v2_8.stl",
               CASE / "verificacoes/scripts/verificar_apoios_v2_8.scad",
               part="validation", check="support_contact")
    subprocess.run([sys.executable, str(CASE / "verificacoes/scripts/auditar_apoio_botao.py")], check=True)
    print("APROVADO NO CAD: tampa conectada, sem colisao no fechamento ou no apoio do botao; furo e folga preservados.")


if __name__ == "__main__":
    if "--preview" in sys.argv:
        assert not run(IMAGES / "apoios_botao_v2_8.png",
                       CASE / "verificacoes/scripts/verificar_apoios_v2_8.scad",
                       part="validation", check="support_view")
    else:
        export_and_check()
