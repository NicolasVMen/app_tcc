# Banners CICTED

Esta pasta reúne artefatos acadêmicos, não o aplicativo em execução.

- `impressao/`: PowerPoints editáveis, PDFs e prévias de várias revisões.
- `impressao/assets/`: imagens originais/vetoriais e exportações intermediárias.
- `impressao/auditoria_*.json`: verificações anteriores de texto e recursos.
- Arquivos Python/PowerShell/MJS: ferramentas históricas de revisão/exportação.

Fluxo das revisões: preparação → FINAL → ALINHADO → EQUILIBRADO →
CORRIGIDO_PROFESSOR → REVISAO_2. Isso explica a sequência, mas não substitui
a escolha humana do arquivo efetivamente aprovado/enviado.

Os documentos em `../../../CICTED` foram preservados: os PowerPoints
EQUILIBRADO e REVISAO_2 não são cópias binárias idênticas dos de `impressao`.
Não os substituir automaticamente.

## Cuidados com os scripts

Não executar todos em lote: vários sobrescrevem saídas conhecidas ou dependem
de números fixos de formas do PowerPoint. `finalizar_parecer_banner.py` altera
uma apresentação ao ser executado/importado; não é uma biblioteca.

`exportar_impressao.ps1` exige PowerPoint instalado. `verificar_pdfjs.mjs`
usa dependências de um caminho específico deste computador. Os geradores de
resumo em `tools/cicted` incluem entradas antigas em Downloads; não devem
ser usados para regenerar a versão final sem selecionar a fonte correta.

A auditoria verificou ZIP/XML, sintaxe Python, abertura e renderização dos PDFs.
Não reescreveu os textos, não atualizou normas e não certificou o conteúdo
acadêmico nem a legibilidade de cada detalhe no tamanho final de impressão.

Dependências Python instaladas em `ferramentas/vendor/` são locais e não são
versionadas. O script de preparação usa `vtracer` (versão usada: 0.6.15), além
das bibliotecas de documentos/imagens indicadas por seus imports; disponibilizar
essas dependências no ambiente antes de reproduzir a geração, sem executar
scripts históricos para sobrescrever automaticamente o banner aprovado.
