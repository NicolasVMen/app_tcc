# -*- coding: utf-8 -*-
"""
Gera o capítulo introdutório do TCC - ESCOLTA UNITAU
Formatado nas normas ABNT para a disciplina de Humanidades
Profª Dra. Fabrina Moreira Silva - UNITAU
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
import os

def criar_documento():
    doc = Document()

    # =========================================================
    # CONFIGURAR MARGENS ABNT (3cm esq/sup, 2cm dir/inf)
    # =========================================================
    for section in doc.sections:
        section.top_margin = Cm(3)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(3)
        section.right_margin = Cm(2)

    # =========================================================
    # ESTILOS GLOBAIS
    # =========================================================
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Times New Roman'
    style_normal.font.size = Pt(12)
    style_normal.paragraph_format.line_spacing = 1.5
    style_normal.paragraph_format.space_after = Pt(0)
    style_normal.paragraph_format.space_before = Pt(0)
    style_normal.font.color.rgb = RGBColor(0, 0, 0)

    # =========================================================
    # CAPA
    # =========================================================
    # Espaços antes do conteúdo da capa
    for _ in range(4):
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.5

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('UNIVERSIDADE DE TAUBATÉ – UNITAU')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(14)
    run.bold = True

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Curso de Engenharia de Computação')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(14)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Disciplina: Humanidades')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Profª Dra. Fabrina Moreira Silva')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)

    # Espaços
    for _ in range(6):
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.5

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('ESCOLTA UNITAU: DISPOSITIVO VESTÍVEL PARA MONITORAMENTO DE PROXIMIDADE E SEGURANÇA INFANTIL BASEADO EM ESP32 E APLICATIVO MOBILE')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(16)
    run.bold = True

    # Espaços
    for _ in range(6):
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.5

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Nicolas Venciguerra')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(14)

    # Espaços
    for _ in range(8):
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.5

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Taubaté – SP')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('2026')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)

    # =========================================================
    # QUEBRA DE PÁGINA
    # =========================================================
    doc.add_page_break()

    # =========================================================
    # FUNÇÕES AUXILIARES
    # =========================================================
    def add_titulo_secao(texto):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(12)
        p.paragraph_format.line_spacing = 1.5
        run = p.add_run(texto)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        run.bold = True
        return p

    def add_paragrafo(texto, recuo_primeira=True):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.line_spacing = 1.5
        p.paragraph_format.space_after = Pt(6)
        if recuo_primeira:
            p.paragraph_format.first_line_indent = Cm(1.25)
        run = p.add_run(texto)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        return p

    def add_citacao_direta(texto):
        """Citação direta longa (mais de 3 linhas) - recuo 4cm, fonte 10, sem aspas"""
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(12)
        p.paragraph_format.left_indent = Cm(4)
        run = p.add_run(texto)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)
        return p

    # =========================================================
    # 1. APRESENTAÇÃO DO TEMA
    # =========================================================
    add_titulo_secao('1. APRESENTAÇÃO DO TEMA')

    add_paragrafo(
        'O presente trabalho tem como tema o desenvolvimento do Escolta UNITAU, '
        'um sistema de segurança infantil composto por um dispositivo vestível '
        'baseado no microcontrolador ESP32 e um aplicativo mobile desenvolvido '
        'em React Native. O projeto propõe uma solução tecnológica de baixo custo '
        'para o monitoramento de proximidade entre crianças e seus responsáveis, '
        'utilizando a intensidade do sinal Wi-Fi (RSSI – Received Signal Strength '
        'Indicator) como parâmetro para determinar a distância entre o dispositivo '
        'vestível e o smartphone do cuidador.'
    )

    add_paragrafo(
        'O sistema opera em dois modos: o modo "Casa", no qual o dispositivo se '
        'conecta a uma rede Wi-Fi doméstica existente; e o modo "Rua", no qual o '
        'próprio ESP32 gera uma rede local independente, permitindo o monitoramento '
        'mesmo sem infraestrutura de internet. Quando o sinal enfraquece além de '
        'limiares pré-configurados, alertas progressivos são acionados – desde '
        'avisos visuais e sonoros no aplicativo até um alarme de pânico com buzzer '
        'físico no dispositivo. Este tema se insere na Engenharia de Computação ao '
        'integrar sistemas embarcados, redes sem fio e desenvolvimento mobile, mas '
        'sua relevância transcende o aspecto técnico, dialogando com questões de '
        'segurança pública, proteção à infância e responsabilidade social da '
        'engenharia.'
    )

    # =========================================================
    # 2. CONTEXTUALIZAÇÃO DO PROBLEMA
    # =========================================================
    add_titulo_secao('2. CONTEXTUALIZAÇÃO DO PROBLEMA')

    add_paragrafo(
        'O desaparecimento de crianças e adolescentes constitui um dos problemas '
        'mais graves da sociedade brasileira contemporânea. Segundo o Anuário '
        'Brasileiro de Segurança Pública, o Brasil registrou 23.919 casos de '
        'crianças e adolescentes desaparecidos em 2025, uma média de 66 menores '
        'por dia – aumento de 8% em relação a 2024. Dentre os desaparecidos, 61% '
        'eram do sexo feminino (FÓRUM BRASILEIRO DE SEGURANÇA PÚBLICA, 2025). '
        'Geograficamente, São Paulo liderou com 5.015 casos, seguido por Rio Grande '
        'do Sul (3.102) e Minas Gerais (2.487), o que confere relevância local ao '
        'projeto, dado que Taubaté se situa no estado líder das estatísticas '
        '(SINESP, 2025).'
    )

    add_paragrafo(
        'Embora nem todos os casos envolvam situações criminais – muitos decorrem '
        'de crianças que se perdem dos responsáveis em shoppings, praias, parques '
        'e eventos –, a situação expõe os menores a riscos significativos. É nesse '
        'intervalo entre o momento em que a criança se afasta e o momento em que é '
        'localizada que reside a janela de vulnerabilidade que o Escolta pretende '
        'reduzir.'
    )

    add_paragrafo(
        'As soluções tecnológicas existentes – como rastreadores GPS e dispositivos '
        'Bluetooth – apresentam limitações relevantes: alto custo, dependência de '
        'planos de dados celulares e complexidade de configuração que dificulta a '
        'adoção por famílias de menor poder aquisitivo. O Escolta UNITAU surge '
        'como alternativa acessível, utilizando a infraestrutura Wi-Fi disponível '
        'ou a capacidade do próprio ESP32 de criar uma rede local, eliminando '
        'custos recorrentes de conectividade.'
    )

    # =========================================================
    # 3. RELEVÂNCIA SOCIAL E TECNOLÓGICA
    # =========================================================
    add_titulo_secao('3. RELEVÂNCIA SOCIAL E TECNOLÓGICA')

    add_paragrafo(
        'A relevância social do Escolta UNITAU reside na democratização do acesso '
        'à tecnologia de segurança infantil. Soluções comerciais como rastreadores '
        'GPS e smartwatches infantis possuem custos entre R$ 300 e R$ 1.500, '
        'valores proibitivos para grande parte das famílias brasileiras. O ESP32, '
        'um microcontrolador de código aberto com Wi-Fi integrado, pode ser '
        'adquirido por menos de R$ 30, e o aplicativo funciona em qualquer '
        'smartphone Android ou iOS (IBGE, 2024).'
    )

    add_paragrafo(
        'Dados da PNAD Contínua (2024) indicam que 89% da população brasileira '
        'acessou a internet, porém apenas 22% possui "conectividade significativa" '
        '– acesso diário com dispositivo adequado e habilidades digitais para uso '
        'pleno. Famílias de baixa renda dependem quase exclusivamente do '
        'smartphone, e cerca de 35% dos que recebem até um salário mínimo ficam '
        'sem acesso por falta de franquia de dados. O modo "Rua" do Escolta, ao '
        'funcionar sem internet, contorna diretamente essa barreira (IBGE, 2024).'
    )

    add_paragrafo(
        'Do ponto de vista tecnológico, a utilização do RSSI como indicador de '
        'proximidade representa uma abordagem pragmática: o que importa não é a '
        'localização absoluta da criança, mas a garantia de que ela permanece '
        'dentro de um raio seguro em relação ao responsável. Além disso, o projeto '
        'está alinhado aos Objetivos de Desenvolvimento Sustentável (ODS) da ONU: '
        'ODS 3 (Saúde e Bem-estar), ODS 9 (Inovação e Infraestrutura), ODS 11 '
        '(Cidades Sustentáveis) e ODS 16 (Paz e Justiça), ao atuar na proteção '
        'infantil com inovação acessível (ORGANIZAÇÃO DAS NAÇÕES UNIDAS, 2015).'
    )

    # =========================================================
    # 4. REFLEXÃO HUMANÍSTICA
    # =========================================================
    add_titulo_secao('4. REFLEXÃO HUMANÍSTICA')

    add_paragrafo(
        'A reflexão humanística sobre o Escolta UNITAU exige reconhecer que a '
        'tecnologia não é neutra. Conforme discutido na disciplina sob a '
        'perspectiva dos estudos em Ciência, Tecnologia e Sociedade (CTS), todo '
        'artefato tecnológico carrega valores e consequências que ultrapassam sua '
        'função técnica imediata. Um dispositivo de monitoramento infantil não é '
        'apenas um circuito eletrônico; é uma ferramenta que redefine relações de '
        'cuidado e pode tanto promover segurança quanto gerar novas formas de '
        'controle.'
    )

    add_paragrafo(
        'É fundamental analisar quem será beneficiado e quem poderá ser excluído. '
        'Embora o Escolta utilize componentes de baixo custo e software aberto, '
        'famílias em extrema vulnerabilidade – sem smartphone ou renda para um '
        'módulo ESP32 – permanecerão à margem dessa proteção. Segundo a PNAD '
        '(2024), entre 20 e 29 milhões de brasileiros estão completamente '
        'desconectados, sendo que 45,6% não sabem utilizar ferramentas digitais. '
        'A exclusão digital é reflexo de desigualdades estruturais que a '
        'tecnologia, por si só, não resolve.'
    )

    add_paragrafo(
        'A perspectiva de Byung-Chul Han enriquece essa análise. Em "Sociedade '
        'do Cansaço", Han (2015) argumenta que vivemos na era do desempenho, na '
        'qual o indivíduo é simultaneamente senhor e escravo de si mesmo, '
        'submetido a um ciclo incessante de autocobrança. Esse esgotamento atinge '
        'diretamente pais e cuidadores, que acumulam funções de sustento, '
        'educação e vigilância. O Escolta alivia a carga emocional ao oferecer '
        'segurança sem exigir vigilância humana constante, amenizando o que Han '
        'chamaria de "violência neuronal". Contudo, o dispositivo não deve se '
        'tornar mais uma fonte de ansiedade digital: a tecnologia deve servir '
        'como apoio ao cuidado humano, nunca como substituto da presença afetiva.'
    )

    add_paragrafo(
        'Leonardo Boff, em "Virtudes para um Outro Mundo Possível" (2006), propõe '
        'que o cuidado é a essência do ser humano e que uma sociedade justa '
        'depende de uma ética que supere a razão puramente instrumental. Boff '
        'defende que máquinas são eficazes no monitoramento, mas não possuem a '
        'capacidade de criar vínculos afetivos ou exercer compaixão. A virtude da '
        '"justa medida" convida a pensar o uso equilibrado da tecnologia: ela '
        'deve servir para garantir a segurança e a convivência fraterna, sem '
        'transformar a relação entre cuidador e criança em controle panóptico. '
        'A tecnologia benevolente, na visão de Boff, é aquela que serve à vida e '
        'fortalece os laços humanos, em vez de substituí-los.'
    )

    # =========================================================
    # 5. O PAPEL DO ENGENHEIRO
    # =========================================================
    add_titulo_secao('5. O PAPEL DO ENGENHEIRO')

    add_paragrafo(
        'Diante dos desafios apresentados, cabe refletir sobre a postura do '
        'engenheiro de computação ao desenvolver uma solução como o Escolta. A '
        'formação técnica, embora indispensável, não é suficiente para garantir '
        'que uma tecnologia seja socialmente responsável. É preciso incorporar '
        'uma consciência ética que considere os impactos de suas decisões sobre '
        'as pessoas e comunidades afetadas.'
    )

    add_paragrafo(
        'No caso deste projeto, responsabilidades específicas emergem em diversas '
        'frentes. Em relação à privacidade, embora toda a comunicação ocorra '
        'localmente via Wi-Fi, é fundamental garantir que o dispositivo não possa '
        'ser explorado para vigilância indevida. Além disso, o engenheiro deve '
        'projetar interfaces intuitivas e documentação clara para pessoas com '
        'diferentes níveis de letramento digital. Conforme Boff (2006) ressalta, '
        'a responsabilidade exige consciência das consequências de nossas práticas, '
        'e a decisão técnica do engenheiro pode ser a diferença entre a proteção '
        'e a exclusão de uma criança.'
    )

    add_paragrafo(
        'Por fim, o uso de hardware aberto e linguagens amplamente documentadas '
        'facilita a replicação e aprimoramento do projeto por outros '
        'desenvolvedores, promovendo a inovação coletiva. Essa postura alinha-se '
        'ao princípio da responsabilidade social do engenheiro: desenvolver '
        'tecnologia não apenas como produto comercial, mas como contribuição para '
        'o bem comum.'
    )

    # =========================================================
    # 6. CONSIDERAÇÕES FINAIS
    # =========================================================
    add_titulo_secao('6. CONSIDERAÇÕES FINAIS')

    add_paragrafo(
        'Ao longo deste capítulo, buscou-se contextualizar o Escolta UNITAU não '
        'apenas como solução técnica, mas como proposta que dialoga com questões '
        'sociais, éticas e humanas. Os quase 24 mil casos de crianças desaparecidas '
        'em 2025 evidenciam a urgência de soluções acessíveis, especialmente em um '
        'país marcado por desigualdades que limitam o acesso às tecnologias '
        'comerciais disponíveis.'
    )

    add_paragrafo(
        'A articulação com os conteúdos da disciplina de Humanidades permitiu '
        'ampliar a compreensão do projeto. Han iluminou o esgotamento dos '
        'cuidadores, justificando ferramentas que aliviem a vigilância constante. '
        'Boff ofereceu o contraponto ao alertar que a tecnologia deve servir à '
        'vida e aos vínculos humanos. Conclui-se que o engenheiro possui uma '
        'responsabilidade que transcende a competência técnica: o Escolta, ao '
        'optar por componentes acessíveis, funcionamento offline e código aberto, '
        'representa um esforço consciente de alinhar inovação tecnológica a '
        'compromisso social.'
    )

    # =========================================================
    # QUEBRA DE PÁGINA - REFERÊNCIAS
    # =========================================================
    doc.add_page_break()

    add_titulo_secao('REFERÊNCIAS')

    referencias = [
        'BOFF, Leonardo. Virtudes para um outro mundo possível. Petrópolis: Vozes, 2006.',
        '',
        'BOFF, Leonardo. Saber cuidar: ética do humano, compaixão pela terra. 20. ed. Petrópolis: Vozes, 2014.',
        '',
        'BRASIL. Instituto Brasileiro de Geografia e Estatística. Pesquisa Nacional por Amostra de Domicílios Contínua – PNAD Contínua 2024: acesso à internet e à televisão e posse de telefone móvel celular para uso pessoal. Rio de Janeiro: IBGE, 2024.',
        '',
        'BRASIL. Ministério da Justiça e Segurança Pública. Painel SINESP – Pessoas Desaparecidas. Brasília, 2025. Disponível em: https://www.gov.br/mj/pt-br/assuntos/sua-seguranca/seguranca-publica/desaparecidos. Acesso em: 7 jun. 2026.',
        '',
        'CENTRO REGIONAL DE ESTUDOS PARA O DESENVOLVIMENTO DA SOCIEDADE DA INFORMAÇÃO (Cetic.br). TIC Domicílios 2024. São Paulo: Cetic.br, 2024.',
        '',
        'FÓRUM BRASILEIRO DE SEGURANÇA PÚBLICA. Anuário Brasileiro de Segurança Pública 2025. São Paulo: FBSP, 2025. Disponível em: https://forumseguranca.org.br/publicacoes/anuario-brasileiro-de-seguranca-publica/. Acesso em: 7 jun. 2026.',
        '',
        'HAN, Byung-Chul. Sociedade do cansaço. Tradução de Enio Paulo Giachini. 2. ed. Petrópolis: Vozes, 2015.',
        '',
        'ORGANIZAÇÃO DAS NAÇÕES UNIDAS. Transformando nosso mundo: a Agenda 2030 para o Desenvolvimento Sustentável. Nova York: ONU, 2015.',
    ]

    for ref in referencias:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.space_before = Pt(0)
        if ref:
            # Recuo especial (segunda linha em diante fica com recuo)
            # Na ABNT, referências usam alinhamento à esquerda com espaçamento simples
            run = p.add_run(ref)
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
        else:
            # Linha em branco entre referências
            p.paragraph_format.space_after = Pt(6)

    # =========================================================
    # SALVAR
    # =========================================================
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Capitulo_Introdutorio_Escolta_UNITAU.docx')
    doc.save(output_path)
    print(f'Documento gerado com sucesso!')
    print(f'Arquivo: {output_path}')
    print(f'\nInstrucoes:')
    print(f'   1. Abra o arquivo no Word')
    print(f'   2. Revise o texto e personalize se necessario')
    print(f'   3. Exporte como PDF para entregar no EVA')
    return output_path

if __name__ == '__main__':
    criar_documento()
