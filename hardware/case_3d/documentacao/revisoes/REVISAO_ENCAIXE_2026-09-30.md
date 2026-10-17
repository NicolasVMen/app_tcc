# Revisão de encaixe da caixa em 30/09/2026

O retorno da prova física orientou a revisão V2.5 do arquivo
`escolta_case_v2.scad`. As medidas abaixo são nominais do CAD, em milímetros.
Ainda é necessária uma prova impressa para confirmar as folgas reais.

## Ajuste V2.7 do acionamento do botão

O alojamento sob a tampa continua com 8,6 mm de profundidade; a base e a
tampa não foram alteradas nesta etapa. A ponta do botão tátil real tem 5 mm
de altura total medida pelo usuário: 4 mm de corpo e 1 mm de atuador no
modelo. Comparação das alturas nominais, medidas a partir da face interna
da tampa:

| Estado | Fim do canal C até ponta do botão preto | Ombro e ponta vermelha | Folga livre | Curso externo | Curso após contato |
|---|---:|---:|---:|---:|---:|
| V2.4 | 1,0 mm | 1,0 mm | 0 mm | 0,4 mm | 0,4 mm, com pré-contato |
| V2.5 | 1,8 mm | 1,6 mm | 0,2 mm | 0,7 mm | 0,5 mm |
| V2.7 | 1,5 mm | 1,0 mm | 0,5 mm | 1,0 mm | 0,5 mm |

O canal da trava C passou de 1,8 para 2,1 mm de altura, e a cabeça vermelha
ficou com 1,0 mm de curso até encostar na face externa da tampa. A ponta de
contato foi encurtada para 0,5 mm. A altura total impressa do prolongador
permanece 8,7 mm; a trava C mantém a geometria V2.5. O botão não deve ficar
pressionado com a tampa fechada, mas o retorno e o clique ainda dependem de
um teste físico com a peça impressa e o botão soldado.

## Ajuste V2.6 após a conferência da vista superior

- A bateria foi movida 4 mm no eixo Y, de Y=11,8 para Y=15,8 mm. O centro
  passou a Y=23,05 mm, praticamente o meio da largura de 46 mm da caixa.
  O botão continua no mesmo lugar. A base do alojamento do botão fica em
  Z=19,4 mm; a bateria ilustrada termina em Z=12,2 mm, antes mesmo de contar
  a folga adicional para a abraçadeira. A sobreposição vista de cima não é
  uma colisão em altura.
- As duas torres da XIAO passaram de 1,2 para 3,0 mm de espessura, e a folga
  lateral para a placa aumentou para 0,8 mm por lado. Cada pé foi alargado na
  base para deixar 2 mm de material de cada lado do túnel de 7,2 × 3,6 mm.
  Na geometria anterior, o corte atravessava toda a largura dos pilares na
  parte baixa, contribuindo para a quebra ao encaixar a placa.
- O conector branco ilustrativo foi reposicionado no piso, fora do espaço
  ocupado pelo suporte da bateria. Não existe berço dedicado para ele.
- A câmera fixa do arquivo OpenSCAD foi removida para permitir girar e
  aproximar a vista normalmente. Isso não altera a geometria impressa.

Essas modificações ainda precisam ser verificadas na base impressa. Não se
deve forçar a placa entre as torres: ela entra com folga e é presa pela
abraçadeira. A tampa, o botão vermelho e a trava C continuam na V2.5.

| Região | Antes | Agora | Motivo |
|---|---:|---:|---|
| Profundidade do alojamento do botão | 7,8 | 8,6 | O botão real e o prolongador vermelho não cabiam juntos. |
| Folga entre prolongador e atuador em repouso | 0 | 0,2 | Evitar pré-acionamento ao fechar a tampa. |
| Curso externo disponível do prolongador | 0,4 | 0,7 | Restam 0,5 mm após vencer a folga de repouso. |
| Altura do prolongador vermelho | 7,8 | 8,7 | Acompanhar a nova profundidade do alojamento. |
| Túnel inferior da XIAO | 6 × 3 | 7,2 × 3,6 | Deixar a abraçadeira passar apesar da perda dimensional da impressora. |
| Largura protegida no topo da XIAO | 3,4 | 4,2 | Receber uma cinta nominal de até 3,6 sem cobrir a antena. |
| Posição inicial do corpo da bateria (X, Y) | (31,5; 7,8) | (34,5; 11,8) | Aproximar da parede direita sem bloquear os parafusos e os fios. |
| Visor do LED na parede frontal | retângulo acima da USB-C | círculo de Ø2,4 centrado em X=16,7; Z=8,1 | Seguir a marcação feita na prova impressa. |

O túnel da XIAO agora é retirado da união completa da base. Antes, o apoio
interno ocupava parte do canal depois de unido ao berço. O novo túnel atravessa
as duas entradas, mantendo a cinta na faixa sem pinos e antes da antena.

O suporte da bateria tem um tampo de 2 mm e perímetro de apoio vazado por baixo.
O canal de 6 × 3 mm para a cinta permanece. O trilho alto do conector branco e
os dois guias de fio no piso foram removidos. A borda direita do suporte tem um
corredor para os fios seguirem até a região traseira. Um alívio no canto
traseiro esquerdo evita colisão com o tucho eletrônico de 30 × 15 mm.

O deslocamento lateral da bateria é de 3 mm, limite conservador dentro da
caixa externa atual. O corpo da célula termina em X=55,5 e restam 3,5 mm até
a parede interna para a saída dos fios. O suporte começa em Y=8,7, ficando
1,6 mm após o alcance nominal da torre do parafuso frontal direito. A torre
traseira direita também permanece livre. A parede externa e os quatro centros
dos parafusos não mudaram.

## Verificações do modelo

- Base: 61 × 57 × 28 mm incluindo passantes da pulseira; um corpo conectado,
  malha fechada, nenhuma face degenerada e nenhuma aresta inválida.
- Tampa: 61 × 46 × 11 mm no STL orientado para impressão; um corpo conectado,
  malha fechada e sem defeitos geométricos detectados.
- Novo prolongador: Ø9 × 8,7 mm; um corpo conectado e malha fechada.
- Trava C: geometria anterior preservada, pois canal e diâmetros do eixo
  permaneceram iguais.
- A interseção volumétrica entre base e tampa montadas continuou vazia no
  teste de fechamento.

## Conferência na próxima impressão

1. Passar a abraçadeira real pelas duas entradas da XIAO, sem tocar soldas ou
   a antena.
2. Montar o botão preto, o novo prolongador vermelho e a trava C; pressionar
   várias vezes e confirmar clique e retorno espontâneo.
3. Prender a bateria e observar a curvatura dos fios sem comprimir a bolsa.
4. Ligar a placa e verificar se a cor do LED aparece pelo novo visor circular.
5. Fechar a tampa e conferir alinhamento dos quatro parafusos e ausência de
   pressão sobre fios e componentes.
