"""Atualiza somente as considerações finais do banner CICTED existente.

Uso: python revisar_consideracoes.py origem.pptx destino.pptx
"""

from argparse import ArgumentParser
from pathlib import Path

from pptx import Presentation
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt


PARAGRAFOS = (
    "A integração entre o vestível e o aplicativo demonstrou viabilidade técnica "
    "nas condições ensaiadas. Após as correções no serviço Android, a monitoração "
    "persistiu no Galaxy S24 Ultra, modelo usado na validação inicial. A perda do "
    "enlace BLE acionou o alerta de desconexão, enquanto o botão físico permitiu "
    "disparar o alerta manual.",
    "Em um ciclo de monitoração contínua, a placa operou por 11 h 10 entre 90% e "
    "5% de carga estimada, com as saídas automáticas de alerta bloqueadas. Trata-se "
    "de um resultado preliminar: o tempo de uso pode mudar com reconexões, "
    "acionamentos sonoros e outras condições de operação.",
    "O RSSI permitiu observar mudanças na intensidade do sinal, mas variou com "
    "obstáculos, orientação e ambiente. Por isso, os valores indicados pelo "
    "aplicativo não devem ser interpretados como medição precisa de distância. "
    "Os testes confirmam o funcionamento integrado do protótipo, mas ainda não "
    "permitem generalizar o desempenho para diferentes celulares e cenários de uso.",
)


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("origem", type=Path)
    parser.add_argument("destino", type=Path)
    args = parser.parse_args()

    apresentacao = Presentation(args.origem)
    alvos = [
        forma
        for slide in apresentacao.slides
        for forma in slide.shapes
        if forma.has_text_frame
        and forma.text.startswith("A integração entre o vestível e o aplicativo")
    ]
    if len(alvos) != 1:
        raise RuntimeError(f"Esperava uma caixa de conclusões; encontrei {len(alvos)}")

    alvos[0].height = Inches(7.5)
    caixa = alvos[0].text_frame
    original = caixa.paragraphs[0].runs[0].font
    fonte = original.name
    tamanho = original.size
    negrito = original.bold
    italico = original.italic
    cor = original.color.rgb

    caixa.clear()
    for indice, texto in enumerate(PARAGRAFOS):
        paragrafo = caixa.paragraphs[0] if indice == 0 else caixa.add_paragraph()
        paragrafo.alignment = PP_ALIGN.LEFT
        paragrafo.space_before = Pt(0)
        paragrafo.space_after = Pt(14 if indice < len(PARAGRAFOS) - 1 else 0)
        paragrafo.line_spacing = 1.08
        trecho = paragrafo.add_run()
        trecho.text = texto
        trecho.font.name = fonte
        trecho.font.size = tamanho
        trecho.font.bold = negrito
        trecho.font.italic = italico
        trecho.font.color.rgb = cor

    # As referências permanecem abaixo das conclusões, com respiro visual.
    for forma in apresentacao.slides[0].shapes:
        if forma.has_text_frame and (
            forma.text == "Referências" or forma.text.startswith("BLUETOOTH SIG.")
        ):
            forma.top += Inches(1.0)

    args.destino.parent.mkdir(parents=True, exist_ok=True)
    apresentacao.save(args.destino)
    print(args.destino)


if __name__ == "__main__":
    main()
