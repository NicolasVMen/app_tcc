from pathlib import Path
from docx import Document


SOURCE = Path(r"D:\Dados de Nicolas\Downloads\700bef24022242ee9233.docx")


def main() -> None:
    document = Document(SOURCE)
    print(f"paragraphs={len(document.paragraphs)} tables={len(document.tables)}")
    for index, paragraph in enumerate(document.paragraphs):
        text = paragraph.text.strip()
        if text:
            print(f"P{index:03d}: {text}")
        if index in (5, 6):
            for run_index, run in enumerate(paragraph.runs):
                print(
                    f"  RUN{run_index:02d}: bold={run.bold} italic={run.italic} "
                    f"text={run.text!r}"
                )

    for table_index, table in enumerate(document.tables):
        for row_index, row in enumerate(table.rows):
            for cell_index, cell in enumerate(row.cells):
                text = " | ".join(
                    paragraph.text.strip()
                    for paragraph in cell.paragraphs
                    if paragraph.text.strip()
                )
                if text:
                    print(f"T{table_index:02d}R{row_index:02d}C{cell_index:02d}: {text}")


if __name__ == "__main__":
    main()
