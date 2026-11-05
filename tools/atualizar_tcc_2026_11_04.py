"""Revisa uma cópia do Word do Drive; não modifica a fonte nem o aplicativo.

Execute com Python que possua python-docx e matplotlib. O original baixado é
preservado em backups/tcc/ antes da geração. Publicação no Drive é separada.
"""
from pathlib import Path
from copy import deepcopy
from collections import defaultdict
from statistics import mean
import csv
import hashlib
import json
import re
import shutil

from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.expo/tcc-revisao-2026-11-04/original_drive.docx'
OUT = ROOT / 'docs/tcc/TCC_Escolta_UNITAU_ATUALIZADO_2026-11-04.docx'
CONTENT = ROOT / 'docs/tcc/REVISAO_2026-11-04_CAPITULOS_4_A_6.md'
ASSETS = ROOT / 'docs/tcc/figuras_revisao_2026-11-04'
BACKUP = ROOT / 'backups/tcc/2026-11-04/original_drive_ate_capitulo_4.docx'

REPLACEMENTS = {
    'Zhang et al. (2020) apresentaram': 'Cao et al. (2019) apresentaram um sistema de monitoramento infantil apoiado em posicionamento em ambiente interno. A referência mostra uma abordagem de localização que não deve ser confundida com a ligação direta entre o vestível e o celular adotada neste trabalho. A comparação é feita quanto à arquitetura e à finalidade, sem atribuir ao Escolta os resultados obtidos naquele estudo.',
    'Faragher e Harle (2015) estudaram': 'Faragher e Harle (2015) estudaram posicionamento por fingerprinting com beacons BLE e observaram a suscetibilidade do sinal ao desvanecimento rápido. Esse contexto fundamenta a cautela na interpretação das leituras do Escolta. O projeto adota suavização, histerese e confirmação temporal para tratar transições de estado, mas não reproduz uma infraestrutura de localização por fingerprinting.',
    'Em comparação com os trabalhos analisados': 'Os trabalhos relacionados mostram que vestíveis, BLE e alertas de afastamento já foram explorados em diferentes configurações. A contribuição deste trabalho está no desenvolvimento e na avaliação experimental de uma implementação integrada, com firmware, aplicativo e caixa próprios. Não se afirma que a ideia geral de uma pulseira infantil por Bluetooth seja inédita. O aplicativo informa condições de proximidade e do enlace, sem prometer localização exata.',
    'A ideia do projeto é desenvolver': 'O objetivo geral é desenvolver e avaliar um protótipo vestível integrado a um aplicativo Android para monitorar condições de proximidade por BLE, emitir alertas de afastamento ou perda de comunicação e permitir acionamento manual de emergência.',
    'O escopo está limitado a uma criança': 'O escopo está limitado a um vestível e um telefone responsável por vez. A validação final concentrou-se no Samsung Galaxy S24 Ultra (SM-S928B), com Android 36. O React Native permite compartilhar parte do desenvolvimento entre plataformas, mas o comportamento do iOS e uma matriz de outros modelos não foram validados nesta etapa. Os ensaios foram realizados por adultos; não foi conduzido estudo de eficácia com crianças.',
    'Durante o uso, o dispositivo anuncia': 'Durante o uso, o dispositivo anuncia o nome ESCOLTA_BLE. O aplicativo realiza a varredura, identifica o periférico esperado, estabelece a conexão e descobre os serviços. Depois, recebe notificações de telemetria e escreve comandos nas características correspondentes. Nome e UUIDs organizam a descoberta e o contrato, mas não comprovam, por si só, a identidade autenticada de um vestível.',
    'Para reduzir esse problema, o firmware utiliza': 'A suavização reduz parte da variação instantânea, sem transformar RSSI em uma medida direta de distância. Perfis anteriores do projeto usaram mediana e média móvel exponencial. Na configuração final ensaiada, foi adotado Kalman escalar, combinado com histerese e permanência mínima. A histerese estabelece limites diferentes para entrar e sair de um estado; a permanência exige evidência por um intervalo antes da transição. Os parâmetros e as diferenças entre as variantes são apresentados no desenvolvimento.',
    'O serviço em primeiro plano melhora': 'O serviço em primeiro plano melhora a continuidade, mas não torna o aplicativo imune a todas as decisões do sistema. Fabricantes podem aplicar políticas próprias de economia, o usuário pode forçar a parada e permissões podem ser removidas. A implementação verifica condições de comunicação e permissões, enquanto a notificação persistente sinaliza a execução do monitoramento. Ferramentas detalhadas de prontidão e ensaio permaneceram restritas ao desenvolvimento, fora da interface comum do APK distribuído.',
    'A indicação foi comparada com multímetro': None,
    'A bateria LiPo foi conectada ao circuito': 'A bateria LiPo foi conectada ao circuito de carga da XIAO. A tensão lida pelo ADC é convertida para uma estimativa da tensão da célula e comparada com leituras relatadas de multímetro. As comparações elétricas e suas limitações são apresentadas nos resultados. O percentual é calculado por tensão, não por contagem de carga, e pode variar com carga instantânea, recarga e retirada do USB.',
    'O filtro EMA foi configurado': 'As revisões de filtragem foram comparadas sem confundir resultados históricos com a versão final. A mediana e a EMA de coeficiente 0,30 aparecem em perfis anteriores; a variante K2-W1 emprega Kalman escalar Q1/R4. Histerese, inicialização com várias amostras e confirmação temporal complementam a filtragem. O alcance reduzido permite bipe lento no vestível e aviso no telefone, conforme a configuração, enquanto a emergência permanece retida até confirmação aceita pela placa.',
    'A distância é estimada pelo modelo': 'A distância exibida é uma estimativa por modelo logarítmico, d = 10^((A − RSSI)/(10n)). A variante D1 utiliza A = −63,386376 dBm e n = 3,377961, obtidos por ajuste das coletas de 15 de outubro. Esses coeficientes não são constantes universais nem prova de exatidão. Fórmula de apresentação e política de alertas são mecanismos distintos: os estados usam o sinal filtrado e sua evolução temporal.',
    'Um relatório inicial no Galaxy S24 Ultra': 'Os roteiros foram acompanhados por registros do aplicativo, exportações CSV, relatórios locais e respostas durante os testes. A validação final foi conduzida no Galaxy S24 Ultra. Verificações automatizadas de contrato e lógica foram mantidas separadas dos ensaios físicos. Não foram tratados como resultados medidos os comportamentos apenas previstos no código ou observados em outro protótipo.',
    'Para a estimativa de distância, o procedimento previsto': 'Para avaliar a estimativa, foram marcadas distâncias físicas e coletadas séries com os dispositivos parados. As campanhas incluíram posições no chão, elevadas e situações de obstrução relatadas. Depois de 10 s de acomodação, a ferramenta registrava 30 notificações com identificadores novos de RSSI e exportava as amostras. As campanhas e versões são analisadas separadamente: não se pressupõe igualdade de altura, orientação ou ambiente quando essas informações não constam nos registros.',
    'A bateria foi carregada pela USB-C': 'No ensaio preliminar de setembro, a bateria foi carregada pela USB-C da XIAO e o cabo foi removido para a observação em bateria. O vestível permaneceu conectado ao Galaxy S24 Ultra, com saídas automáticas de alerta temporariamente bloqueadas. O intervalo foi medido entre os indicadores inicial e final, sem descarga forçada até o corte da proteção. Não se mediu corrente acumulada.',
    'A fixação interna foi padronizada': 'A fixação interna utiliza passantes para abraçadeiras de nylon e apoios adequados ao conjunto soldado. O buzzer fica elevado sobre a região dos componentes externos. A bateria utiliza berço fixo com passagem inferior; o suporte específico do conector branco e guias de fios desnecessárias foram retirados nas revisões. O botão eletrônico se apoia sob a tampa e recebe prolongador externo e trava de retenção. As dimensões de folga foram revistas após a impressão real.',
}

