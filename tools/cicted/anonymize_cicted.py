"""Inspecao e copia anonima do resumo mais recente do CICTED."""
from pathlib import Path
from zipfile import ZipFile
from lxml import etree
import sys
from hashlib import sha256
from docx import Document

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/cicted/Revisao/CICTED_Revisado.docx'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
OUTPUT = SOURCE.with_name('CICTED_Revisado_Sem_Identificacao.docx')


def inspect():
    with ZipFile(SOURCE) as package:
        for name in package.namelist():
            if name.endswith('.xml') and (
                name == 'word/document.xml' or name.startswith('docProps/')
                or any(key in name for key in ('header', 'footer', 'comment', 'people'))
            ):
                tree = etree.fromstring(package.read(name))
                print('\nPART', name)
                if name.startswith('docProps/'):
                    print(etree.tostring(tree, encoding='unicode'))
                else:
                    for index, paragraph in enumerate(tree.findall('.//w:p', NS)):
                        print(index, ''.join(paragraph.xpath('.//w:t/text()', namespaces=NS)))
        print('MEDIA', [n for n in package.namelist() if n.startswith('word/media/')])
        print('OTHER', [n for n in package.namelist() if 'custom' in n or 'embedd' in n])
        image = ROOT / 'docs/cicted/Revisao/.conferencia_cabecalho.png'
        image.write_bytes(package.read('word/media/image1.png'))
        print('IMAGE', image)
        print('RELS', package.read('word/_rels/document.xml.rels').decode())


def anonymize():
    original_hash = sha256(SOURCE.read_bytes()).hexdigest()
    with ZipFile(SOURCE) as package:
        data = {n: package.read(n) for n in package.namelist()}
        infos = package.infolist()
    document = etree.fromstring(data['word/document.xml'])
    paragraphs = document.findall('./w:body/w:p', NS)
    original_text = [''.join(p.xpath('.//w:t/text()', namespaces=NS)) for p in paragraphs]
    assert len(paragraphs) == 7
    assert 'Nicolas Venciguerra' in original_text[2] and '@' in original_text[3]
    for paragraph in paragraphs[2:4]:
        paragraph.getparent().remove(paragraph)
    for text in document.findall('.//w:t', NS):
        if text.text:
            text.text = text.text.replace('ESCOLTA UNITAU', 'ESCOLTA').replace('Escolta UNITAU', 'Escolta')
    data['word/document.xml'] = etree.tostring(document, xml_declaration=True, encoding='UTF-8', standalone=True)

    core = etree.fromstring(data['docProps/core.xml'])
    for node in list(core):
        core.remove(node)
    etree.SubElement(core, '{http://purl.org/dc/elements/1.1/}title').text = original_text[0].replace('ESCOLTA UNITAU', 'ESCOLTA')
    etree.SubElement(core, '{http://purl.org/dc/elements/1.1/}description').text = 'Resumo revisado - versao sem identificacao'
    data['docProps/core.xml'] = etree.tostring(core, xml_declaration=True, encoding='UTF-8', standalone=True)

    # Remove contatos residuais do modelo, mesmo que nao aparecam na pagina.
    removed_relations = 0
    for name in list(data):
        if name.endswith('.rels'):
            tree = etree.fromstring(data[name])
            for rel in list(tree):
                if rel.get('Target', '').lower().startswith('mailto:'):
                    tree.remove(rel)
                    removed_relations += 1
            data[name] = etree.tostring(tree, xml_declaration=True, encoding='UTF-8', standalone=True)
    # Apos excluir os contatos, nao deixar hiperlinks que apontem para ids removidos.
    assert not document.findall('.//w:hyperlink', NS)
    assert not document.findall('.//w:ins', NS) and not document.findall('.//w:del', NS)
    with ZipFile(OUTPUT, 'w') as result:
        for info in infos:
            result.writestr(info, data[info.filename])

    expected = [t.replace('ESCOLTA UNITAU', 'ESCOLTA').replace('Escolta UNITAU', 'Escolta')
                for i, t in enumerate(original_text) if i not in (2, 3)]
    actual = [p.text for p in Document(OUTPUT).paragraphs]
    assert actual == expected, 'Conteudo diferente das remocoes previstas'
    markers = ['nicolas', 'venciguerra', 'dedini', 'rafael', 'luis fernando',
               'almeida', '@', 'mailto:', 'unitau', 'universidade de taubaté']
    with ZipFile(OUTPUT) as result:
        assert result.testzip() is None
        for name in result.namelist():
            if name.endswith(('.xml', '.rels')):
                text = result.read(name).decode('utf-8').lower()
                for marker in markers:
                    assert marker not in text, f'Identificacao residual: {marker} em {name}'
        assert result.read('word/media/image1.png') == data['word/media/image1.png']
    assert sha256(SOURCE.read_bytes()).hexdigest() == original_hash
    print('Criado:', OUTPUT)
    print('Verificado: texto tecnico preservado; nomes, emails, filiacao e autoria XML ausentes.')
    print('Contatos ocultos removidos:', removed_relations)
    print('Cabecalho padrao do evento preservado; original identificado intacto.')


if __name__ == '__main__':
    anonymize() if '--create' in sys.argv else inspect()
