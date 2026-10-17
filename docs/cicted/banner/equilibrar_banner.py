"""Equilibra o respiro vertical, preservando o layout e conteúdo já aprovados."""
from pathlib import Path
import json

from pptx import Presentation
from pptx.util import Pt


ROOT = Path(__file__).resolve().parent / "impressao"
SOURCE = "Banner_Escolta_CICTED_ALINHADO"
DEST = "Banner_Escolta_CICTED_EQUILIBRADO"


def main():
    presentation = Presentation(ROOT / (SOURCE + ".pptx"))
    shapes = list(presentation.slides[0].shapes)
    assert len(shapes) == 95
    assert shapes[5].text.startswith("ESCOLTA UNITAU:")
    bounds = json.loads((ROOT / ("auditoria_textos_" + SOURCE + ".json"))
                        .read_text(encoding="utf-8-sig"))
    by_name = {item["name"]: item for item in bounds}
    header_bottom = max(by_name[shape.name]["textBottom"] for shape in shapes[1:5])
    body_text = [by_name[shape.name] for shape in shapes[5:]
                 if shape.has_text_frame and shape.text.strip()]
    body_top = min(item["textTop"] for item in body_text)
    body_bottom = max(item["textBottom"] for item in body_text)
    page_bottom = presentation.slide_height / 12700
    upper_gap = body_top - header_bottom
    lower_gap = page_bottom - body_bottom
    shift = round(Pt((upper_gap - lower_gap) / 2))
    before = [(s.left, s.top, s.width, s.height,
               s.text if s.has_text_frame else None) for s in shapes]
    picture_indices = (44, 47, 50, 55, 57, 60, 63)
    pictures = {index: shapes[index].image.blob for index in picture_indices}
    for shape in shapes[5:]:
        shape.top -= shift
    for index, (shape, previous) in enumerate(zip(shapes, before)):
        assert (shape.left, shape.width, shape.height) == (previous[0], previous[2], previous[3])
        assert shape.top == previous[1] - (shift if index >= 5 else 0)
        assert (shape.text if shape.has_text_frame else None) == previous[4]
        assert shape.top >= 0 and shape.top + shape.height <= presentation.slide_height
        if index in pictures:
            assert shape.image.blob == pictures[index]
    presentation.save(ROOT / (DEST + ".pptx"))
    actual_shift = shift / 12700
    report = {
        "body_shift_up_cm": actual_shift / 72 * 2.54,
        "upper_gap_cm": (upper_gap - actual_shift) / 72 * 2.54,
        "lower_gap_cm": (lower_gap + actual_shift) / 72 * 2.54,
        "measurement": "Limites efetivos do texto: identificação/conteúdo e conteúdo/borda inferior",
        "header_unchanged": True,
        "content_and_image_bytes_preserved": True,
        "paragraph_alignment_unchanged": True,
    }
    (ROOT / "equilibrio_vertical.json").write_text(json.dumps(report, ensure_ascii=False, indent=2),
                                                  encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    print(ROOT / (DEST + ".pptx"))


if __name__ == "__main__":
    main()
