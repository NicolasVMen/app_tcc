from pathlib import Path
import re

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_COLOR_INDEX
from docx.enum.style import WD_STYLE_TYPE
from docx.shared import Pt, RGBColor
from docx.oxml.ns import qn


ROOT = Path(__file__).resolve().parents[2]
CICTED_DIR = ROOT / "docs" / "cicted"
TEMPLATE = CICTED_DIR / "Modelo_Resumo_XV_CICTED_2026.607f415da36e45e9b4da.docx"
OUTPUT_IDENTIFIED = CICTED_DIR / "Resumo_Escolta_UNITAU_XV_CICTED_2026_IDENTIFICADO.docx"
OUTPUT_ANONYMOUS = CICTED_DIR / "Resumo_Escolta_UNITAU_XV_CICTED_2026_NAO_IDENTIFICADO.docx"

TITLE = (
    "ESCOLTA UNITAU: PROTÓTIPO VESTÍVEL PARA MONITORAMENTO DE "
    "PROXIMIDADE INFANTIL POR BLUETOOTH LOW ENERGY"
)

ODS = (
    "Objetivo(s) de Desenvolvimento Sustentável (ODS): "
    "ODS 3 – Saúde e Bem-Estar; ODS 9 – Indústria, Inovação e Infraestrutura"
)

ABSTRACT = (
    "A segurança infantil em ambientes com grande circulação de pessoas demanda recursos "
    "capazes de auxiliar responsáveis na percepção rápida de afastamentos, sem substituir a "
    "supervisão humana. Soluções baseadas em comunicação sem fio podem atuar como mecanismos "
    "complementares de acompanhamento, fornecendo sinais de alerta diante da perda ou degradação "
    "da proximidade entre a criança e o responsável. A partir desse contexto, este trabalho "
    "apresenta o desenvolvimento do Escolta UNITAU, protótipo "
    "acadêmico funcional composto por um dispositivo vestível e um aplicativo móvel para "
    "monitoramento de proximidade por Bluetooth Low Energy (BLE). O objetivo foi projetar e "
    "avaliar uma prova de conceito de baixo custo que sinalize a degradação ou perda do vínculo "
    "sem fio, realize tentativas automáticas de reconexão e acione alertas locais, além de "
    "disponibilizar um botão físico de emergência à criança. A pesquisa caracteriza-se como "
    "aplicada, experimental e de desenvolvimento tecnológico. O dispositivo foi implementado "
    "com a placa Seeed Studio XIAO nRF52840 Sense, firmware em C++ no ambiente Arduino, buzzer "
    "ativo, transistor P2N2222A, diodo de proteção, resistores e botão tátil, enquanto o "
    "aplicativo foi desenvolvido em React Native com Expo, inicialmente para Android. A "
    "intensidade do sinal recebido (RSSI) é processada para fornecer ao responsável uma "
    "estimativa experimental de distância e estados de cobertura, reconhecendo-se a influência "
    "de obstáculos, do corpo humano e do ambiente. Foram executados ensaios iterativos em um "
    "Samsung Galaxy S24 Ultra envolvendo autenticação, navegação, conexão automática, perda do "
    "vínculo, reconexão, funcionamento em segundo plano, tela bloqueada, alarmes sonoros, "
    "vibração, registros de ocorrências, preferências e confirmação de segurança. As falhas "
    "observadas nos primeiros ciclos orientaram correções no serviço Android em primeiro plano, "
    "na sincronização dos estados e no encerramento seguro dos alertas. Após os ajustes, "
    "verificou-se o funcionamento da monitoração persistente, da emergência por perda de "
    "conexão e do acionamento físico pelo botão, com resposta sonora no dispositivo e no "
    "telefone. O circuito do protótipo foi soldado e validado, e a alimentação por bateria foi "
    "integrada com inicialização bem-sucedida do dispositivo. Permanecem em andamento a medição "
    "de autonomia, a calibração sistemática da estimativa de distância e a fabricação da "
    "estrutura vestível por impressão 3D. Ferramentas de "
    "inteligência artificial generativa foram utilizadas de forma supervisionada no apoio à "
    "organização, programação e revisão, permanecendo as decisões e validações sob "
    "responsabilidade dos autores. Conclui-se que a arquitetura demonstrou viabilidade técnica "
    "como prova de conceito integrada, mas necessita de ensaios adicionais em diferentes "
    "aparelhos e ambientes antes de qualquer aplicação além do contexto acadêmico."
)

KEYWORDS = (
    "Sistemas embarcados. Aplicativo móvel. Comunicação sem fio. "
    "Alerta de afastamento. Internet das Coisas."
)


