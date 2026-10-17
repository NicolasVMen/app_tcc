# Caixa Escolta — entrada atual

Fonte editável: [escolta_case_v2.scad](escolta_case_v2.scad). O arquivo abre
atualmente em `part = "button_detail"`; use `layout` para ver o interior ou
`assembly` para ver o conjunto. Pressione F5 após mudar a opção.

O lançador [ABRIR_CAIXA_OPENSCAD.cmd](ABRIR_CAIXA_OPENSCAD.cmd) procura a cópia
portátil em `local_tools`, sem depender da associação de arquivos do Windows.
Essa ferramenta é local e não acompanha o repositório. Se não existir no
computador, abra o mesmo `.scad` em uma instalação do OpenSCAD.

## Entrega atual

Somente [PARA_IMPRIMIR_AGORA](PARA_IMPRIMIR_AGORA/LEIA-ME.md) contém o kit atual:
base V2.6, tampa V2.8, prolongador V2.7 e trava C V2.5. As versões das quatro
peças são diferentes porque algumas geometrias foram preservadas.

Corpo nominal: 61 × 46 × 28 mm, sem passantes e sem tampa. A base inclui os
passantes: 61 × 57 × 28 mm. A espessura externa da tampa é 2,4 mm; sua altura
no STL é 12,8 mm por incluir o alojamento interno do botão.

As eletrônicas e abraçadeiras coloridas são ilustrações, não peças a imprimir.
Malha fechada não garante tolerância FDM, resistência, encaixe ou segurança.
O usuário já informou montagem da caixinha; os novos filtros precisam de
validação física própria.

## Organização

- `documentacao/revisoes/`: registros de ajustes e auditoria dimensional histórica.
- `documentacao/imagens/`: imagens de revisão preservadas, sem alterar pixels.
- `documentacao/README_V2.md` e demais instruções V1/V2.2/V2.3: **históricos**,
  podem citar peças, pontes e medidas que não são mais atuais.
- `ferramentas/`: validadores e gerador da revisão dos apoios.
- `verificacoes/scripts/`: testes e visualizações auxiliares.
- `historico/`: modelos anteriores; não enviar para nova impressão.

Registro de apoio atual:
[revisão dos apoios do botão](documentacao/revisoes/REVISAO_APOIOS_BOTAO_2026-10-02.md).
Auditoria geral: [relatório](../../docs/auditoria/RELATORIO_2026-10-07.md).