SUMMARY_PT = ('Este trabalho apresenta o desenvolvimento e a avaliação do Escolta UNITAU, um protótipo acadêmico composto por dispositivo vestível e aplicativo Android para monitoramento experimental de proximidade por Bluetooth Low Energy (BLE). O dispositivo foi montado com Seeed Studio XIAO nRF52840 Sense, bateria recarregável, circuito de alerta sonoro e botão físico de emergência. O aplicativo foi desenvolvido com React Native e Expo, autenticação Firebase e módulo nativo Android para apoiar a execução em segundo plano. O firmware trata o RSSI com filtragem, histerese e confirmação temporal; a versão final acrescenta supervisão de ausência de atualizações. A emergência permanece ativa até confirmação do responsável aceita pelo dispositivo. O método foi aplicado, experimental e iterativo, com coletas em distâncias físicas conhecidas, testes funcionais, verificações automatizadas e revisões da caixa impressa em 3D. A campanha quantitativa de 17 de outubro reuniu 210 amostras em sete distâncias, com erro absoluto médio de aproximadamente 1,26 m na configuração D1, anterior ao filtro final, e mostrou que uma leitura estável pode subestimar a distância real. Os ajustes posteriores receberam aceite funcional no cenário ensaiado, sem demonstrar fronteiras métricas universais. Foram aprovados 211 testes automatizados e a verificação de tipos, além de roteiros de uso sem servidor no Samsung Galaxy S24 Ultra. O ensaio histórico de bateria registrou 11 h 10 min entre 90% e 5% estimados, em configuração anterior e com saídas automáticas bloqueadas. A integração mostrou viabilidade como prova de conceito; permanecem limitações de propagação, autonomia atual, diversidade de aparelhos e certificação. O protótipo não fornece a localização geográfica da criança nem substitui supervisão humana.')
SUMMARY_EN = ('This work presents the development and evaluation of Escolta UNITAU, an academic prototype comprising a wearable device and an Android application for experimental proximity monitoring through Bluetooth Low Energy (BLE). The device uses a Seeed Studio XIAO nRF52840 Sense board, a rechargeable battery, an audible alert circuit, and a physical emergency button. The application was developed with React Native and Expo, Firebase authentication, and a native Android module supporting background operation. The firmware combines RSSI filtering, hysteresis, and time-based confirmation; the final version also supervises missing updates. An emergency remains active until the device accepts a caregiver confirmation. The applied, experimental, iterative method included measurements at known physical distances, functional tests, automated checks, and revisions of a 3D-printed enclosure. The quantitative campaign of October 17 comprised 210 samples at seven distances and yielded a mean absolute error of approximately 1.26 m with the D1 configuration, before the final filter. It also showed that stable readings may underestimate actual distance. Subsequent adjustments received functional acceptance under the tested conditions, without establishing universal metric boundaries. All 211 automated tests and type checks passed, and standalone use scenarios were accepted on a Samsung Galaxy S24 Ultra. A historical battery test recorded 11 h 10 min between estimated levels of 90% and 5%, using an earlier configuration with automatic alert outputs disabled. The integration supports the feasibility of a proof of concept, while propagation, current battery life, phone diversity, and certification remain limitations. The prototype does not provide the child’s geographical location and does not replace human supervision.')

