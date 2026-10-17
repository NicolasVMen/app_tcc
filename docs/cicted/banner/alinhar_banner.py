"""Ajusta a grade do banner atual, sem reconstruir ou substituir seu conteúdo."""
from pathlib import Path
import json

from pptx import Presentation
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parent / "impressao"
SOURCE = ROOT / "Banner_Escolta_CICTED_FINAL.pptx"
DEST = ROOT / "Banner_Escolta_CICTED_ALINHADO.pptx"


def xw(shape, left, width):
    shape.left = Inches(left)
    shape.width = Inches(width)


def main():
    presentation = Presentation(SOURCE)
    shapes = list(presentation.slides[0].shapes)
    assert len(shapes) == 95
    assert shapes[70].text.startswith("Figura 3")
    assert shapes[69].text.startswith("BLUETOOTH SIG.")
    content_before = [s.text if s.has_text_frame else None for s in shapes]

    # Grade simétrica: duas colunas com a mesma largura e margens externas iguais.
    left = 1.91
    column = 15.10
    right = presentation.slide_width / 914400 - left - column
    right_shift = right - shapes[66].left / 914400
    for shape in shapes[42:70]:
        shape.left += Inches(right_shift)
    for shape in shapes[5:11]:
        shape.width = Inches(column)
    shapes[41].width = Inches(column)
    ratio = column / 14.98
    for shape in shapes[11:41]:
        xw(shape, left + (shape.left / 914400 - left) * ratio,
           shape.width / 914400 * ratio)
    # Títulos das figuras em um mesmo tamanho; começo superior na mesma linha.
    shapes[42].top = shapes[5].top
    for paragraph in shapes[70].text_frame.paragraphs:
        for run in paragraph.runs:
            run.font.size = Pt(28)
    xw(shapes[70], left, column)
    xw(shapes[94], left, column)

    # Diagrama com bordas alinhadas à tabela e dois blocos de tamanho idêntico.
    box_width = 6.35
    second_x = left + column - box_width
    xw(shapes[71], left, box_width)
    xw(shapes[75], second_x, box_width)
    for index in (72, 73):
        xw(shapes[index], left + .33, box_width - .66)
    for index in (76, 77):
        xw(shapes[index], second_x + .33, box_width - .66)
    xw(shapes[74], left + box_width, column - 2 * box_width)
    xw(shapes[78], left, column)
    for start in (79, 84, 89):
        xw(shapes[start], left, column)
        xw(shapes[start + 1], left, 4.15)
        xw(shapes[start + 2], left + .25, 3.65)
        xw(shapes[start + 3], left + 4.26, .65)
        xw(shapes[start + 4], left + 4.98, column - 5.34)

    # Deslocar o conjunto inteiro; a exportação fará o ajuste fino da linha final
    # com a posição efetiva do texto das referências medida pelo PowerPoint.
    delta = 1.04
    for shape in shapes[70:95]:
        shape.top += Inches(delta)

    assert content_before == [s.text if s.has_text_frame else None for s in shapes]
    for shape in shapes[5:]:
        assert shape.left >= 0 and shape.top >= 0
        assert shape.left + shape.width <= presentation.slide_width
        assert shape.top + shape.height <= presentation.slide_height
    presentation.save(DEST)
    (ROOT / "grade_alinhamento.json").write_text(json.dumps({
        "margin_cm": left * 2.54, "column_width_cm": column * 2.54,
        "gutter_cm": (right - left - column) * 2.54,
        "initial_diagram_shift_cm": delta * 2.54,
        "content_preserved": True,
    }, indent=2), encoding="utf-8")
    print(DEST)


if __name__ == "__main__":
    main()
