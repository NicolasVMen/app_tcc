# Auditoria dimensional da caixa Escolta V2.4

Data de início: 24/09/2026

Objetivo principal: medir cada componente eletrônico real na posição em que
será montado e comparar imediatamente com o espaço reservado no CAD. A
calibração da impressora fica para depois e não faz parte desta primeira
rodada. Medidas em milímetros. Não apertar, dobrar ou perfurar a bateria LiPo.

## Ferramentas

- Preferencial: paquímetro digital com resolução de 0,1 mm.
- Alternativa aproximada: régua milimetrada e testes passa/não passa.
- Abraçadeira que será realmente utilizada na montagem.
- Cabo USB-C que será realmente utilizado.
- Quatro parafusos somente depois de definir o modelo exato.

## Regra de registro

Para cada item anotar: medida projetada, medida real, instrumento, resultado
e observação. Não corrigir o CAD a partir de uma fotografia inclinada.

## Etapa 1 — XIAO depois da retirada dos pinos não utilizados

| Medida real necessária | Referência atual do CAD | Como medir | Critério para o CAD atual |
|---|---:|---|---|
| Comprimento total, incluindo USB-C | 22 | USB-C até a borda oposta | Confirmado: 22 mm |
| Altura/largura da placa em pé | 17,8 | Entre as duas bordas longas da PCB | Até 18,2 mm |
| Espessura máxima entre face dos componentes e parte traseira | 4,3 | Incluir componentes e solda, sem incluir pinos longos fora da região da cinta | Até 4,6 mm |
| Profundidade máxima até a ponta dos pinos restantes | 13 | Face dos componentes até o metal mais distante | Confirmado: 13 mm; não pode passar de 13,5 mm |
| Faixa livre para a cinta | aproximadamente 5 de comprimento | Fotos de 24/09 confirmam o intervalo entre as últimas soldas e a antena | Apoio reduzido para 3,4 mm e cinta comum de 2,5 mm |
| Antena livre | começa aproximadamente a 16 mm da borda do USB-C | Identificar a extremidade da antena na PCB | A cinta deve terminar antes da antena |
| Corpo metálico do USB-C | 9 x 3 | Medir largura e altura da boca do conector | Confirmado; montado de lado, ocupa 3 x 9 mm na parede |
| Abertura USB-C na caixa | 5,4 x 10,5 | Conferir no CAD e depois na impressão | Folga nominal de 1,2 mm por lado no eixo horizontal e 0,75 mm por lado no vertical |

## Etapa 2 — bateria e conector branco

| Medida real necessária | Referência atual do CAD | Como medir | Critério |
|---|---:|---|---|
| Corpo da bateria, sem fios | 21 x 14,5 x 5 | Medir a bolsa incluindo fita amarela, sem comprimir | Deve entrar no espaço livre de 24 x 17,5 mm |
| Espessura máxima da bateria | 5 | Medir no ponto mais espesso | Não usar a bateria se estiver estufada; folga vertical será revista |
| Saída dos fios | lado +X, oposto à XIAO | Medir onde os fios deixam a bolsa | Não pode dobrar rente à selagem da célula |
| Conector branco montado | 15 x 7 x 4,5 | Medir o casal de conectores encaixado | Deve apoiar no berço sem forçar fios |

### Resultado parcial da etapa 2

- O usuário confirmou que o conector branco é menor que o envelope reservado
  de 15 x 7 x 4,5 mm. Geometria do conector aprovada.
- O corpo da bateria informado anteriormente mede 21 x 14,5 x 5 mm e entra
  no alojamento livre de 24 x 17,5 mm. A espessura e a saída dos fios ainda
  serão observadas na montagem física, sem comprimir a bolsa.

## Etapa 3 — buzzer e tucho eletrônico

