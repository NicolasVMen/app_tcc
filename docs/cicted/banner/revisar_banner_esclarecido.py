"""Revisão do banner conforme esclarecimentos do autor, sem alterar originais."""
from pathlib import Path
import json
import re
import shutil

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

from corrigir_parecer_professor import text, position, INK

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "impressao"
WORKSPACE = ROOT.parents[2]
STEM = "Banner_Escolta_CICTED_REVISAO_2"
SOURCE = OUT / "Banner_Escolta_CICTED_CORRIGIDO_PROFESSOR.pptx"
STAT_URL = "https://www.policiacivil.pr.gov.br/Noticia/Estado-ja-distribuiu-38-mil-pulseiras-e-encontrou-600-criancas-perdidas-nas-praias"

INTRODUCTION = (
    "Em locais movimentados, o afastamento de uma criança pode não ser percebido de imediato. "
    "No Verão Maior 2024/2025, o Paraná relatou cerca de 600 crianças encontradas nas praias em 30 dias (Paraná, 2025). "
    "O objetivo é desenvolver um protótipo vestível, usado junto ao corpo e integrado a um aplicativo móvel, para monitorar a proximidade "
    "entre uma criança e seu responsável, emitir alertas de afastamento ou perda de conexão e permitir um alerta manual. "
    "O Escolta UNITAU integra dispositivo vestível e aplicativo Android para acompanhar condições de proximidade "
    "por Bluetooth Low Energy (BLE), tecnologia de comunicação sem fio de baixo consumo, "
    "sinalizar enfraquecimento ou perda da conexão e oferecer um botão físico de emergência."
)

METHOD = (
    "Pesquisa aplicada, experimental e iterativa: pesquisa bibliográfica, definição de requisitos, montagem e testes sucessivos. "
    "O BLE foi escolhido pelo baixo consumo e pela operação sem internet (Bluetooth SIG, 2022). "
    "A XIAO nRF52840 Sense foi selecionada pelo tamanho compacto e BLE integrado. "
    "O firmware (programa da placa) foi escrito em C++, linguagem de programação, no ambiente Arduino; "
    "o aplicativo, com React Native/Expo, ferramentas de desenvolvimento móvel. "
    "A bateria recarregável de polímero de lítio (LiPo) permite uso vestível; "
    "o buzzer (avisador sonoro) e o botão permitem alertas locais. "
    "O RSSI (Received Signal Strength Indicator), intensidade do sinal recebido, foi filtrado para reduzir oscilações. "
    "Um serviço Android mantém a monitoração com o aplicativo fora da tela. "
    "Ensaios no Galaxy S24 Ultra e ajustes após impressões 3D orientaram as correções."
)

CONCLUSION = (
    "A integração entre o vestível e o aplicativo funcionou nas condições ensaiadas. Após os ajustes no Android, "
    "o monitoramento permaneceu ativo com a tela bloqueada no Galaxy S24 Ultra. A perda de conexão acionou "
    "o alerta no telefone; o botão físico permitiu o aviso manual no dispositivo e no celular.\n"
    "A bateria manteve o protótipo em funcionamento por aproximadamente 11 horas, entre 90% e 5% de carga estimada, "
    "em um único ciclo sem alertas automáticos. Esse resultado é preliminar e pode mudar com reconexões e avisos sonoros.\n"
    "O RSSI não representa uma medida direta de distância: obstáculos, corpo e orientação dos dispositivos alteram "
    "o sinal (Faragher; Harle, 2015). Os metros exibidos são estimativas. A validação inicial em um único modelo "
    "de telefone não permite generalizar o desempenho. O protótipo é acadêmico e não substitui a supervisão de um responsável."
)

REFERENCES = [
    ("BLUETOOTH SIG. ", "The Bluetooth Low Energy primer", ". Versão 1.0.4. Kirkland, 2022. Disponível em: https://www.bluetooth.com/bluetooth-le-primer/. Acesso em: 2 out. 2026."),
    ("FARAGHER, Ramsey; HARLE, Robert. Location fingerprinting with Bluetooth Low Energy beacons. ", "IEEE Journal on Selected Areas in Communications", ", v. 33, n. 11, p. 2418–2428, 2015. DOI: https://doi.org/10.1109/JSAC.2015.2430281."),
    ("PARANÁ. Polícia Civil. ", "Estado já distribuiu 38 mil pulseiras e encontrou 600 crianças perdidas nas praias", ". Curitiba, 21 jan. 2025. Disponível em: " + STAT_URL + ". Acesso em: 2 out. 2026."),
]


def italic_terms(shape):
    terms = ("The Bluetooth Low Energy primer", "Location fingerprinting with Bluetooth Low Energy beacons",
             "IEEE Journal on Selected Areas in Communications", "Bluetooth Low Energy",
             "Received Signal Strength Indicator", "firmware", "buzzer")
    pattern = "(" + "|".join(re.escape(t) for t in terms) + ")"
    for paragraph in shape.text_frame.paragraphs:
        for run in list(paragraph.runs):
            content = run.text
            if not re.search(pattern, content, re.IGNORECASE):
                continue
            parts = re.split(pattern, content, flags=re.IGNORECASE)
            properties = run._r.rPr
            from copy import deepcopy
            anchor = run._r
            for part in parts:
                if not part:
                    continue
                new = paragraph.add_run()
                new.text = part
                if properties is not None:
                    new._r.remove(new._r.rPr) if new._r.rPr is not None else None
                    new._r.insert(0, deepcopy(properties))
                new.font.italic = part.lower() in {t.lower() for t in terms}
                anchor.addnext(new._r)
                anchor = new._r
            paragraph._p.remove(run._r)