REFERENCES = [
    'ANDROID DEVELOPERS. Communicate in the background. [S. l.], 2026a. Disponível em: https://developer.android.com/develop/connectivity/bluetooth/ble/background. Acesso em: 4 nov. 2026.',
    'ANDROID DEVELOPERS. Foreground service types. [S. l.], 2026b. Disponível em: https://developer.android.com/develop/background-work/services/fgs/service-types. Acesso em: 4 nov. 2026.',
    'ARDUINO. ArduinoBLE library. [S. l.], [s. d.]. Disponível em: https://docs.arduino.cc/libraries/arduinoble/. Acesso em: 18 set. 2026.',
    'BLUETOOTH SIG. The Bluetooth Low Energy primer. [S. l.], [s. d.]. Disponível em: https://www.bluetooth.com/bluetooth-le-primer/. Acesso em: 4 nov. 2026.',
    'CAO, Zhipeng et al. An infant monitoring system with the support of accurate real-time indoor positioning. Geo-spatial Information Science, v. 22, n. 4, p. 279–289, 2019. DOI: https://doi.org/10.1080/10095020.2019.1631617.',
    'EXPO. Development builds FAQ. [S. l.], 2026. Disponível em: https://docs.expo.dev/develop/development-builds/faq/. Acesso em: 18 set. 2026.',
    'FARAGHER, Ramsey; HARLE, Robert. Location fingerprinting with Bluetooth Low Energy beacons. IEEE Journal on Selected Areas in Communications, v. 33, n. 11, p. 2418–2428, 2015. DOI: https://doi.org/10.1109/JSAC.2015.2430281.',
    'FU, Xiang; UCHIYAMA, Hidetoshi; HATANO, Hiroyuki; ITO, Atsushi. A study on observing a lost child using BLE beacons. In: INTERNATIONAL SYMPOSIUM ON COMPUTING AND NETWORKING WORKSHOPS, 6., 2018, Takayama. Proceedings [...]. IEEE, 2018. p. 67–70. DOI: https://doi.org/10.1109/CANDARW.2018.00021.',
    'NORDIC SEMICONDUCTOR. nRF52840 Product Specification. [S. l.], [s. d.]. Disponível em: https://docs.nordicsemi.com/bundle/ps_nrf52840/. Acesso em: 18 set. 2026.',
    'RAPPAPORT, Theodore S. Wireless communications: principles and practice. 2. ed. Upper Saddle River: Prentice Hall, 2002.',
    'REACT NATIVE. React Native: learn once, write anywhere. [S. l.], 2026. Disponível em: https://reactnative.dev/. Acesso em: 18 set. 2026.',
    'SAKPHROM, Siraporn; SUWANNARAT, Korakot; HAIGES, Rina; FUNSIAN, Krit. A simplified and high accuracy algorithm of RSSI-based localization zoning for children tracking in-out the school buses using Bluetooth Low Energy beacon. Informatics, v. 8, n. 4, art. 65, 2021. DOI: https://doi.org/10.3390/informatics8040065.',
    'SEEED STUDIO. Getting started with Seeed Studio XIAO nRF52840 Series. [S. l.], [s. d.]. Disponível em: https://wiki.seeedstudio.com/XIAO_BLE/. Acesso em: 4 nov. 2026.',
]

