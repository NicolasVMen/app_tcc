"""Prepara uma cópia de alta qualidade, preservando as versões anteriores.

Mantém fotografias/capturas reais, usa CAD rerenderizado e cabeçalho SVG.
Não aplica reconstrução generativa às evidências do protótipo.
"""

from pathlib import Path
import json
import sys
from io import BytesIO

from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.oxml.xmlchemy import OxmlElement
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.opc.package import Part
from pptx.opc.packuri import PackURI
from pptx.util import Inches, Pt
from lxml import etree

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "impressao"
ASSETS = OUT / "assets"
SOURCE = ROOT / "Banner_Escolta_UNITAU_CICTED_2026_ARQUITETURA.pptx"
DEST = OUT / "Banner_Escolta_CICTED_FINAL.pptx"
sys.path.insert(0, str(ROOT / "ferramentas" / "vendor"))
import vtracer


def replace_image(slide, shape, path):
    """Troca apenas o recurso, preservando posição e dimensão da figura."""
    image_part, relationship = slide.part.get_or_add_image_part(str(path))
    shape._element.blipFill.blip.set(
        "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed",
        relationship,
    )
    shape._element.blipFill.blip.set("cstate", "none")


def add_svg(slide, shape, path):
    part = Part(PackURI("/ppt/media/cabecalho_vetorial.svg"), "image/svg+xml",
                slide.part.package, path.read_bytes())
    rid = slide.part.relate_to(part, RT.IMAGE)
    blip = shape._element.blipFill.blip
    ext_list = OxmlElement("a:extLst")
    ext = OxmlElement("a:ext")
    ext.set("uri", "{96DAC541-7B7A-43D3-8B79-37D633B846F1}")
    svg = etree.SubElement(ext, "{http://schemas.microsoft.com/office/drawing/2016/SVG/main}svgBlip")
    svg.set("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed", rid)
    ext_list.append(ext)
    blip.append(ext_list)


def set_font(shape, size, color=None):
    for paragraph in shape.text_frame.paragraphs:
        for run in paragraph.runs:
            run.font.size = Pt(size)
            if color is not None:
                run.font.color.rgb = RGBColor(*color)


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    prs = Presentation(SOURCE)
    slide = prs.slides[0]
    shapes = list(slide.shapes)
    assert len(shapes) == 95, "A versão de origem mudou; conferir índices antes de editar."
    assert shapes[42].text.startswith("Figura 1")
    assert shapes[70].text.startswith("Figura 3")

    header = ASSETS / "cabecalho_original.png"
    header.write_bytes(shapes[0].image.blob)
    header_svg = ASSETS / "cabecalho_vetorial.svg"
    # Vetorização determinística dos contornos; preserva composição e identidade.
    vtracer.convert_image_to_svg_py(
        str(header), str(header_svg), colormode="color", hierarchical="stacked",
        mode="spline", filter_speckle=0, color_precision=8, layer_difference=4,
        corner_threshold=60, length_threshold=1.0, max_iterations=20,
        splice_threshold=45, path_precision=4,
    )
    # O raster do template não contém detalhe suficiente nas duas legendas
    # minúsculas dos logotipos. Recompô-las como texto, sem alterar as palavras.
    svg_root = etree.fromstring(header_svg.read_bytes())
    ns = "{http://www.w3.org/2000/svg}"
    with Image.open(header) as original_header:
        purple = original_header.convert("RGB").getpixel((100, 100))
    purple_hex = "#" + "".join(f"{c:02x}" for c in purple)
    etree.SubElement(svg_root, ns + "rect", x="221", y="176", width="388", height="43", fill=purple_hex)
    for baseline, caption in ((194, "CONGRESSO INTERNACIONAL DE CIÊNCIA,"),
                              (214, "TECNOLOGIA E DESENVOLVIMENTO")):
        element = etree.SubElement(svg_root, ns + "text", x="224", y=str(baseline),
                                   fill="#ffffff", attrib={"font-family": "Arial", "font-size": "16.8"})
        element.text = caption
    etree.SubElement(svg_root, ns + "rect", x="2241", y="243", width="215", height="20", fill="#ffffff")
    element = etree.SubElement(svg_root, ns + "text", x="2246", y="256", fill="#194477",
                               attrib={"font-family": "Arial", "font-size": "12.5", "font-weight": "bold"})
    element.text = "Universidade de Taubaté"
    header_svg.write_bytes(etree.tostring(svg_root, xml_declaration=True, encoding="utf-8"))
    add_svg(slide, shapes[0], header_svg)

    replace_image(slide, shapes[55], ASSETS / "cad_perspectiva.png")
    replace_image(slide, shapes[57], ASSETS / "cad_superior.png")

    # Mais legibilidade no tamanho físico; conservar textos e dados científicos.
    for index in (12, 14, 16):
        set_font(shapes[index], 26)
        shapes[index].top -= Inches(.025)
        shapes[index].height = Inches(.5)
    for index in (18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40):
        set_font(shapes[index], 26)
    set_font(shapes[38], 24)
    shapes[1].height = Inches(1.10)
    shapes[2].top = Inches(6.24)
    for index in (45, 48, 51, 56, 58, 61, 64):
        set_font(shapes[index], 25)
        shapes[index].height = Inches(.48)
    set_font(shapes[58], 24)
    for index in (41, 52, 65, 94):
        set_font(shapes[index], 24, (25, 31, 65))
        shapes[index].height = Inches(.64)
    # Atribuição curta, sem referir os responsáveis na terceira pessoa.
    shapes[52].text_frame.paragraphs[0].runs[0].text = (
        "Fonte: acervo próprio (2026). Metros exibidos: estimativas por RSSI.")
    shapes[65].text_frame.paragraphs[0].runs[0].text = (
        "Fonte: elaboração própria e acervo próprio (2026).")
    shapes[94].text_frame.paragraphs[0].runs[0].text = (
        "Fonte: elaboração própria (2026).")
    caption = shapes[41].text_frame.paragraphs[0].runs[0]
    caption.text = "Fonte: elaboração própria (2026).\n" + caption.text
    shapes[41].height = Inches(.86)
    shapes[70].top = Inches(33.65)
    set_font(shapes[69], 24)
    # Não compactar figuras ao salvar/abrir a cópia editável.
    prs._element.set("autoCompressPictures", "0")
    for shape in slide.shapes:
        if shape.shape_type == 13:
            shape._element.blipFill.blip.set("cstate", "none")
    prs.save(DEST)

    report = []
    for index, shape in enumerate(slide.shapes):
        if shape.shape_type == 13:
            width, height = Image.open(BytesIO(shape.image.blob)).size
            report.append({"shape": index, "pixels": [width, height],
                           "ppi": [round(width / (shape.width / 914400), 1),
                                   round(height / (shape.height / 914400), 1)],
                           "vector_svg": index == 0})
    (OUT / "resolucao_recursos.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(DEST)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
