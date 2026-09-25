# Revisao apos o teste de impressao - item 1

O arquivo principal continua sendo `escolta_case_v2.scad`. A vista inicial
mostra a base sem tampa e sem componentes para permitir inspecionar os furos.
`visualizar_passantes.scad` mostra os dois suportes isolados e fitas ilustrativas
em laranja. Essas fitas nao sao pecas para imprimir.

## Alteracoes para avaliacao

- Passagens da XIAO e do buzzer com secao nominal de 6 x 3 mm.
- Referencia de cinta: ate 4,8 mm de largura e 2 mm de espessura; a cabeca
  de travamento fica fora do furo. A perda dimensional real da impressora
  ainda nao foi medida, portanto o encaixe exige uma prova fisica.
- Passante da XIAO deslocado para o lado interno, com paredes e teto de
  1,5 mm. Isso permite aumentar o tunel sem levantar a placa ou as janelas.
  O encaixe da placa com as pernas soldadas continua pendente no item 3.
- Recortes do buzzer atravessam a prateleira e os batentes. O mesmo corte
  remove a interferencia da parte frontal da coluna traseira do parafuso.
  O recorte termina em Y=40,5; a coluna de raio 3,1 centrada em Y=42
  mantem a porcao posterior conectada. O furo piloto comeca em Z=24,
  acima deste recorte (Z=16,8 a 20,2).
- Prateleira estendida ate Y=42,4 para preservar 1,9 mm de material depois
  da fenda traseira. Passar a cinta antes de acomodar o buzzer.

Esta etapa ainda depende da avaliacao do usuario. Os STL e pacotes anteriores
nao foram atualizados; nao enviar esta revisao parcial para impressao final.
O codigo foi compilado para CSG sem erros usando OpenSCAD portatil 2021.01.
O arquivo principal foi aberto no aplicativo. Falta validar a malha final
e o encaixe fisico depois da aprovacao das cinco etapas.

## Sequencia combinada

1. Aprovar o aumento dos passantes.
2. Ponte fixa para bateria, com saida dos fios oposta a placa.
3. Suporte da XIAO considerando pinos, soldas e fotos reais.
4. Trava interna do botao mais estreita para atravessar o alojamento.
5. Aumentar a folga de ambos os lados da bateria: ela nao entrou entre os
   delimitadores da peca impressa. Criar base elevada FIXA na caixa, com
   passagem inferior para uma cinta prender a bateria ao suporte. Considerar
   protecao que distribua o aperto, sem concentrar carga na bolsa da bateria.
   Este pedido complementa/revisa o item 2; nao usar uma ponte solta.
   Deslocar o conjunto do conector branco e seus apoios (circulo central do
   print) para cima na vista enviada, em direcao ao fundo da caixa (Y maior),
   para liberar a regiao da bateria. A imagem nao fornece deslocamento em mm;
   conferir folgas com o botao, fios e colunas antes de definir a posicao.

Referencia visual do item 5: codex-clipboard-320a8b17-f3b2-45ef-a4a4-6bc042a4c315.png.
## Etapa bateria (itens 2 e 5) - aguardando avaliacao

- Removida a ponte removivel: agora a plataforma faz parte da base, com
  tampo de 2 mm e canal inferior de 6 x 3 mm. A bateria entra por cima.
- Alojamento livre nominal: 24 x 17,5 mm. Bateria de referencia: 21 x 14,5 x
  5 mm, com 1,5 mm de folga de cada lado. O tampo fica em Z=7,2 mm.
- Ressaltos nas duas extremidades do trajeto da cinta ficam 0,6 mm acima do
  topo nominal da bateria. Limitam a pressao direta da fita; a cinta serve
  para reter, nao para comprimir a bolsa. A folga nao garante imobilidade:
  conferir o encaixe real e, se necessario, usar apoio macio fino sem apertar
  excessivamente a celula. A cabeca de travamento permanece fora do canal.
- Abertura de 6 mm para os fios no lado +X (oposto a XIAO). O caminho de
  fios ilustrado permanece dentro da caixa e contorna pela lateral direita.
- Conector branco deslocado 8 mm para +Y, como no print. Seu passante agora
  tem 6 x 3 mm, e os apoios foram elevados ate o teto do tunel, evitando que
  o corpo do conector colida com a propria fixacao.
- Rebaixo no canto posterior esquerdo da plataforma preserva 0,5 mm para o
  envelope do bloco de fios sob o buzzer.
- No arquivo principal, `show_battery_demo` exibe bateria, cinta laranja e
  fios ilustrativos. Desativar essa opcao revela a plataforma. `part` igual
  a `battery_detail` isola a fixacao; o padrao continua `layout`, caixa aberta.

Verificacao: OpenSCAD 2021.01, STL da base fechado, um corpo conectado,
5062 triangulos, zero faces degeneradas e zero arestas invalidas. A
intersecao em `conferir_bateria_fixa.scad` retornou vazia para o alojamento
livre, conector, tucho de fios e canal da cinta. Isso verifica a geometria
nominal, nao a tolerancia da impressora ou resistencia mecanica real.