FIGURES = ['Figura 1 – Arquitetura funcional do protótipo',
           'Figura 2 – Registro dimensional da placa e do conjunto soldado',
           'Figura 3 – Estimativas e dispersão observadas na campanha D1']
QUADROS = ['Quadro 1 – Componentes empregados no protótipo', 'Quadro 2 – Ferramentas utilizadas',
           'Quadro 3 – Características do serviço GATT', 'Quadro 4 – Parâmetros do classificador K2-W1',
           'Quadro 5 – Resultados da campanha D1 de 17/10/2026',
           'Quadro 6 – Síntese dos roteiros funcionais', 'Quadro 7 – Registro histórico de autonomia']

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def field(paragraph, code):
    fld = OxmlElement('w:fldSimple')
    fld.set(qn('w:instr'), code)
    paragraph._p.append(fld)

def styled(p, size=12, indent=True, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
    p.alignment = align
    f = p.paragraph_format
    f.first_line_indent = Cm(1.25 if indent else 0)
    f.line_spacing = 1.5 if size == 12 else 1
    f.space_after = Pt(0)
    f.widow_control = True
    for r in p.runs:
        r.font.name, r.font.size = 'Times New Roman', Pt(size)
        r.font.color.rgb = RGBColor(0, 0, 0)

ENGLISH = re.compile(r'(Bluetooth Low Energy|Generic Attribute Profile|Internet of Things|Exponential Moving Average|firmware|hardware|software|framework|watchdog|debounce|pull-up|beacons?|smartphones?|fingerprinting|callbacks?|hook|GPIO|duty cycle)', re.I)

def add_text_runs(p, text):
    pos = 0
    for m in ENGLISH.finditer(text):
        p.add_run(text[pos:m.start()])
        p.add_run(m.group()).italic = True
        pos = m.end()
    p.add_run(text[pos:])

def para(doc, text, size=12, indent=True, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
    p = doc.add_paragraph()
    add_text_runs(p, text)
    styled(p, size, indent, align)
    return p

def heading(doc, text, level=1, numbered=True):
    p = doc.add_paragraph(text, style=f'Heading {level}' if numbered else 'Normal')
    styled(p, indent=False, align=WD_ALIGN_PARAGRAPH.LEFT if numbered else WD_ALIGN_PARAGRAPH.CENTER)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_before = Pt(18 if level > 1 else 0)
    p.paragraph_format.space_after = Pt(12)
    if level == 1:
        p.paragraph_format.page_break_before = True
    for run in p.runs:
        run.bold = True
    return p

def table(doc, title, rows, source):
    caption = para(doc, title, 10, False, WD_ALIGN_PARAGRAPH.LEFT)
    caption.paragraph_format.keep_with_next = True
    t = doc.add_table(rows=1, cols=len(rows[0]))
    t.autofit = False
    try:
        t.style = 'Table Grid'
    except KeyError:
        pass
    for i, row in enumerate(rows):
        cells = t.rows[0].cells if i == 0 else t.add_row().cells
        for cell, text in zip(cells, row):
            cell.text = str(text)
            for p in cell.paragraphs:
                styled(p, 10, False, WD_ALIGN_PARAGRAPH.LEFT)
                p.paragraph_format.space_after = Pt(3)
                p.paragraph_format.space_before = Pt(3)
                p.paragraph_format.keep_with_next = len(rows) <= 9 and i < len(rows)-1
                if i == 0:
                    for run in p.runs:
                        run.bold = True
        trpr = t.rows[i]._tr.get_or_add_trPr()
        trpr.append(OxmlElement('w:cantSplit'))
        if i == 0:
            trpr.append(OxmlElement('w:tblHeader'))
    para(doc, source, 10, False, WD_ALIGN_PARAGRAPH.LEFT)
    para(doc, '', 10, False)

def image(doc, title, path, source, width=14):
    p = para(doc, title, 10, False, WD_ALIGN_PARAGRAPH.LEFT)
    p.paragraph_format.keep_with_next = True
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(str(path), width=Cm(width))
    para(doc, source, 10, False, WD_ALIGN_PARAGRAPH.LEFT)

def make_figures():
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyBboxPatch
    plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 11})
    ASSETS.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(9, 4.6))
    ax.set(xlim=(0, 10), ylim=(0, 6)); ax.axis('off')
    for x, y, w, h, label in [(.3, 2.5, 3.6, 2.7, 'VESTÍVEL\nXIAO + bateria\nBotão, buzzer e LED\nFiltro, estados e watchdog'),
                               (5.8, 2.5, 3.9, 2.7, 'CELULAR ANDROID\nComunicação e controlador\nInterface, histórico e alertas\nServiço nativo em Kotlin'),
                               (5.8, .2, 3.9, 1.25, 'SERVIÇOS EXTERNOS\nAutenticação / e-mail opcional')]:
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.05', facecolor='#f2f4f7', edgecolor='#203448', linewidth=1.4))
        ax.text(x+w/2, y+h/2, label, ha='center', va='center', linespacing=1.6)
    ax.annotate('', xy=(5.65, 3.7), xytext=(4.05, 3.7), arrowprops=dict(arrowstyle='<->', color='#203448', lw=1.6))
    ax.text(4.85, 4.2, 'BLE / GATT', ha='center', fontsize=10)
    ax.annotate('', xy=(7.75, 1.55), xytext=(7.75, 2.35), arrowprops=dict(arrowstyle='<->', color='#6c7580', lw=1.3))
    ax.text(7.95, 1.96, 'Internet', va='center', fontsize=9)
    fig.savefig(ASSETS/'arquitetura.png', dpi=300, bbox_inches='tight'); plt.close(fig)
    datafile = ROOT/'docs/testes/dados/Escolta_2026-10-17_14-50-10-790_historico_amostras.csv'
    grouped = defaultdict(list)
    with datafile.open(encoding='utf-8-sig', newline='') as f:
        for row in csv.DictReader(f, delimiter=';'):
            grouped[float(row['distancia_real_m'])].append(float(row['distancia_estimada_m']))
    assert sum(map(len, grouped.values())) == 210 and len(grouped) == 7
    xs = sorted(grouped); ys = [mean(grouped[x]) for x in xs]
    fig, ax = plt.subplots(figsize=(8, 4.8))
    ax.plot([0, 11], [0, 11], '--', color='#666666', label='Estimativa igual à distância real')
    ax.errorbar(xs, ys, yerr=[[mean(grouped[x])-min(grouped[x]) for x in xs], [max(grouped[x])-mean(grouped[x]) for x in xs]], fmt='o', color='#174a75', capsize=5, label='Média e faixa observada (mínimo–máximo)')
    ax.set(xlabel='Distância real marcada (m)', ylabel='Distância estimada (m)', xlim=(0, 11), ylim=(0, 11), xticks=[1,2,3,4,5,7,10])
    ax.grid(alpha=.2); ax.legend(loc='upper left', fontsize=9)
    fig.tight_layout(); fig.savefig(ASSETS/'campanha_d1.png', dpi=300); plt.close(fig)
    return [{'real_m': x, 'n':len(grouped[x]), 'mean_m':mean(grouped[x]), 'min_m':min(grouped[x]), 'max_m':max(grouped[x])} for x in xs]

