"""Confere recursos de impressão e gera provas ampliadas diretamente do PDF."""
from pathlib import Path
import json
import sys
from io import BytesIO

from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image
from pptx import Presentation

ROOT = Path(__file__).resolve().parent / "impressao"
STEM = sys.argv[1] if len(sys.argv) > 1 else "Banner_Escolta_CICTED_FINAL"
PDF = ROOT / (STEM + ".pdf")


def inspect_resources(resources, fonts, images, prefix=""):
    for name, ref in resources.get("/Font", {}).items():
        font = ref.get_object()
        details = font.get("/DescendantFonts", [font])[0].get_object()
        desc = details.get("/FontDescriptor", {}).get_object()
        fonts.append({"name": str(font.get("/BaseFont", name)),
                      "embedded": any(k in desc for k in ("/FontFile", "/FontFile2", "/FontFile3"))})
    for name, ref in resources.get("/XObject", {}).items():
        obj = ref.get_object()
        if obj.get("/Subtype") == "/Image":
            images.append({"name": prefix + str(name),
                           "width": obj.get("/Width"), "height": obj.get("/Height"),
                           "filter": str(obj.get("/Filter"))})
        elif obj.get("/Subtype") == "/Form" and obj.get("/Resources"):
            inspect_resources(obj["/Resources"], fonts, images, prefix + str(name))


def main():
    reader = PdfReader(PDF)
    page = reader.pages[0]
    fonts, images = [], []
    inspect_resources(page["/Resources"], fonts, images)
    width, height = float(page.mediabox.width), float(page.mediabox.height)
    report = {"pages": len(reader.pages), "size_cm": [width / 72 * 2.54, height / 72 * 2.54],
              "fonts": fonts, "images": images, "content_bytes": len(page.get_contents().get_data())}
    mappings = json.loads((ROOT / ("recursos_preservados_" + STEM + ".json")).read_text(encoding="utf-8"))
    prs = Presentation(ROOT / (STEM + ".pptx"))
    pixel_checks = []
    for item in mappings:
        original = prs.slides[0].shapes[item["shape"]].image.blob
        obj = page["/Resources"]["/XObject"][item["resource"]].get_object()
        if obj["/Filter"] == "/DCTDecode":
            identical = obj._data == original
        else:
            with Image.open(BytesIO(original)) as image:
                identical = obj.get_data() == image.convert("RGB").tobytes()
        assert identical, f"A imagem {item} sofreu alteração na exportação."
        pixel_checks.append({"shape": item["shape"], "preserved_exactly": identical})
    report["image_integrity"] = pixel_checks
    assert all(item["embedded"] for item in fonts), "Há uma fonte não incorporada."
    (ROOT / ("auditoria_pdf_" + STEM + ".json")).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    pdf = pdfium.PdfDocument(PDF)
    p = pdf[0]
    full = p.render(scale=2700 / width)
    full.to_pil().save(ROOT / (STEM + "_PREVIA.png"))
    full.close()
    # Provas localizadas a 300 dpi, sem rasterizar o arquivo entregue à gráfica.
    regions = {"prova_cabecalho": (0, 0, 14, 4.22),
               "prova_tabela": (1.90, 26.0, 8.0, 29.55),
               "prova_app": (18.6, 10.58, 23.1, 19.70)}
    for name, (left, top, right, bottom) in regions.items():
        bitmap = p.render(scale=300 / 72,
                          crop=(left * 72, height - bottom * 72,
                                width - right * 72, top * 72))
        bitmap.to_pil().save(ROOT / "assets" / (name + ".png"))
        bitmap.close()
    p.close()
    pdf.close()


if __name__ == "__main__":
    main()
