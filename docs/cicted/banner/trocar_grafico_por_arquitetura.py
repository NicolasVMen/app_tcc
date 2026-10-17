"""Troca o gráfico de um único ciclo pelo diagrama funcional do protótipo.

Uso: python trocar_grafico_por_arquitetura.py entrada.pptx saida.pptx
"""

from argparse import ArgumentParser
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt


NAVY = RGBColor(13, 10, 69)
PURPLE = RGBColor(107, 45, 150)
GOLD = RGBColor(245, 170, 39)
INK = RGBColor(25, 31, 65)
MUTED = RGBColor(84, 89, 113)
LINE = RGBColor(213, 204, 223)
PALE = RGBColor(248, 245, 251)
WHITE = RGBColor(255, 255, 255)


def text_box(slide, x, y, w, h, content, size, *, bold=False, color=INK,
             align=PP_ALIGN.LEFT):
    shape = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = shape.text_frame
    frame.word_wrap = True
    frame.margin_left = frame.margin_right = Inches(0)
    frame.margin_top = frame.margin_bottom = Inches(0)
    frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    paragraph = frame.paragraphs[0]
    paragraph.alignment = align
    paragraph.space_before = paragraph.space_after = Pt(0)
    paragraph.line_spacing = 1.06
    run = paragraph.add_run()
    run.text = content
    run.font.name = "Arial"
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return shape


def rectangle(slide, x, y, w, h, *, fill, stroke=LINE, radius=False):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
        Inches(x), Inches(y), Inches(w), Inches(h),
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = stroke
    shape.line.width = Pt(1.2)
    return shape


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("entrada", type=Path)
    parser.add_argument("saida", type=Path)
    args = parser.parse_args()

    presentation = Presentation(args.entrada)
    slide = presentation.slides[0]
    original_shapes = list(slide.shapes)
    if original_shapes[42].text != "Gráfico 1 — autonomia preliminar":
        raise RuntimeError("O gráfico esperado não foi encontrado na posição prevista")
    if not original_shapes[41].text.startswith("Síntese dos cenários"):
        raise RuntimeError("A legenda da tabela não corresponde à versão prevista")

    # A medição permanece explícita junto aos resultados e nas conclusões.
    caption = original_shapes[41]
    caption.text_frame.paragraphs[0].runs[0].text = (
        "Autonomia preliminar: 11 h 10, de 90% a 5% estimados "
        "(um ciclo, sem alertas automáticos)."
    )

    # Remover exclusivamente o gráfico e suas legendas, preservando a tabela.
    for shape in original_shapes[42:72]:
        element = shape._element
        element.getparent().remove(element)

    text_box(slide, 1.91, 33.42, 14.98, .65,
             "Figura 3 — arquitetura funcional e resposta aos eventos",
             32, bold=True, color=NAVY, align=PP_ALIGN.CENTER)

    rectangle(slide, 2.22, 34.55, 5.72, 3.23,
              fill=PURPLE, stroke=PURPLE, radius=True)
    text_box(slide, 2.55, 34.82, 5.06, .55, "VESTÍVEL", 31,
             bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    text_box(slide, 2.55, 35.57, 5.06, 1.70,
             "XIAO nRF52840 Sense\nBotão, buzzer e bateria", 27,
             color=WHITE, align=PP_ALIGN.CENTER)

    text_box(slide, 8.02, 35.15, 2.05, 2.15,
             "↔\nBLE", 32, bold=True, color=PURPLE,
             align=PP_ALIGN.CENTER)

    rectangle(slide, 10.14, 34.55, 6.20, 3.23,
              fill=NAVY, stroke=NAVY, radius=True)
    text_box(slide, 10.47, 34.82, 5.54, .55, "APLICATIVO ANDROID", 29,
             bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    text_box(slide, 10.47, 35.57, 5.54, 1.70,
             "Serviço persistente\nRSSI filtrado e estados", 27,
             color=WHITE, align=PP_ALIGN.CENTER)

    text_box(slide, 2.22, 38.25, 14.12, .55,
             "Caminhos de resposta", 28, bold=True, color=NAVY)

    lanes = (
        (38.96, "SINAL ENFRAQUECE", "Indicação de alcance reduzido no aplicativo."),
        (40.70, "ENLACE SE PERDE", "Tentativa de reconexão; alerta se não recuperar."),
        (42.44, "BOTÃO FÍSICO", "Com vínculo ativo, alerta manual nos dois lados."),
    )
    for y, trigger, response in lanes:
        rectangle(slide, 2.22, y, 14.12, 1.42, fill=PALE)
        rectangle(slide, 2.22, y, 4.15, 1.42, fill=WHITE, stroke=LINE)
        text_box(slide, 2.47, y + .18, 3.65, 1.06, trigger, 24,
                 bold=True, color=PURPLE, align=PP_ALIGN.CENTER)
        text_box(slide, 6.48, y + .18, .65, 1.06, "→", 30,
                 bold=True, color=GOLD, align=PP_ALIGN.CENTER)
        text_box(slide, 7.20, y + .18, 8.78, 1.06, response, 24,
                 color=INK)

    text_box(slide, 1.91, 44.46, 14.98, .42,
             "Fonte: arquitetura e comportamento observados pelos autores (2026).",
             20, color=MUTED, align=PP_ALIGN.CENTER)

    args.saida.parent.mkdir(parents=True, exist_ok=True)
    presentation.save(args.saida)
    print(args.saida)


if __name__ == "__main__":
    main()