| Medida real necessária | Referência atual do CAD | Como medir | Critério |
|---|---:|---|---|
| Diâmetro do buzzer | 12 | Medir em duas direções | Até 12,4 mm no berço de 12,8 mm |
| Comprimento do buzzer | 9 | Face sonora até a traseira | Até 9,5 mm |
| Tucho de fios, resistores e diodo | 30 x 15 x 10,7 | Acomodar sem esmagar; medir comprimento, largura e altura do volume resultante | Altura máxima 10,7 mm; topo não pode empurrar o buzzer |
| Abraçadeira sobre o buzzer | referência 2,5 x 1,5 | Medir a cinta real | Topo do conjunto deve permanecer abaixo de Z=28 mm |

### Resultado parcial da etapa 3

- Tucho real organizado: 30 x 15 x 10 mm.
- Envelope do CAD: 30 x 15 x 10,7 mm.
- Com o fundo do tucho em Z=2,3 mm, seu topo real fica em Z=12,3 mm.
- A parte inferior do buzzer fica em Z=13,5 mm: folga real estimada de
  1,2 mm. A altura do tucho está aprovada.
- A auditoria da vista superior encontrou duas folgas laterais que ainda
  precisavam ser ampliadas. O CAD foi corrigido: XIAO/tucho passou de 0,3
  para 1,4 mm; o recorte do suporte da bateria passou de 0,5 para 1,5 mm.
- Foi criado alívio local no suporte da bateria: a folga dos pinos da XIAO
  passou de 2,4 para 4,1 mm na região dos quatro pontos soldados. Até o corpo
  da bateria continuam existindo 5,5 mm.
- Entre os suportes da bateria e do conector permanecem 2,6 mm; entre o
  suporte da bateria e o corpo do conector existem 4,6 mm.
- A base corrigida foi validada com 5100 triângulos, um corpo conectado,
  nenhuma face degenerada, nenhuma aresta inválida e malha fechada.

## Etapa 4 — botão tátil, prolongador e trava em C

| Medida real necessária | Referência atual do CAD | Como medir | Critério |
|---|---:|---|---|
| Corpo quadrado do botão | 5,5 x 5,5 | Medir duas direções | Alojamento livre de 6,4 x 6,4 mm |
| Altura do corpo | 4 | Excluir o atuador preto | Deve caber no bolso de 4 mm com folga de montagem |
| Projeção do atuador | 1 | Corpo até o topo do atuador, sem pressionar | Define o comprimento do pino de contato |
| Pernas e soldas | ainda sem medida confirmada | Medir largura total e quanto descem/saem de cada lado | Não podem encostar nos apoios inferiores do alojamento |
| Furo da tampa nova | 4,8 nominal | Medir dois diâmetros depois de imprimir | Haste de 4,2 deve correr sem inclinar |
| Trava em C nova | externo 5,6; interno 3,6; altura 1 | Medir depois de imprimir | Deve atravessar o quadrado de 6,4, entrar no canal de 3,2 e não escapar pelo furo de 4,8 |
| Curso do prolongador | 0,4 | Montado, medir ou testar clique e retorno | Clicar e retornar sem ficar pressionado |

### Resultado parcial da etapa 4

- Depois de dobrar as pernas para dentro, o volume máximo do botão ficou em
  6 x 6 mm e a altura total, da base ao topo do atuador, ficou em 5 mm.
- O alojamento interno mede 6,4 x 6,4 mm: folga nominal de 0,2 mm por lado.
- O alojamento não tem somente 5 mm de altura. Do apoio inferior até a face
  interna da tampa existem 7,8 mm: 4 mm para o corpo do botão e 3,8 mm entre
  o topo do corpo e a tampa.
- O botão completo ocupa 5 mm, portanto restam 2,8 mm sobre o atuador. Esse
  espaço é preenchido pelo conjunto do prolongador: pino de contato de
  0,5 mm, ombro de 0,5 mm e canal de 1,8 mm.
- A trava em C tem 1 mm de espessura e trabalha dentro do canal de 1,8 mm.
  Restam 0,8 mm no canal, suficientes para o curso projetado de 0,4 mm e o
  retorno. Ela não é empilhada sobre os 5 mm do botão.