`verificacao_bateria_fixa.stl` e somente uma malha de verificacao desta etapa.
Nao foram substituidos os pacotes antigos de impressao. Faltam os itens 3 e
4 (fixacao da XIAO soldada e trava do botao) e a aprovacao visual desta etapa.

## Etapa XIAO soldada (item 3) - aguardando avaliacao

- A placa permanece de lado, com USB-C apontando para a abertura frontal.
  O plano da placa foi deslocado 0,5 mm para a esquerda e a borda inferior
  subiu de Z=4,6 para Z=7,8 mm. USB-C e janela do LED subiram junto.
- As guias da face posterior e o batente que atravessava a regiao dos pinos
  foram removidos. Dois apoios curtos sustentam a borda inferior, e duas guias
  baixas atuam somente pelo lado dos componentes, antes da zona da antena.
- Os pinos ilustrativos se estendem ate cerca de 10 mm do plano medio da
  placa, segundo a medida informada; passo e espessura sao aproximacoes, nao
  medidas das soldas. Sua extremidade nominal fica em X=23,8 mm; a plataforma
  da bateria comeca em X=25,9 mm.
- O passante nominal de 6 x 3 mm continua sob o conjunto. Seu teto chega a
  Z=6,7 mm, 1,1 mm abaixo da borda nominal da placa. A cinta ilustrativa foi
  afastada da zona da antena e percorre Y=13,1 a 17,9 mm.
- A cinta pode ainda tocar pinos, soldas ou a blindagem real ao apertar. A
  renderizacao NAO prova fixacao segura. Antes de autorizar impressao final,
  testar posicionamento e trajeto da cinta com o conjunto soldado, sem forcar
  pernas, trilhas ou antena; se necessario, redesenhar a retencao.
- `show_components=true` no arquivo principal exibe a XIAO, pinos e demais
  volumes ilustrativos na caixa aberta. Para ver somente a geometria impressa,
  trocar por `false` e tambem `show_battery_demo=false`.

Verificacao desta etapa: a base renderizou em STL fechado, um corpo conectado,
5026 triangulos, zero faces degeneradas e zero arestas invalidas. O arquivo
`verificacao_xiao_soldada.stl` e so para conferencia e nao substitui os
arquivos de impressao anteriores. A etapa do botao segue pendente.

### Correcao com as fotos de 24/09

O usuario mediu 13 mm da face da placa ate a ponta dos pinos e 22 mm de
comprimento total, incluindo o USB-C. A ilustracao anterior reservava so
10 mm de alcance a partir do plano medio da placa, portanto estava curta.
O novo envelope dos pinos termina em X=26 mm. Para abrir folga nominal de
2,4 mm ate a plataforma da bateria, esta foi deslocada 2,5 mm para +X e
1 mm para +Y; seu inicio agora e X=28,4 mm. A rota ilustrativa dos fios da
bateria tambem foi deslocada dentro da caixa.

Retirada a ilustracao da cinta em volta da XIAO: com os pinos reais de 13 mm,
o caminho anterior invadiria seu volume. Os dois apoios inferiores e o
passante continuam no modelo, mas a retencao segura da placa NAO esta
resolvida. Nao enviar esta versao para impressao ate projetar e conferir
essa fixacao e ate corrigir a trava do botao.

A base atualizada foi renderizada e validada como malha fechada, com um corpo
conectado, 4962 triangulos e nenhuma aresta invalida ou face degenerada.
`verificacao_xiao_soldada_13mm.stl` e apenas um arquivo de conferencia.

### Fixacao apos retirada dos pinos nao utilizados

- O modelo visual conserva somente D1, D3, GND e 3V3 como pontos soldados,
  conforme firmware e fotos. Confirmar esses quatro nomes na placa antes da
  impressao; a geometria da fixacao nao depende de qual pino de alimentacao
  foi usado, desde que a faixa central removida esteja livre.
- A faixa sem pinos recebe duas torres de 1,2 mm de espessura, abertas por
  cima: uma fica 0,3 mm antes do envelope dos componentes e outra 0,4 mm
  depois da face posterior da placa. Elas terminam 0,8 mm acima da XIAO.
- Um enforca-gato de referencia de 4,8 x 1,5 mm passa pelo tunel inferior de
  6 x 3 mm e fecha por cima das torres. A cinta laranja e apenas ilustrativa;
  nao faz parte da impressao.
- A protecao ocupa 5 mm no eixo Y e foi recuada 0,3 mm. Termina em Y=18,23,
  antes do inicio nominal da antena em Y=18,6; a cinta termina em Y=18,13.
- A placa entra verticalmente por cima entre as torres. Os apoios inferiores
  recebem a borda e mantem o USB-C alinhado a abertura frontal.

