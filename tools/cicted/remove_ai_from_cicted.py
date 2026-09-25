from pathlib import Path
from docx import Document


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(r"D:\Dados de Nicolas\Downloads\700bef24022242ee9233.docx")
OUTPUT = ROOT / "docs" / "cicted" / "Revisao" / "CICTED_Escolta_resumo_sem_IA.docx"
TARGET = (
    " Ferramentas de inteligência artificial generativa foram utilizadas de forma "
    "supervisionada no apoio à organização, programação e revisão, permanecendo as "
    "decisões e validações sob responsabilidade dos autores."
)


def remove_text_preserving_runs(paragraph, target: str) -> bool:
    runs = paragraph.runs
    full_text = "".join(run.text for run in runs)
    start = full_text.find(target)
    if start < 0:
        return False

    end = start + len(target)
    cursor = 0
    for run in runs:
        run_start = cursor
        run_end = cursor + len(run.text)
        cursor = run_end

        overlap_start = max(start, run_start)
        overlap_end = min(end, run_end)
        if overlap_start >= overlap_end:
            continue

        local_start = overlap_start - run_start
        local_end = overlap_end - run_start
        run.text = run.text[:local_start] + run.text[local_end:]

    return True


def main() -> None:
    document = Document(SOURCE)
    removed = False

    for paragraph in document.paragraphs:
        if remove_text_preserving_runs(paragraph, TARGET):
            removed = True
            break

    if not removed:
        raise RuntimeError("O trecho sobre inteligência artificial não foi encontrado.")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)

    verification = Document(OUTPUT)
    final_text = "\n".join(paragraph.text for paragraph in verification.paragraphs)
    if "inteligência artificial generativa" in final_text.lower():
        raise RuntimeError("A verificação encontrou o trecho que deveria ter sido removido.")

    print(OUTPUT)


if __name__ == "__main__":
    main()