- A pilha vertical fecha em 7,8 mm sem manter o botão pressionado. A aprovação
  definitiva do mecanismo depende da prova física da nova trava em C e do
  retorno livre do prolongador.

## Etapa 5 — tampa, parafusos e fechamento

| Verificação | Referência atual do CAD | Critério |
|---|---:|---|
| Corpo sem tampa | 61 x 46 x 28 | Sem empenamento visível |
| Corpo com tampa | altura 30,4 | Tampa encosta no perímetro sem pressionar componentes |
| Altura total com botão | aproximadamente 33 | Botão permanece livre |
| Folga superior da cinta da XIAO | 1,15 | Não pode marcar a tampa |
| Folga superior da cinta do buzzer | 1 | Não pode marcar a tampa |
| Furos da tampa | 2,4 de passagem; cabeça 4,6 x 1,2 | Definir parafuso real antes da impressão final |
| Pilotos da base | 1,7 x 9 de profundidade | Compatibilizar com o parafuso real |

### Verificação geométrica do fechamento

- O comprimento e a largura externos foram mantidos: corpo principal de
  61 x 46 mm e 61 x 57 mm quando os passantes da pulseira entram na medição.
- A base antiga tinha 33 mm de altura; a nova tem 28 mm. A redução efetiva
  foi de 5 mm, sem aumentar o comprimento ou a largura externos.
- Base e tampa usam a mesma lista de centros dos parafusos: (6;4), (55;4),
  (6;42) e (55;42) mm. Portanto, não existe deslocamento independente entre
  os furos de passagem da tampa e os pilotos da base.
- O aro da tampa possui 0,4 mm de folga por lado em relação à cavidade da
  base. Foram acrescentados quatro alívios internos de 7 mm ao redor das
  torres dos parafusos, sem alterar os furos de passagem de 2,4 mm nem os
  rebaixos de cabeça de 4,6 x 1,2 mm.
- O teste volumétrico entre base e tampa montadas resultou vazio: não existe
  interferência material no fechamento.
- Os quatro STL finais foram novamente exportados. Base, tampa, prolongador
  e trava estão fechados, têm um único corpo e não possuem faces degeneradas
  nem arestas inválidas.

## Etapa 6 — pulseira e uso

- Passante lateral atual: 22 x 2,8 mm.
- Medir a largura e a espessura da tira de elástico/velcro real.
- A tira deve passar sem dobrar excessivamente e não pode raspar em aresta
  cortante.
- Vestir a caixa vazia antes de instalar a bateria e confirmar orientação,
  acesso ao USB-C, alcance do botão e conforto sob a manga.

### Resultado da etapa 1

Fotos de 24/09: comprimento total de 22 mm confirmado. A faixa livre entre
as últimas soldas e a antena é suficiente para uma cinta comum de 2,5 mm,
mas não oferece margem segura para a referência anterior de 4,8 mm. O CAD
passou a usar apoio longitudinal de 3,4 mm e manteve túnel de 6 x 3 mm.
A malha revisada permaneceu fechada, conectada e sem arestas inválidas.

## Estado

- [x] Etapa 1 — XIAO (geometria aprovada; encaixe físico será confirmado na prova)
- [ ] Etapa 2 — bateria e conector
- [ ] Etapa 3 — buzzer e tucho eletrônico
- [ ] Etapa 4 — botão (componente aprovado; trava em C aguarda nova impressão)
- [ ] Etapa 5 — tampa e parafusos
- [ ] Etapa 6 — pulseira e uso

## Apêndice posterior — calibração da impressora

Somente depois de fechar as medidas dos componentes: comparar a base antiga
de 61 x 46 x 33 mm, o túnel antigo de 3,1 x 1,5 mm, o furo da tampa de
4,8 mm e a espessura de 2,4 mm com as dimensões que saíram da impressora.
