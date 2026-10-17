"""Regenera cópias de auditoria; nunca sobrescreve os STL entregáveis."""
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
CASE = ROOT / 'hardware/case_3d'
sys.path.insert(0, str(CASE / 'ferramentas'))
from validate_stl import read_triangles, canonical, validate

def signature(file):
    return sorted(tuple(sorted(canonical(p) for p in triangle)) for triangle in read_triangles(file))

def main():
    cli = ROOT / 'local_tools/OpenSCAD-portable/openscad-2021.01/openscad.com'
    output = ROOT / '.expo/auditoria-cad'
    output.mkdir(parents=True, exist_ok=True)
    results = []
    for part, filename in [('base', '01_base_v2_6.stl'), ('lid', '02_tampa_v2_8.stl'),
                           ('button_cap', '03_botao_vermelho_v2_7.stl'), ('button_retainer', '04_trava_C_v2_5.stl')]:
        generated = output / filename
        run = subprocess.run([str(cli), '-o', str(generated), '-D', 'part=' + json.dumps(part),
                              str(CASE / 'escolta_case_v2.scad')], capture_output=True, text=True, timeout=180)
        if run.returncode or 'ERROR:' in run.stderr or 'WARNING:' in run.stderr:
            raise RuntimeError(run.stdout + run.stderr)
        log = StringIO()
        with redirect_stdout(log):
            valid = validate(generated)
        identical = signature(generated) == signature(CASE / 'PARA_IMPRIMIR_AGORA' / filename)
        results.append({'part': part, 'filename': filename, 'valid_mesh': valid,
                        'matches_current_export': identical, 'log': log.getvalue()})
    interference = output / 'closure_interference.stl'
    run = subprocess.run([str(cli), '-o', str(interference), '-D', 'part="closure_interference"',
                          str(CASE / 'escolta_case_v2.scad')], capture_output=True, text=True, timeout=180)
    empty = 'Current top level object is empty' in (run.stdout + run.stderr)
    report = {'parts': results, 'closure_interference_empty': empty,
              'limits': 'Geometria digital, não certificação de impressão ou montagem física'}
    target = ROOT / 'docs/auditoria'
    target.mkdir(parents=True, exist_ok=True)
    (target / 'cad.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if empty and all(r['valid_mesh'] and r['matches_current_export'] for r in results) else 1

if __name__ == '__main__':
    raise SystemExit(main())
