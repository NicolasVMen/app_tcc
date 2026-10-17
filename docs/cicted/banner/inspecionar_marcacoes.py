"""Inspeção somente leitura do banner anotado pelo usuário."""
from pathlib import Path
from zipfile import ZipFile
from pptx import Presentation
from lxml import etree

ROOT = Path(__file__).resolve().parents[3]
FILE = ROOT / "CICTED/Banner_Escolta_CICTED_EQUILIBRADO.pptx"
BASE = Path(__file__).resolve().parent / "impressao/Banner_Escolta_CICTED_EQUILIBRADO.pptx"
presentation = Presentation(FILE)
original = Presentation(BASE)
old = {i: s for i, s in enumerate(original.slides[0].shapes)}
print("SLIDES", len(presentation.slides))
for slide_index, slide in enumerate(presentation.slides):
    for index, shape in enumerate(slide.shapes):
        yellow = shape._element.xpath('.//a:srgbClr[@val="FFFF00"]')
        highlight = shape._element.xpath('.//a:highlight')
        if not (shape.has_text_frame or yellow or highlight):
            continue
        print("\nSHAPE", slide_index, index, shape.shape_id, shape.name,
              "XYWH", tuple(round(v / 914400, 3) for v in
                            (shape.left, shape.top, shape.width, shape.height)))
        if shape.has_text_frame:
            print("TEXT", repr(shape.text))
            previous = old.get(index)
            if previous is not None and previous.has_text_frame and previous.text != shape.text:
                print("BEFORE", repr(previous.text))
        if yellow or highlight:
            marked = []
            for paragraph in shape._element.xpath('.//a:p'):
                text = ''.join(''.join(run.xpath('.//a:t/text()'))
                               for run in paragraph.xpath('./a:r')
                               if run.xpath('.//a:highlight') or run.xpath('.//a:srgbClr[@val="FFFF00"]'))
                if text:
                    marked.append(text)
            print("MARKED", marked)
with ZipFile(FILE) as archive:
    for name in archive.namelist():
        if "comment" in name.lower() or (name.startswith("ppt/notesSlides/notesSlide") and name.endswith(".xml")):
            print("EXTRA", name, archive.read(name).decode("utf-8"))
