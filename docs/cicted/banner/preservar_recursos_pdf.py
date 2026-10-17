"""Reinsere recursos de imagem integrais após a exportação do PowerPoint.

O PowerPoint reduz o CAD a aproximadamente 200 ppi, mesmo na intenção de
impressão. Esta etapa preserva os pixels originais, posições e vetores do PDF.
Fotografias PNG ficam em compressão sem perdas; JPEGs não são recodificados.
"""
from io import BytesIO
from pathlib import Path
import json
import sys

from PIL import Image
from pptx import Presentation
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject, EncodedStreamObject, NameObject, NumberObject

ROOT = Path(__file__).resolve().parent / "impressao"
STEM = sys.argv[1] if len(sys.argv) > 1 else "Banner_Escolta_CICTED_FINAL"
PDF = ROOT / (STEM + ".pdf")
SOURCE = ROOT / "assets" / ("exportacao_" + STEM + ".pdf")


def image_xobject(blob):
    with Image.open(BytesIO(blob)) as image:
        width, height = image.size
        if image.format == "JPEG" and image.mode == "RGB":
            stream = EncodedStreamObject()
            stream._data = blob
            stream[NameObject("/Filter")] = NameObject("/DCTDecode")
        else:
            decoded = DecodedStreamObject()
            decoded.set_data(image.convert("RGB").tobytes())
            stream = decoded.flate_encode()
    stream.update({NameObject("/Type"): NameObject("/XObject"),
                   NameObject("/Subtype"): NameObject("/Image"),
                   NameObject("/Width"): NumberObject(width),
                   NameObject("/Height"): NumberObject(height),
                   NameObject("/BitsPerComponent"): NumberObject(8),
                   NameObject("/ColorSpace"): NameObject("/DeviceRGB")})
    return stream


def main():
    presentation = Presentation(ROOT / (STEM + ".pptx"))
    shapes = list(presentation.slides[0].shapes)
    reader = PdfReader(SOURCE)
    # Copiar a página sem estruturas de marcação/acessibilidade do Office que
    # não são necessárias à impressão. Usar PDF clássico, sem object streams.
    writer = PdfWriter()
    writer.pdf_header = "%PDF-1.4"
    writer.add_page(reader.pages[0])
    writer.pages[0].pop("/StructParents", None)
    objects = writer.pages[0]["/Resources"]["/XObject"]
    replacements = []
    # IDs de forma correspondem à versão de origem validada em preparar_impressao.
    candidates = {}
    for name, reference in list(objects.items()):
        obj = reference.get_object()
        if obj.get("/Subtype") == "/Image":
            size = (int(obj["/Width"]), int(obj["/Height"]))
            candidates.setdefault(size, []).append(name)
    cad_names = candidates[(791, 593)]
    assert len(cad_names) == 2, "A exportação mudou; auditar mapeamento CAD."
    pairs = [(cad_names[0], 55), (cad_names[1], 57)]
    for index in (44, 47, 50, 60, 63):
        with Image.open(BytesIO(shapes[index].image.blob)) as image:
            names = candidates[image.size]
        assert len(names) == 1, "O recurso não é único; auditar o PDF."
        pairs.append((names[0], index))
    for name, index in pairs:
        stream = image_xobject(shapes[index].image.blob)
        objects[name] = writer._add_object(stream)
        replacements.append({"resource": name, "shape": index,
                             "pixels": [int(stream["/Width"]), int(stream["/Height"])]})
    writer.write(PDF)
    (ROOT / ("recursos_preservados_" + STEM + ".json")).write_text(
        json.dumps(replacements, ensure_ascii=False, indent=2), encoding="utf-8")
    print(PDF)
    print(json.dumps(replacements, ensure_ascii=False))


if __name__ == "__main__":
    main()