def main():
    if not SOURCE.is_file():
        raise FileNotFoundError('Baixe e confira o original do Drive antes de gerar a revisão.')
    BACKUP.parent.mkdir(parents=True, exist_ok=True)
    if BACKUP.exists() and sha(BACKUP) != sha(SOURCE):
        raise RuntimeError('O backup existente não corresponde ao original. Não sobrescrever.')
    if not BACKUP.exists():
        shutil.copy2(SOURCE, BACKUP)
    assert sha(SOURCE) == sha(BACKUP)
    doc = Document(SOURCE)
    original = list(doc.paragraphs)
    assert len(original) == 339 and original[309].text == '4 DESENVOLVIMENTO', 'Fonte diferente da revisão examinada.'
    for p in original:
        text = p.text.strip()
        if text.startswith('A segurança infantil em ambientes'):
            p.clear(); add_text_runs(p, SUMMARY_PT); styled(p, indent=False)
        elif text.startswith('Child safety in crowded'):
            p.clear(); p.add_run(SUMMARY_EN); styled(p, indent=False)
        else:
            for prefix, replacement in REPLACEMENTS.items():
                if replacement is not None and text.startswith(prefix):
                    p.clear(); add_text_runs(p, replacement); styled(p)
                    break
        # Atualiza as citações de fontes online sem inventar versão bibliográfica.
        if 'BLUETOOTH SIG, 2022' in p.text:
            txt = p.text.replace('BLUETOOTH SIG, 2022', 'Bluetooth SIG, [s. d.]')
            p.clear(); add_text_runs(p, txt); styled(p)
        if 'Nordic Semiconductor (2024)' in p.text:
            txt = p.text.replace('Nordic Semiconductor (2024)', 'Nordic Semiconductor ([s. d.])').replace('(SEEED STUDIO, 2026)', '(Seeed Studio, [s. d.])')
            p.clear(); add_text_runs(p, txt); styled(p)
    # Atende a ligação solicitada pelo orientador sem apagar o parágrafo/comentário original.
    bridge = original[178].insert_paragraph_before('')
    original[178]._p.addnext(bridge._p)
    add_text_runs(bridge, 'Diante dessa dificuldade de perceber o afastamento, o projeto investiga uma forma de apoiar o responsável com avisos locais. Para essa finalidade, foi escolhida uma comunicação disponível no telefone e compatível com alimentação por bateria, sem exigir infraestrutura instalada no ambiente.')
    styled(bridge)
    # Recria apenas listas/sumário incompletos; preserva a quebra de seção do template.
    sect = deepcopy(original[175]._p.pPr.sectPr)
    anchor = original[129]
    front_items = []
    def before(text='', heading_flag=False):
        p = anchor.insert_paragraph_before(text)
        styled(p, indent=False, align=WD_ALIGN_PARAGRAPH.CENTER if heading_flag else WD_ALIGN_PARAGRAPH.LEFT)
        if heading_flag:
            p.paragraph_format.page_break_before = True
            p.paragraph_format.space_after = Pt(18)
            for run in p.runs: run.bold = True
        front_items.append(p)
        return p
    before('LISTA DE FIGURAS', True)
    for title in FIGURES: before(title)
    before('LISTA DE QUADROS', True)
    for title in QUADROS: before(title)
    before('LISTA DE ABREVIATURAS E SIGLAS', True)
    for text in ['ADC – Conversor Analógico-Digital', 'APK – Android Package', 'BLE – Bluetooth Low Energy',
                 'CSV – Comma-Separated Values', 'EMA – Média Móvel Exponencial', 'FDM – Modelagem por Deposição de Material Fundido',
                 'GATT – Generic Attribute Profile', 'GPIO – General-Purpose Input/Output', 'IoT – Internet das Coisas',
                 'LiPo – Bateria de Polímero de Lítio', 'RSSI – Indicador da Intensidade do Sinal Recebido',
                 'USB – Universal Serial Bus', 'UUID – Identificador Universalmente Exclusivo']:
        before(text)
    before('SUMÁRIO', True)
    p = before(); field(p, ' TOC \\o "1-3" \\h \\z \\u ')
    endfront = before(); endfront._p.get_or_add_pPr().append(sect)
    for p in original[129:176]: p._p.getparent().remove(p._p)
    # Preserva as tabelas do template, atualizando afirmações sem evidência.
    for t in doc.tables:
        for row in list(t.rows):
            if row.cells[0].text == 'Telefone adicional':
                t._tbl.remove(row._tr)
                continue
            if row.cells[0].text == 'Buzzer': row.cells[1].text = 'Ativo; modelo não identificado'
            if row.cells[0].text == 'Diodo': row.cells[2].text = 'Proteção prevista no estágio; necessidade específica não caracterizada'
            if row.cells[0].text == 'Persistência': row.cells[2].text = 'AsyncStorage para dados locais; Firebase para autenticação'
            if row.cells[0].text == 'Fabricação': row.cells[1].text = 'Impressão FDM; material específico não caracterizado'
            for c in row.cells:
                for p in c.paragraphs: styled(p, 10, False, WD_ALIGN_PARAGRAPH.LEFT)
            row._tr.get_or_add_trPr().append(OxmlElement('w:cantSplit'))
    # Capítulos 1–3 mantêm organização e conteúdo correto do original.
    for p in original[176:309]:
        text = p.text.strip()
        if not text and not p._p.xpath('.//w:sectPr | .//w:br | .//w:commentRangeStart | .//w:commentRangeEnd | .//w:drawing'):
            p._p.getparent().remove(p._p)
            continue
        if re.match(r'^\d+(?:\.\d+){0,2}\s+\D', text):
            number = text.split()[0]; level = number.count('.')+1
            p.style = doc.styles[f'Heading {level}']
            styled(p, indent=False, align=WD_ALIGN_PARAGRAPH.LEFT)
            p.paragraph_format.keep_with_next = True
            p.paragraph_format.space_before = Pt(18 if level>1 else 0)
            p.paragraph_format.space_after = Pt(12)
            p.paragraph_format.page_break_before = level == 1
            for run in p.runs: run.bold = True
        elif text.startswith(('Fonte:', 'Quadro ')):
            styled(p, 10, False, WD_ALIGN_PARAGRAPH.LEFT)
            p.paragraph_format.keep_with_next = text.startswith('Quadro ')
        elif text:
            styled(p)
    body = doc._element.body
    start = list(body).index(original[309]._p)
    for e in list(body)[start:]:
        if e.tag != qn('w:sectPr'): body.remove(e)
    for level in [1,2,3]:
        s = doc.styles[f'Heading {level}']
        s.font.name, s.font.size, s.font.bold = 'Times New Roman', Pt(12), True
        s.font.color.rgb = RGBColor(0,0,0)
    doc.styles['Normal'].font.name = 'Times New Roman'
    doc.styles['Normal'].font.size = Pt(12)
    data = make_figures()
    for block in CONTENT.read_text(encoding='utf-8').split('\n\n'):
        block=block.strip()
        if not block: continue
        if block.startswith('#'):
            level=len(block)-len(block.lstrip('#')); heading(doc, block[level:].strip(),level)
        elif block == '[[ARQUITETURA]]':
            image(doc, FIGURES[0], ASSETS/'arquitetura.png', 'Fonte: elaboração própria (2026), a partir da implementação do protótipo.')
        elif block == '[[PLACA]]':
            image(doc, FIGURES[1], ROOT/'docs/prototipo/fotos/WhatsApp Image 2026-09-24 at 19.42.54.jpeg', 'Fonte: acervo próprio (2026). Registro dimensional durante o desenvolvimento; não representa ensaio metrológico.', 13)
        elif block == '[[GATT]]':
            table(doc, QUADROS[2], [['Finalidade','Sufixo UUID','Operação'],['Estado/telemetria','e5c1f4a1','Leitura e notificação'],['Som','e5c1f4a2','Escrita de comando'],['Confirmação/reset','e5c1f4a3','Solicitação de encerramento'],['RSSI do telefone','e5c1f4a4','Escrita periódica'],['Controle de espera','e5c1f4a5','Pausa/retomada']], 'Fonte: elaboração própria (2026), a partir do contrato em bleApi.ts e do firmware XIAO.')
        elif block == '[[LIMITES]]':
            table(doc, QUADROS[3], [['Parâmetro','Valor programado'],['Atenção: entrada / saída','−77 / −72 dBm'],['Perigo: entrada / saída','−90 / −86 dBm'],['Confirmação de entrada','4 s'],['Retorno do classificador','2 s'],['Inicialização / candidato','5 amostras / mínimo de 3'],['Lacuna de leituras','2,5 s'],['Watchdog de RSSI na placa','8 s']], 'Fonte: elaboração própria (2026), a partir de ProximitySignal.h e CommunicationWatchdog.h. Valores não equivalem a metros garantidos.')
        elif block == '[[DISTANCIAS]]':
            fmt=lambda v:f'{v:.2f}'.replace('.',',')
            rows=[['Real (m)','Média (m)','Mín.–máx. (m)','Erro abs. médio (m)']]
            errors={1:.20,2:.76,3:.59,4:.42,5:2.52,7:1.94,10:2.40}
            for x in data: rows.append([str(int(x['real_m'])),fmt(x['mean_m']),f"{fmt(x['min_m'])}–{fmt(x['max_m'])}",fmt(errors[x['real_m']])])
            table(doc,QUADROS[4],rows,'Fonte: elaboração própria (2026), com 30 amostras por distância do CSV de 17/10/2026. Variante D1 anterior a K2-W1.')
        elif block == '[[GRAFICO]]':
            image(doc,FIGURES[2],ASSETS/'campanha_d1.png','Fonte: elaboração própria (2026), a partir das 210 amostras D1 de 17/10. Barras representam mínimo–máximo observado, não intervalo de confiança.')
        elif block == '[[FUNCIONAIS]]':
            table(doc,QUADROS[5],[['Cenário','Resultado acompanhado','Tipo de evidência'],['Conexão e espera','Conecta sem alarme; espera intencional silenciosa','Relato funcional'],['Atenção e retorno','Bipe lento; retorno próximo a protegido','Relato em variantes identificadas'],['Pânico e confirmação','Sem vínculo não encerra; exige resposta aceita','Repetição de roteiro'],['Recentes e bloqueio','Continuidade aceita por 2 min na oficial','Relato; um modelo'],['Botão reparado','Funcionando na oficial; aceite em 04/11','Relato; sem latência medida'],['Autenticação Google','Acesso na identidade oficial sem Metro','Relato funcional'],['Registros/exportação','Compartilhamento após correções do fluxo','Relato funcional']], 'Fonte: elaboração própria (2026), a partir dos registros de acompanhamento. Não é certificação ou estatística de confiabilidade.')
        elif block == '[[AUTONOMIA]]':
            table(doc,QUADROS[6],[['Momento','Horário','Indicação','Tensão'],['Início','08/09, 19h52','90%','4,09 V'],['Aviso baixo','09/09, 5h56','10%','3,58 V'],['Encerramento','09/09, 7h02','5%','3,54 V']], 'Fonte: registro próprio do ensaio de 08–09/09/2026, anterior à configuração atual. Duração observada: 11 h 10 min.')
        else:
            para(doc,block.replace('\n',' '))
    heading(doc,'REFERÊNCIAS',numbered=False)
    for ref in REFERENCES:
        p=para(doc,ref,12,False,WD_ALIGN_PARAGRAPH.LEFT)
        p.paragraph_format.line_spacing=1
        p.paragraph_format.space_after=Pt(12)
    for section in doc.sections:
        section.page_width,section.page_height=Cm(21),Cm(29.7)
        section.top_margin,section.left_margin=Cm(3),Cm(3)
        section.bottom_margin,section.right_margin=Cm(2),Cm(2)
    # Remove marcações de campo antigo do Word; solicita atualização do sumário.
    setting=OxmlElement('w:updateFields'); setting.set(qn('w:val'),'true');doc.settings.element.append(setting)
    doc.core_properties.title='Escolta UNITAU: protótipo vestível para monitoramento de proximidade infantil por Bluetooth Low Energy'
    doc.core_properties.author='Nicolas Venciguerra Men; Rafael Gonçalves Dedini'
    doc.core_properties.comments='Revisão técnica de 04/11/2026. Autonomia da configuração atual ainda não medida; aprovação acadêmica pelo orientador pendente.'
    doc.save(OUT)
    verification=Document(OUT)
    text='\n'.join(p.text for p in verification.paragraphs)
    for prohibited in ['Capítulo reservado','A etapa seguinte deste capítulo','Zhang et al. (2020)','referência utilizada é -71','Ensaios adicionais em um aparelho Xiaomi','A faixa de atenção deixou de acionar som']:
        assert prohibited not in text,prohibited
    for required in ['4.9 DISTRIBUIÇÃO','5.7 DISCUSSÃO','6 CONCLUSÃO','−90','Kalman','1,26 m','8.256 ms','ainda não foi implementado']:
        assert required in text,required
    assert len(verification.inline_shapes)==3 and len(verification.tables)==7
    evidence={'source_drive_id':'1DhnyRvAgA25Ioz3kZwKFdNv8MnQj-EA_', 'source_sha256':sha(SOURCE),'backup':str(BACKUP.relative_to(ROOT)), 'output_sha256_before_word':sha(OUT), 'source_preserved':sha(SOURCE)==sha(BACKUP), 'paragraphs':len(verification.paragraphs), 'tables':len(verification.tables),'images':len(verification.inline_shapes),'d1':data,'status':'revisão técnica; pendente atualização de campos/renderização e revisão humana; sem nova autonomia'}
    (ROOT/'docs/tcc/VERIFICACAO_REVISAO_2026-11-04.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(evidence,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