def set_font(run, size=12, bold=None, color=None, highlight=False):
    run.font.name = "Times New Roman"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)
    if highlight:
        run.font.highlight_color = WD_COLOR_INDEX.YELLOW


def format_paragraph(paragraph, alignment=None, line=1.0, after=0, before=0):
    if alignment is not None:
        paragraph.alignment = alignment
    fmt = paragraph.paragraph_format
    fmt.line_spacing = line
    fmt.space_after = Pt(after)
    fmt.space_before = Pt(before)


def build_document(output, identified):
    doc = Document(TEMPLATE)
    document_title = TITLE if identified else TITLE.replace("ESCOLTA UNITAU:", "ESCOLTA:")
    document_abstract = ABSTRACT if identified else ABSTRACT.replace("Escolta UNITAU", "Escolta")

    # Keep the official page setup, but remove instructions, example and evaluation tables.
    body = doc._element.body
    for child in list(body):
        if child.tag != qn("w:sectPr"):
            body.remove(child)

    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    normal.font.size = Pt(12)

    p = doc.add_paragraph()
    format_paragraph(p, WD_ALIGN_PARAGRAPH.CENTER, after=6)
    r = p.add_run(document_title)
    set_font(r, 12, bold=True)

    p = doc.add_paragraph()
    format_paragraph(p, WD_ALIGN_PARAGRAPH.CENTER, after=6)
    r = p.add_run(ODS)
    set_font(r, 12, bold=True)

    if identified:
        p = doc.add_paragraph()
        format_paragraph(p, WD_ALIGN_PARAGRAPH.CENTER, after=3)
        r = p.add_run("Nicolas Venciguerra Men¹; Rafael Gonçalves Dedini²; Luis Fernando de Almeida³")
        set_font(r, 11)

        p = doc.add_paragraph()
        format_paragraph(p, WD_ALIGN_PARAGRAPH.CENTER, after=10)
        r = p.add_run("¹Universidade de Taubaté – Taubaté/SP – Brasil – nicolas.vmen@unitau.br; ")
        set_font(r, 11)
        r = p.add_run("²Universidade de Taubaté – Taubaté/SP – Brasil – rafael.gdedini@unitau.br; ")
        set_font(r, 11)
        r = p.add_run("³Universidade de Taubaté – Taubaté/SP – Brasil – luis.almeida@unitau.br.")
        set_font(r, 11)

    p = doc.add_paragraph()
    format_paragraph(p, WD_ALIGN_PARAGRAPH.LEFT, after=3, before=4 if not identified else 0)
    r = p.add_run("Resumo")
    set_font(r, 12, bold=True)

    p = doc.add_paragraph()
    format_paragraph(p, WD_ALIGN_PARAGRAPH.JUSTIFY, line=1.0, after=6)
    r = p.add_run(document_abstract)
    set_font(r, 12)

    p = doc.add_paragraph()
    format_paragraph(p, WD_ALIGN_PARAGRAPH.JUSTIFY)
    r = p.add_run("Palavras-chave:")
    set_font(r, 12, bold=True)
    r = p.add_run(" " + KEYWORDS)
    set_font(r, 12)

    doc.core_properties.title = document_title.title()
    doc.core_properties.subject = "Resumo para o XV CICTED 2026"
    doc.core_properties.author = (
        "Nicolas Venciguerra Men; Rafael Gonçalves Dedini; Luis Fernando de Almeida"
        if identified else ""
    )
    doc.core_properties.last_modified_by = "" if not identified else "Equipe Escolta UNITAU"
    doc.core_properties.keywords = KEYWORDS
    doc.core_properties.comments = "" if not identified else "Versão identificada"

    if not identified:
        # The official template contains external mailto relationships from its example.
        # They can remain orphaned after the visible example is removed, so delete them too.
        for rel_id, rel in list(doc.part.rels.items()):
            target = str(getattr(rel, "target_ref", "")).lower()
            if target.startswith("mailto:"):
                del doc.part.rels[rel_id]

    output.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output)


build_document(OUTPUT_IDENTIFIED, identified=True)
build_document(OUTPUT_ANONYMOUS, identified=False)

words = re.findall(r"\b[\wÀ-ÿ]+(?:[-’'][\wÀ-ÿ]+)?\b", ABSTRACT, flags=re.UNICODE)
title_words = re.findall(r"\b[\wÀ-ÿ]+(?:[-’'][\wÀ-ÿ]+)?\b", TITLE, flags=re.UNICODE)
print(OUTPUT_IDENTIFIED)
print(OUTPUT_ANONYMOUS)
print(f"Palavras no resumo: {len(words)}")
print(f"Palavras no título: {len(title_words)}")
