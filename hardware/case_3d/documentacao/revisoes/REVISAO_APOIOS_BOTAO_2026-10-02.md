# Apoios inferiores do botão — revisão V2.8

Escopo autorizado: corrigir e reforçar somente o apoio inferior do botão.
Base, posição dos componentes, furo, prolongador, trava C, encaixe do aro e
centros dos parafusos foram preservados.

## Defeito encontrado na tampa V2.5

O STL contém duas abas, mas o usuário informou que elas não apareceram na
peça impressa. Não há evidência suficiente para atribuir isso à impressora,
ao fatiamento ou à escolha do arquivo.

Além disso, a ilustração colocava a base do botão em Z=-8,6 mm em relação à
face interna da tampa, enquanto a face superior das abas estava em Z=-7,7 mm.
O corpo ilustrado penetrava 0,9 mm nos apoios. Ao assentar o componente
real sobre eles, a folga calculada de +0,5 mm virava interferência de -0,4 mm.

## Correção aplicada

| Medida nominal | Antes | Agora |
|---|---:|---:|
| Espessura das abas | 0,9 mm | 1,8 mm |
| Distância da face interna da tampa até a face de apoio | 7,7 mm | 8,6 mm |
| Profundidade total do alojamento, incluindo as abas | 8,6 mm | 10,4 mm |
| Folga entre prolongador e atuador, com componente assentado | -0,4 mm | +0,5 mm |
| Vão inferior central | 4 mm | 4 mm |
| Quadrado interno do alojamento | 6,4 × 6,4 mm | 6,4 × 6,4 mm |
| Furo da tampa | Ø4,8 mm | Ø4,8 mm |

O reforço cresce para baixo. Não altera a posição final do botão nem a
geometria aprovada do prolongador. As abas continuam ligadas às paredes
laterais por toda a espessura destas, com entrada frontal aberta para o
componente soldado. São parte da tampa, não peças avulsas.

## Verificações executadas

- Tampa V2.8 exportada pelo OpenSCAD 2021.01: 3.384 triângulos, um corpo
  conectado, malha fechada, nenhuma face degenerada ou aresta inválida.
- Dimensões do STL orientado para impressão: 61 × 46 × 12,8 mm. A placa
  externa da tampa mantém 2,4 mm de espessura.
- Medição do próprio STL: face de apoio em Z=-8,6 mm, espessura de 1,8 mm,
  furo de Ø4,8 mm e folga de 0,5 mm sobre o atuador do modelo.
- Interseção volumétrica entre apoios e corpo de referência 6 × 6 × 4 mm:
  vazia. O contato plano é excluído por uma folga diagnóstica de 0,01 mm.
- Interseção volumétrica entre base e tampa fechadas: vazia.
- Base V2.6, prolongador V2.7 e trava C V2.5 reexportados: comparação de
  todos os triângulos confirmou geometria idêntica à dos STL entregues.

Esses testes não certificam a resistência física, o ajuste do fatiador nem
o encaixe das soldas reais. Conferir as abas na prévia por camadas e montar
sem forçar. O responsável pela impressão deve avaliar suportes localizados
nesses balanços. Não recomendar automaticamente a antiga configuração
sem suportes, já que essa região não apareceu na peça recebida.

## Arquivos

- Código principal: `escolta_case_v2.scad`.
- Nova peça para impressão: `PARA_IMPRIMIR_AGORA/02_tampa_v2_8.stl`.
- Código e tampa anteriores: `historico/antes_apoios_v2_8`.
- Auditoria de medidas: `verificacoes/scripts/auditar_apoio_botao.py`.
- Exportação/regressão: `ferramentas/verificar_revisao_apoios.py`.
- Prévia do alojamento vazio: `verificacoes/imagens/apoios_botao_v2_8.png`.

No arquivo principal já aberto, escolher `part = "button_detail"` e F5 para
ver o conjunto. `part = "lid"` mostra somente a tampa na orientação de impressão.