def build():
    prs = Presentation(SOURCE)
    shapes = list(prs.slides[0].shapes)
    assert len(shapes) == 101
    original_pictures = {i: shapes[i].image.blob for i in (44, 47, 50, 55, 57, 60, 63)}
    text(shapes[7], INTRODUCTION, 28, align=PP_ALIGN.JUSTIFY)
    position(shapes[7], h=5.10)
    position(shapes[8], y=19.55)
    position(shapes[9], y=20.47, h=5.10)
    text(shapes[9], METHOD, 27, align=PP_ALIGN.JUSTIFY)
    italic_terms(shapes[9])
    position(shapes[10], y=25.85)
    delta = Inches(1.70)
    for i in list(range(11, 42)) + list(range(95, 101)):
        shapes[i].top += delta

    # A arquitetura não repete a definição técnica: ela já está no método.
    text(shapes[77], "Monitoramento contínuo\nRSSI filtrado e estados", 27,
         align=PP_ALIGN.CENTER, middle=True, color=RGBColor(255, 255, 255))
    # Reposicionar capturas com escala uniforme; manter textos nativos legíveis.
    old_x, old_y = shapes[42].left, shapes[42].top
    ratio = .82 / .90
    new_x = Inches(1.91 + 15.10 * (1 - .82) / 2)
    for i in range(42, 53):
        s = shapes[i]
        s.left = round(new_x + (s.left - old_x) * ratio)
        s.top = round(Inches(36.05) + (s.top - old_y) * ratio)
        s.width = round(s.width * ratio)
        s.height = round(s.height * ratio)
    position(shapes[42], x=1.91, w=15.10, h=.55)
    position(shapes[52], x=1.91, w=15.10, h=.60)
    for i in (45, 48, 51):
        position(shapes[i], h=.50)
    # Fotografias e capturas: acervo; desenhos e tabela: elaboração.
    text(shapes[52], "Fonte: acervo próprio (2026). Distâncias nas telas: estimativas por RSSI.",
         24, align=PP_ALIGN.CENTER)
    text(shapes[65], "Fonte: elaboração própria e acervo próprio (2026).", 24,
         bold=True, align=PP_ALIGN.CENTER)

    text(shapes[67], CONCLUSION, 28, align=PP_ALIGN.JUSTIFY, paragraph_gap=12)
    position(shapes[67], h=6.50)
    position(shapes[68], y=40.35)
    position(shapes[69], y=41.27, h=4.20)
    frame = shapes[69].text_frame
    text(shapes[69], "", 24)
    for index, (prefix, title, suffix) in enumerate(REFERENCES):
        p = frame.paragraphs[0] if index == 0 else frame.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.line_spacing = 1.0
        p.space_after = Pt(24)
        for content, bold in ((prefix, False), (title, True), (suffix, False)):
            r = p.add_run()
            r.text = content
            r.font.name = "Arial"
            r.font.size = Pt(24)
            r.font.bold = bold
            r.font.color.rgb = INK
    italic_terms(shapes[69])
    italic_terms(shapes[5])

    all_text = "\n".join(s.text for s in shapes if s.has_text_frame)
    assert "Sakphrom" not in all_text
    assert all_text.count("Received Signal Strength Indicator") == 1
    assert "aproximadamente 11 horas" in all_text
    assert all(shapes[i].image.blob == blob for i, blob in original_pictures.items())
    assert not any(s._element.xpath('.//a:highlight') for s in shapes)
    prs.save(OUT / (STEM + ".pptx"))
    (OUT / (STEM + "_ALTERACOES.json")).write_text(json.dumps({
        "source": str(SOURCE), "introduction": INTRODUCTION, "method": METHOD,
        "statistic_source": STAT_URL,
        "statistic_scope": "Notícia institucional de 21/01/2025 sobre os primeiros 30 dias do Verão Maior 2024/2025; não é indicador nacional de desaparecimento.",
        "references_standard": "NBR 6023:2025; mesmas fontes efetivamente citadas, em formato acadêmico completo",
        "event_guidance": "Template local 2026 traz Fonte, ano; não foi confirmado regulamento adicional sobre a redação de fontes.",
        "images_preserved": True, "autonomy": "aproximadamente 11 horas",
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(OUT / (STEM + ".pptx"))


def balance():
    path = OUT / (STEM + ".pptx")
    prs = Presentation(path)
    shapes = list(prs.slides[0].shapes)
    bounds = json.loads((OUT / ("auditoria_textos_" + STEM + ".json")).read_text(encoding="utf-8-sig"))
    by_name = {b["name"]: b for b in bounds}
    failures = [b for b in bounds if b["overflow"]]
    assert not failures, failures
    header_bottom = max(by_name[s.name]["textBottom"] for s in shapes[1:5])
    top = by_name[shapes[5].name]["textTop"]
    target = prs.slide_height / 12700 - (top - header_bottom)
    for indexes, last in ((range(68, 70), 69), (range(42, 53), 52)):
        delta = target - by_name[shapes[last].name]["textBottom"]
        for i in indexes:
            shapes[i].top += Pt(delta)
    # Conferir espaços antes de mover; as medições são nativas do PowerPoint.
    for body, heading in ((7, 8), (9, 10), (67, 68)):
        assert shapes[heading].top / 12700 - by_name[shapes[body].name]["textBottom"] >= 18, (body, heading)
    assert shapes[42].top / 12700 - by_name[shapes[41].name]["textBottom"] >= 18
    for s in shapes:
        assert 0 <= s.top <= s.top + s.height <= prs.slide_height
        assert 0 <= s.left <= s.left + s.width <= prs.slide_width
    prs.save(path)
    print({"bottom_text_pt": target, "equal_outer_gap_cm": (top - header_bottom) / 72 * 2.54})


if __name__ == "__main__":
    import sys
    balance() if "--balance" in sys.argv else build()