Verificacao geometrica: `verificacao_fixacao_xiao.stl` tem 5054 triangulos,
um corpo conectado, zero faces degeneradas, zero arestas invalidas e malha
fechada. Ainda falta prova fisica de tolerancia da impressora e aprovacao do
usuario antes de atualizar o pacote final.

## Compactacao e correcao do botao - 24/09

- A altura do corpo foi reduzida de 33 para 28 mm. A tampa continua com
  2,4 mm; portanto, o corpo com a tampa passa de 35,4 para 30,4 mm, sem
  contar a cabeca externa do botao.
- A XIAO desceu 1,2 mm. A torre protetora termina em Z=25,2 mm e a cinta de
  referencia termina em Z=26,85 mm, deixando 1,15 mm ate a tampa.
- O tucho de fios foi compactado para o envelope nominal de 30 x 15 x
  10,7 mm. Seu topo fica em Z=13 mm.
- O buzzer foi baixado 5,3 mm em relacao ao projeto alto. O eixo agora fica
  em Z=19,5 mm. O novo berco possui assento curvo com 0,8 mm de folga
  diametral, apoios laterais e duas passagens de 6 x 3 mm. Com a cinta de
  referencia de 1,5 mm, o ponto mais alto fica em Z=27 mm, 1 mm abaixo da
  tampa. O aro interno da tampa recebeu alivio local; a placa externa da
  tampa permanece fechada nessa regiao.
- A trava em C do prolongador do botao foi reduzida para 5,6 mm de diametro
  externo e 1 mm de altura. O alojamento interno do botao possui 6,4 mm;
  sobra folga nominal de 0,4 mm de cada lado para a trava atravessar.
- O canal do prolongador possui 3,2 mm de diametro e 1,8 mm de altura. A
  trava possui furo de 3,6 mm, boca de 3,8 mm e garganta de 2,9 mm. Assim,
  a boca admite o canal, a garganta o retem e restam 0,8 mm de folga axial
  para o mecanismo nao ficar pressionado permanentemente.
- O curso externo continua em 0,4 mm: em repouso, a cabeca fica 0,4 mm acima
  da tampa; ao pressionar, o pino encosta e aciona o botao tactil.

Verificacao digital atual:

- `verificacao_compacta_base.stl`: 5106 triangulos, um corpo conectado,
  zero faces degeneradas, zero arestas invalidas e malha fechada.
- `verificacao_compacta_tampa.stl`: 2888 triangulos, um corpo conectado,
  zero faces degeneradas, zero arestas invalidas e malha fechada.
- `verificacao_compacta_botao.stl`: 1116 triangulos, um corpo conectado,
  zero faces degeneradas, zero arestas invalidas e malha fechada.
- `verificacao_compacta_trava_c.stl`: 332 triangulos, um corpo conectado,
  zero faces degeneradas, zero arestas invalidas e malha fechada.

Essas verificacoes confirmam a consistencia matematica dos arquivos, nao a
tolerancia real da impressora. Antes do novo pacote de impressao, sera feita
uma auditoria dimensional orientada: componentes, aberturas, alturas, curso
do botao, folga da tampa e perda dimensional dos passantes.

### Auditoria visual da XIAO - fotos de 24/09

As duas fotos com regua confirmam novamente os 22 mm de comprimento total e
mostram a faixa entre as ultimas soldas utilizadas e a regiao da antena. A
faixa tem aproximadamente 5 mm, portanto a cinta de referencia de 4,8 mm
ficaria sem margem lateral. A fixacao foi alterada para abracadeira comum de
2,5 mm e torres com 3,4 mm no eixo longitudinal. As passagens continuam com
6 x 3 mm para absorver o fechamento de furos observado na impressora.

### Auditoria das folgas internas circuladas

O tucho real foi medido com 30 x 15 x 10 mm. No CAD ele ocupa 30 x 15 x
10,7 mm; usando a altura real, restam 1,2 mm ate a parte inferior do buzzer.

A vista superior revelou duas margens insuficientes. A XIAO terminava apenas
0,3 mm antes do tucho e um canto do apoio do buzzer sobrepunha 0,2 mm do
envelope da placa. A XIAO foi recuada 0,5 mm e o conjunto do tucho deslocado
0,6 mm; placa, tucho e apoio agora possuem 1,4 mm de separacao nominal. O
recorte da plataforma da bateria foi ampliado, passando de 0,5 para 1,5 mm
em relacao ao envelope do tucho.

Na regiao dos quatro pinos soldados, um alivio local aumentou de 2,4 para
4,1 mm a distancia ate o primeiro material da plataforma. A bateria em si
continua a 5,5 mm das pontas nominais dos pinos. Entre os suportes impressos
da bateria e do conector existem 2,6 mm; ate o corpo do conector existem
4,6 mm.

`verificacao_auditoria_folgas.stl`: 5100 triangulos, um corpo conectado,
zero faces degeneradas, zero arestas invalidas e malha fechada.
