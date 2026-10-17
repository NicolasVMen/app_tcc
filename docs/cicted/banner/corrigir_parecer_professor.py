"""Aplica o parecer ao banner, mantendo a cópia anotada e as imagens originais."""
from copy import deepcopy
import json
from pathlib import Path
import re
from lxml import etree

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.util import Inches, Pt

WORKSPACE = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / "impressao"
STEM = "Banner_Escolta_CICTED_CORRIGIDO_PROFESSOR"
SOURCE = WORKSPACE / "CICTED/Banner_Escolta_CICTED_EQUILIBRADO.pptx"
NAVY = RGBColor(13, 10, 69)
INK = RGBColor(25, 31, 65)
LEFT, RIGHT, WIDTH = 1.91, 18.422292, 15.10


def position(shape, *, x=None, y=None, w=None, h=None):
    for name, value in (("left", x), ("top", y), ("width", w), ("height", h)):
        if value is not None:
            setattr(shape, name, Inches(value))


def text(shape, content, size, *, bold=False, align=PP_ALIGN.LEFT,
         middle=False, color=INK, spacing=1.08, paragraph_gap=0):
    frame = shape.text_frame
    frame.clear()
    frame.word_wrap = True
    frame.auto_size = MSO_AUTO_SIZE.NONE
    frame.margin_left = frame.margin_right = frame.margin_top = frame.margin_bottom = 0
    frame.vertical_anchor = MSO_ANCHOR.MIDDLE if middle else MSO_ANCHOR.TOP
    for index, line in enumerate(content.split("\n")):
        p = frame.paragraphs[0] if index == 0 else frame.add_paragraph()
        p.alignment = align
        p.line_spacing = spacing
        p.space_before = Pt(0)
        p.space_after = Pt(paragraph_gap)
        # Itálico para termos estrangeiros no texto, sem alterar nomes de produtos.
        for part in re.split(r"(Bluetooth Low Energy|buzzer|firmware)", line):
            if not part:
                continue
            run = p.add_run()
            run.text = part
            run.font.name = "Arial"
            run.font.size = Pt(size)
            run.font.bold = bold
            run.font.italic = part in ("Bluetooth Low Energy", "buzzer", "firmware")
            run.font.color.rgb = color


def clone(slide, source):
    element = deepcopy(source._element)
    slide.shapes._spTree.insert_element_before(element, "p:extLst")
    shape = list(slide.shapes)[-1]
    nv = shape._element.xpath('./p:nvSpPr/p:cNvPr')[0]
    nv.set("id", str(max(s.shape_id for s in slide.shapes) + 1))
    nv.set("name", "Autonomia " + source.name)
    return shape


