"""Ajuste fino com as alturas efetivas medidas pelo PowerPoint."""
from pathlib import Path
import json
from pptx import Presentation
from pptx.util import Pt

ROOT = Path(__file__).resolve().parent / "impressao"
STEM = "Banner_Escolta_CICTED_CORRIGIDO_PROFESSOR"
path = ROOT / (STEM + ".pptx")
prs = Presentation(path)
shapes = list(prs.slides[0].shapes)
bounds = json.loads((ROOT / ("auditoria_textos_" + STEM + ".json")).read_text(encoding="utf-8-sig"))
by_name = {item["name"]: item for item in bounds}
assert not any(item["overflow"] for item in bounds)
header_bottom = max(by_name[s.name]["textBottom"] for s in shapes[1:5])
top = by_name[shapes[5].name]["textTop"]
target = prs.slide_height / 12700 - (top - header_bottom)
references_delta = Pt(target - by_name[shapes[69].name]["textBottom"])
figures_delta = Pt(target - by_name[shapes[52].name]["textBottom"])
for shape in shapes[68:70]:
    shape.top += references_delta
for shape in shapes[42:53]:
    shape.top += figures_delta

# Verificar a distância real entre cada texto corrido e a seção seguinte.
for body_index, heading_index in ((7, 8), (9, 10), (67, 68)):
    body = by_name[shapes[body_index].name]
    gap = shapes[heading_index].top / 12700 - body["textBottom"]
    assert gap >= 18, (body_index, heading_index, gap)
all_text = "\n".join(s.text for s in shapes if s.has_text_frame)
assert "aproximadamente 11 horas" in all_text.lower()
assert not any(s._element.xpath('.//a:highlight') for s in shapes)
assert len({s.shape_id for s in shapes}) == len(shapes)
for s in shapes:
    assert 0 <= s.top <= s.top + s.height <= prs.slide_height
    assert 0 <= s.left <= s.left + s.width <= prs.slide_width
prs.save(path)
print(json.dumps({"lower_baseline_pt": target,
                  "upper_and_lower_gap_cm": (top - header_bottom) / 72 * 2.54,
                  "references_shift_pt": references_delta / 12700,
                  "figure3_shift_pt": figures_delta / 12700}, ensure_ascii=False))
