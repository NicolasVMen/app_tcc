"""Inspeção estrutural, sem executar geradores nem modificar originais.

Não certifica conteúdo acadêmico, qualidade de impressão ou montagem física.
--save gera somente relatório em docs/auditoria.
"""
import ast
import json
import struct
import sys
import wave
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKIP = {'.git', 'node_modules', '.expo', 'local_tools', '__pycache__', '.gradle', '.cxx', 'vendor'}

def paths(folder):
    for entry in sorted(folder.iterdir()):
        if entry.is_symlink():
            continue
        if entry.is_dir():
            if entry.name not in SKIP and not entry.name.startswith('build'):
                yield from paths(entry)
        else:
            yield entry

def inspect(file):
    ext = file.suffix.lower()
    result = {'path': file.relative_to(ROOT).as_posix(), 'type': ext}
    try:
        if ext == '.py':
            tree = ast.parse(file.read_text(encoding='utf-8-sig'), filename=str(file))
            result['functions'] = [n.name for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
        elif ext in {'.json', '.xml', '.svg'}:
            if ext == '.json':
                json.loads(file.read_text(encoding='utf-8-sig'))
            else:
                ET.parse(file)
        elif ext in {'.docx', '.pptx', '.xlsx', '.zip'}:
            with zipfile.ZipFile(file) as z:
                bad = z.testzip()
                if bad:
                    raise ValueError('CRC inválido: ' + bad)
                result['members'] = len(z.namelist())
                xmls = [n for n in z.namelist() if n.endswith('.xml')]
                for member in xmls:
                    ET.fromstring(z.read(member))
                result['xmls'] = len(xmls)
                if ext == '.pptx':
                    result['slides'] = len([n for n in z.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')])
                if ext == '.docx':
                    tree = ET.fromstring(z.read('word/document.xml'))
                    result['text_characters'] = sum(len(t.text or '') for t in tree.iter() if t.tag.endswith('}t'))
        elif ext == '.pdf':
            from pypdf import PdfReader
            import pypdfium2
            document = PdfReader(file, strict=True)
            result['pages'] = len(document.pages)
            result['encrypted'] = document.is_encrypted
            result['empty_pages'] = [i + 1 for i, page in enumerate(document.pages)
                if page.get_contents() is None]
            result['text_characters'] = sum(len(page.extract_text() or '') for page in document.pages)
            # Renderização de baixa resolução em memória: não altera PDFs/imagens.
            with pypdfium2.PdfDocument(file) as rendered:
                for index in range(len(rendered)):
                    page = rendered[index]
                    bitmap = page.render(scale=0.10)
                    bitmap.close()
                    page.close()
            result['rendered_pages'] = len(document.pages)
        elif ext in {'.png', '.jpg', '.jpeg'}:
            from PIL import Image
            with Image.open(file) as image:
                result['pixels'] = list(image.size)
                result['dpi'] = image.info.get('dpi')
                image.verify()
        elif ext == '.wav':
            with wave.open(str(file)) as audio:
                result.update(channels=audio.getnchannels(), sample_rate=audio.getframerate(), seconds=audio.getnframes()/audio.getframerate())
        elif ext == '.stl':
            data = file.read_bytes()
            count = struct.unpack_from('<I', data, 80)[0] if len(data) >= 84 else 0
            if len(data) == 84 + count * 50:
                result['triangles'] = count
                result['format'] = 'binary'
            elif b'facet normal' in data and b'endsolid' in data:
                result['triangles'] = data.count(b'endfacet')
                result['format'] = 'ascii'
            else:
                raise ValueError('STL com tamanho/cabeçalho inconsistente')
        else:
            return None
        result['status'] = 'ok'
    except Exception as error:
        result.update(status='error', error=str(error))
    return result

def main():
    results = [result for file in paths(ROOT) if (result := inspect(file))]
    report = {'scope': 'Integridade estrutural; não valida conteúdo nem comportamento físico',
              'checked': len(results), 'errors': [r for r in results if r['status'] != 'ok'], 'files': results}
    if '--save' in sys.argv:
        target = ROOT / 'docs' / 'auditoria'
        target.mkdir(parents=True, exist_ok=True)
        (target / 'integridade.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'checked': report['checked'], 'errors': report['errors'],
                      'empty_pdfs': [r for r in results if r.get('empty_pages')],
                      'python_scripts': [r for r in results if r['type'] == '.py']}, ensure_ascii=False, indent=2))
    return 1 if report['errors'] else 0

if __name__ == '__main__':
    raise SystemExit(main())