def main():
    prs = Presentation(SOURCE)
    slide = prs.slides[0]
    shapes = list(slide.shapes)
    assert len(shapes) == 95
    pictures = {i: shapes[i].image.blob for i in (44, 47, 50, 55, 57, 60, 63)}
    header = [etree.tostring(s._element) for s in shapes[:5]]

    position(shapes[6], y=13.30, h=.76)
    position(shapes[7], y=14.22, h=4.02)
    introduction = (
        "Estudos exploram Bluetooth Low Energy (BLE), comunicação sem fio de baixo consumo (Bluetooth SIG, 2022), "
        "para acompanhar a presença de crianças em ônibus escolares (Sakphrom et al., 2021). "
        "Neste trabalho, o objetivo é desenvolver e avaliar um protótipo de monitoramento de proximidade "
        "como apoio à supervisão infantil em locais movimentados. O Escolta UNITAU reúne dispositivo vestível, "
        "usado junto ao corpo, e aplicativo Android, com alertas de perda de conexão e botão físico."
    )
    text(shapes[7], introduction, 30, align=PP_ALIGN.JUSTIFY)
    position(shapes[8], y=18.65, h=.76)
    position(shapes[9], y=19.57, h=4.22)
    method = (
        "Pesquisa aplicada e experimental, conduzida em etapas: consulta a estudos sobre BLE, definição de requisitos, "
        "montagem, programação e testes. A comunicação foi validada em ESP32 e transferida para a XIAO nRF52840 Sense "
        "pelo tamanho compacto, BLE integrado e recarga por USB-C. O programa da placa foi desenvolvido em C++/Arduino; "
        "o aplicativo, em React Native/Expo. O circuito inclui buzzer (avisador sonoro), botão e bateria. "
        "A caixa foi modelada no OpenSCAD e ajustada após impressões 3D. Ensaios no Galaxy S24 Ultra avaliaram "
        "conexão, tela bloqueada, botão e autonomia; "
        "as falhas orientaram as correções."
    ).replace("Buzzer (", "O buzzer (")
    text(shapes[9], method, 29, align=PP_ALIGN.JUSTIFY)
    position(shapes[10], y=24.15, h=.76)

    # Tabela nativa editável: reaproveita a grade e acrescenta a quinta linha.
    table_shift = Inches(25.15) - shapes[11].top
    for shape in shapes[11:41]:
        shape.top += table_shift
    entries = {
        18: "Conexão BLE",
        20: "Conexão, desconexão e tentativas de reconexão.",
        22: "Alerta no telefone e tentativa de restabelecer a conexão.",
        24: "Tela bloqueada",
        26: "Aplicativo fora da tela, com serviço Android ativo.",
        28: "Após ajustes no serviço, o monitoramento continuou.",
        30: "Botão físico",
        32: "Pressão do botão com o vestível conectado.",
        34: "Alerta sonoro no dispositivo e no telefone.",
        36: "Aplicativo",
        38: "Telas, alertas, histórico e confirmação do responsável.",
        40: "Registro de proximidade, sinal reduzido e alerta.",
    }
    for index, content in entries.items():
        text(shapes[index], content, 26 if index in (18, 24, 30, 36) else 25,
             bold=index in (18, 24, 30, 36))
    row_content = ("Autonomia preliminar",
                   "Um ciclo contínuo por BLE, sem alertas automáticos.",
                   "Aproximadamente 11 horas, de 90% a 5% de carga estimada.")
    for offset, source_index in enumerate(range(35, 41)):
        added = clone(slide, shapes[source_index])
        added.top += Inches(1.47)
        if offset % 2:
            text(added, row_content[offset // 2], 26 if offset == 1 else 25,
                 bold=offset == 1)
    position(shapes[41], y=33.24, h=.48)
    text(shapes[41], "Fonte: elaboração própria (2026).", 24)

    # Figura 1: arquitetura movida como conjunto, sem alterar seus encaixes.
    dx = Inches(RIGHT - LEFT)
    dy = shapes[5].top - shapes[70].top
    for shape in shapes[70:95]:
        shape.left += dx
        shape.top += dy
    text(shapes[70], "Figura 1 — funcionamento do sistema e resposta aos eventos", 28,
         bold=True, align=PP_ALIGN.CENTER, middle=True, color=NAVY)
    text(shapes[73], "Placa XIAO nRF52840 Sense\nBotão, avisador sonoro e bateria", 27,
         align=PP_ALIGN.CENTER, middle=True, color=RGBColor(255, 255, 255))
    text(shapes[77], "Monitoramento contínuo\nIntensidade do sinal (RSSI)", 27,
         align=PP_ALIGN.CENTER, middle=True, color=RGBColor(255, 255, 255))
    text(shapes[86], "CONEXÃO SE PERDE", 24, bold=True, align=PP_ALIGN.CENTER,
         middle=True, color=RGBColor(107, 45, 150))
    text(shapes[83], "Aviso de sinal reduzido no aplicativo.", 24, middle=True)
    text(shapes[88], "Tentativa de reconexão; alerta se não recuperar.", 24, middle=True)
    text(shapes[93], "Com conexão ativa, alerta no vestível e no celular.", 24, middle=True)
    position(shapes[94], h=.48)
    text(shapes[94], "Fonte: elaboração própria (2026).", 24,
         align=PP_ALIGN.CENTER, middle=True)

    # Figura 3: capturas preservadas, escala uniforme (não distorce as telas).
    old_x, old_y = shapes[42].left, shapes[42].top
    new_y, factor = Inches(34.75), .90
    centered_x = Inches(LEFT + WIDTH * (1 - factor) / 2)
    for shape in shapes[42:53]:
        shape.left = round(centered_x + (shape.left - old_x) * factor)
        shape.top = round(new_y + (shape.top - old_y) * factor)
        shape.width = round(shape.width * factor)
        shape.height = round(shape.height * factor)
    position(shapes[42], x=LEFT, w=WIDTH, h=.55)
    text(shapes[42], "Figura 3 — telas do aplicativo e condições de proximidade", 28,
         bold=True, align=PP_ALIGN.CENTER, color=NAVY)
    for index, content in ((45, "Protegido"), (48, "Alcance reduzido"), (51, "Emergência")):
        text(shapes[index], content, 25, bold=True, align=PP_ALIGN.CENTER)
    position(shapes[52], x=LEFT, w=WIDTH, h=.60)
    text(shapes[52], "Fonte: acervo próprio (2026). Distâncias nas telas: estimativas por RSSI.",
         24, align=PP_ALIGN.CENTER)

    text(shapes[53], "Figura 2 — projeto da caixa e protótipo físico", 28,
         bold=True, align=PP_ALIGN.CENTER, color=NAVY)
    text(shapes[65], "Fonte: elaboração própria e acervo próprio (2026).", 24,
         bold=True, align=PP_ALIGN.CENTER)

    conclusion = (
        "A integração entre o vestível e o aplicativo funcionou nas condições ensaiadas. "
        "Após os ajustes no Android, o monitoramento permaneceu ativo com a tela bloqueada no Galaxy S24 Ultra. "
        "A perda de conexão acionou o alerta no telefone; o botão físico permitiu o aviso manual no dispositivo e no celular.\n"
        "A bateria manteve o protótipo em funcionamento por aproximadamente 11 horas, entre 90% e 5% de carga estimada, "
        "em um único ciclo sem alertas automáticos. Esse resultado é preliminar e pode mudar com reconexões e avisos sonoros.\n"
        "O RSSI é um indicador da intensidade do sinal recebido, não uma medida direta de distância. "
        "Obstáculos, corpo e orientação dos dispositivos alteram o sinal (Faragher; Harle, 2015). "
        "Por isso, os metros exibidos no aplicativo são estimativas. A validação inicial em um único modelo de telefone "
        "não permite generalizar o desempenho. O protótipo é acadêmico e não substitui a supervisão de um responsável."
    )
    position(shapes[67], h=7.70)
    text(shapes[67], conclusion, 28, align=PP_ALIGN.JUSTIFY, paragraph_gap=12)
    references = (
        "BLUETOOTH SIG. The Bluetooth Low Energy Primer. 2022. Disponível em: bluetooth.com/bluetooth-le-primer. Acesso em: 2 out. 2026.\n"
        "FARAGHER, R.; HARLE, R. Location Fingerprinting With Bluetooth Low Energy Beacons. IEEE Journal on Selected Areas in Communications, "
        "v. 33, n. 11, p. 2418–2428, 2015. DOI: 10.1109/JSAC.2015.2430281.\n"
        "SAKPHROM, S. et al. A Simplified and High Accuracy Algorithm of RSSI-Based Localization Zoning for Children Tracking In-Out the School Buses "
        "Using Bluetooth Low Energy Beacon. Informatics, v. 8, n. 4, art. 65, 2021. DOI: 10.3390/informatics8040065."
    )
    position(shapes[68], y=41.06)
    position(shapes[69], y=42.06, h=3.76)
    text(shapes[69], references, 24, paragraph_gap=8, spacing=1.04)

    # Retirar desta cópia todos os destaques editoriais; o original fica intacto.
    for shape in list(slide.shapes)[5:]:
        for highlight in shape._element.xpath('.//a:highlight'):
            highlight.getparent().remove(highlight)
    all_text = "\n".join(s.text for s in slide.shapes if s.has_text_frame)
    for forbidden in ("11 h 10", "11h10", "Colocar objetivo", "Verificar", "Adicionar uma linha",
                      "Como foi o processo", "significa distancia", "Deixar mais fácil", "Especificar onde"):
        assert forbidden not in all_text
    assert all(shapes[i].image.blob == blob for i, blob in pictures.items())
    assert all(etree.tostring(s._element) == previous
               for s, previous in zip(shapes[:5], header))
    for shape in slide.shapes:
        assert 0 <= shape.top <= shape.top + shape.height <= prs.slide_height
        assert 0 <= shape.left <= shape.left + shape.width <= prs.slide_width
    OUT.mkdir(exist_ok=True)
    destination = OUT / (STEM + ".pptx")
    # Este destino é a cópia gerada por esta revisão, nunca o arquivo anotado.
    prs.save(destination)
    (OUT / (STEM + "_ALTERACOES.json")).write_text(json.dumps({
        "source": str(SOURCE), "destination": str(destination),
        "duration_label": "aproximadamente 11 horas", "images_preserved": True,
        "figures": {"1": "arquitetura", "2": "caixa e protótipo", "3": "telas do aplicativo"},
        "references_with_citations": ["Bluetooth SIG, 2022", "Sakphrom et al., 2021", "Faragher; Harle, 2015"],
        "statistical_claims_added": False, "hardware_comparison_invented": False,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(destination)


if __name__ == "__main__":
    main()
