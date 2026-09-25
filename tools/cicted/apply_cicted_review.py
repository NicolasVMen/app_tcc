from pathlib import Path
import re

from docx import Document


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(r"D:\Dados de Nicolas\Downloads\700bef24022242ee9233.docx")
OUTPUT = ROOT / "docs" / "cicted" / "Revisao" / "CICTED_Escolta_resumo_revisado_parecer.docx"

SUMMARY = (
    "A segurança infantil em ambientes com grande circulação de pessoas demanda recursos capazes de "
    "auxiliar responsáveis na percepção rápida de afastamentos, sem substituir a supervisão humana. "
    "Soluções baseadas em comunicação sem fio podem atuar como mecanismos complementares de "
    "acompanhamento, fornecendo sinais de alerta diante da perda ou degradação da proximidade entre a "
    "criança e o responsável. A partir desse contexto, este trabalho apresenta o desenvolvimento do "
    "Escolta UNITAU, protótipo acadêmico funcional composto por um dispositivo vestível e um aplicativo "
    "móvel para monitoramento de proximidade por Bluetooth Low Energy (BLE). O objetivo foi projetar e "
    "avaliar uma prova de conceito de baixo custo que sinalize a degradação ou perda do enlace sem fio, "
    "realize tentativas automáticas de reconexão e acione alertas locais, além de disponibilizar um botão "
    "físico de emergência à criança. A pesquisa caracteriza-se como aplicada, experimental e de "
    "desenvolvimento tecnológico. O dispositivo foi implementado com a placa Seeed Studio XIAO nRF52840 "
    "Sense, firmware desenvolvido em C++ utilizando o framework Arduino, circuito de acionamento de alerta "
    "sonoro e botão físico de emergência, enquanto o aplicativo foi desenvolvido em React Native com Expo, "
    "inicialmente para Android. A intensidade do sinal recebido (RSSI) é processada para identificar "
    "experimentalmente diferentes condições de proximidade entre os dispositivos, considerando a influência "
    "de obstáculos, da orientação dos dispositivos, do corpo humano e do ambiente. A validação inicial foi "
    "realizada em um único modelo de telefone, o Samsung Galaxy S24 Ultra, por meio de ensaios iterativos "
    "envolvendo autenticação, navegação, conexão automática, perda do enlace, reconexão, funcionamento em "
    "segundo plano, tela bloqueada, alarmes sonoros, vibração, registros de ocorrências, preferências e "
    "confirmação de segurança. As falhas observadas nos primeiros ciclos orientaram correções no serviço "
    "Android em primeiro plano, na sincronização dos estados e no encerramento seguro dos alertas. Após os "
    "ajustes, verificou-se o funcionamento da monitoração persistente, do alerta por perda do enlace BLE e "
    "do acionamento físico pelo botão de emergência, com resposta sonora no dispositivo e no telefone. O "
    "circuito do protótipo foi soldado e validado, e a alimentação por bateria foi integrada com inicialização "
    "bem-sucedida do dispositivo. Em um ensaio preliminar de autonomia, o protótipo permaneceu em "
    "monitoramento contínuo por mais de dez horas, entre 90% e 5% de carga estimada, com conexão BLE estável "
    "e sem acionamentos prolongados dos alertas. Esse resultado ainda requer repetição em novos ciclos e "
    "avaliação durante períodos de reconexão e acionamento dos alertas. Permanecem necessárias a calibração "
    "sistemática dos níveis de proximidade, a validação em outros aparelhos e ambientes e a finalização da "
    "estrutura vestível por impressão 3D. Conclui-se que a arquitetura demonstrou viabilidade técnica como "
    "prova de conceito integrada, mas necessita de ensaios adicionais antes de qualquer aplicação além do "
    "contexto acadêmico."
)

KEYWORDS = (
    " Sistemas Embarcados. Bluetooth Low Energy. Aplicativo Móvel. "
    "Monitoramento de Proximidade. Internet das Coisas."
)


def main() -> None:
    document = Document(SOURCE)

    if len(document.paragraphs) < 7:
        raise RuntimeError("Estrutura inesperada no documento do CICTED.")

    summary_paragraph = document.paragraphs[5]
    if not summary_paragraph.runs:
        summary_paragraph.add_run(SUMMARY)
    else:
        summary_paragraph.runs[0].text = SUMMARY
        for run in summary_paragraph.runs[1:]:
            run.text = ""

    keywords_paragraph = document.paragraphs[6]
    if len(keywords_paragraph.runs) < 2:
        keywords_paragraph.add_run(KEYWORDS)
    else:
        keywords_paragraph.runs[1].text = KEYWORDS
        for run in keywords_paragraph.runs[2:]:
            run.text = ""

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)

    verification = Document(OUTPUT)
    saved_summary = verification.paragraphs[5].text
    saved_keywords = verification.paragraphs[6].text
    forbidden = (
        "inteligência artificial generativa",
        "estimativa experimental de distância",
        "estados de cobertura",
        "emergência por perda de conexão",
        "transistor P2N2222A",
    )
    for expression in forbidden:
        if expression.casefold() in saved_summary.casefold():
            raise RuntimeError(f"Expressão antiga ainda presente: {expression}")

    required = (
        "um único modelo de telefone",
        "alerta por perda do enlace BLE",
        "mais de dez horas",
        "Bluetooth Low Energy",
    )
    combined = saved_summary + "\n" + saved_keywords
    for expression in required:
        if expression.casefold() not in combined.casefold():
            raise RuntimeError(f"Informação revisada ausente: {expression}")

    word_count = len(re.findall(r"\b[\wÀ-ÿ%+-]+\b", saved_summary))
    print(f"Arquivo: {OUTPUT}")
    print(f"Palavras no resumo: {word_count}")
    print(saved_keywords)


if __name__ == "__main__":
    main()
