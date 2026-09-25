# ESCOLTA UNITAU — caixa vestível V2.3

O arquivo paramétrico editável é `escolta_case_v2.scad`. Abra-o no OpenSCAD e
pressione **F5**: a opção `part = "assembly"` já mostra o conjunto completo.
Para enxergar o interior sem a tampa, troque apenas para `part = "layout"` e
pressione **F5** novamente. Para isolar a prateleira do buzzer, use
`part = "buzzer_detail"`.

## O que mudou nesta revisão

- A XIAO voltou a ficar apoiada **na borda longa**, e não com a face voltada
  para cima. Ela foi deslocada para dentro para liberar o parafuso do canto.
- O USB-C aponta diretamente para sua abertura na parede frontal; não aponta
  para o buzzer. A placa e o buzzer ficam orientados a 90 graus entre si.
- Na face dos componentes, olhando com o USB-C para cima, os LEDs ficam à
  direita e o reset à esquerda. Como a placa está sobre a borda, os LEDs ficam
  acima do USB-C. A janela de 3 × 3,2 mm foi colocada nessa posição.
- Os quatro parafusos da tampa ficam simétricos: 6 mm das laterais e 4 mm das
  bordas superior e inferior.
- A extremidade da antena BLE fica sem abraçadeira, fios ou parafuso ao redor.
- O bloco soldado de fios, medido em 30 × 15 × 14 mm, fica sob uma prateleira.
  O buzzer é preso acima dela e os sete furos de som foram elevados.
- O conector branco de 15 × 7 × 4,5 mm ganhou trilhos e um passante próprio
  para abraçadeira T18R de 2,5 mm.
- Todas as fixações internas usam agora a mesma abraçadeira comercial
  **T18R de 100 × 2,5 mm**. Os túneis possuem 3,1 × 1,5 mm para absorver a
  tolerância da impressão FDM.
- A bateria utiliza a mesma T18R, mas a cinta fecha sobre uma ponte impressa
  removível. As pernas da ponte encostam no piso e impedem que a cinta aperte
  diretamente a bolsa LiPo.
- O prolongador do botão possui **canal de retenção, ombro inferior e pino
  central de contato**. A haste e o ombro de 4,2 mm atravessam o furo de
  4,8 mm pelo lado externo; a trava em C de 1,2 mm, com entrada afunilada, é
  encaixada no canal de 1,8 mm pelo lado interno e fica presa entre os ombros.
- O conjunto mantém 0,4 mm de curso útil. A haste mede 4,2 mm e trabalha no
  furo de 4,8 mm, resultando em 0,30 mm de folga radial nominal.

## Peças para imprimir

- `escolta_base_v2_3.stl`: caixa, passantes T18R, berços e guias.
- `escolta_tampa_v2_2.stl`: tampa presa por quatro parafusos M2.
- `escolta_botao_reforcado_v2_2.stl`: prolongador externo pressionado pela
  criança.
- `escolta_trava_botao_reforcada_v2_2.stl`: trava positiva em C.
- `escolta_protetor_bateria_v2_3.stl`: ponte que distribui a força da T18R
  sobre a bateria.

## Fixação dos componentes

- **XIAO:** dois apoios sustentam a borda inferior. Uma abraçadeira de 2,5 mm
  entra pela abertura lateral do passante, cruza por baixo da placa e fecha
  sobre a borda superior. A cinta fica perto do USB-C; não deve avançar para
  os últimos 5 mm da placa, reservados à antena.
- **Tucho de fios:** entra por cima na área de 30 × 15 × 14 mm sob a
  prateleira. Não existem mais grampos internos para os fios, que permanecem
  unidos pela fita isolante aplicada no conjunto real.
- **Buzzer:** fica deitado acima da prateleira, com a face sonora apontada para
  os sete pequenos furos altos da parede. A abraçadeira passa pelas duas fendas
  da prateleira e não comprime o tucho inferior. A prateleira nasce na parede
  esquerda e possui duas pernas que chegam até o piso, fora do caminho dos
  fios.
- **Bateria LiPo:** duas longarinas deixam 2,2 mm livres para a T18R passar por
  baixo. A ponte impressa fica sobre a bateria e recebe a cinta; suas pernas
  apoiam no piso para que o aperto não seja transferido à célula.
- **Conector branco:** dois trilhos deixam 1,8 mm por baixo; a abraçadeira passa
  pelo túnel central e fecha sobre o conector.
- **Botão:** o corpo soldado desliza lateralmente no alojamento em U sob a
  tampa e fica retido pelos ressaltos laterais. A peça vermelha entra pelo lado
  externo; por baixo da tampa, encaixe a trava em C no canal estreito da haste.
  Como a trava é maior que o furo da tampa, ela impede a extração do
  prolongador. O pino central toca o atuador sem apoiar sobre o corpo do botão.

## Ordem de montagem

1. Separe quatro abraçadeiras T18R de 100 × 2,5 mm e passe primeiro as cintas
   da XIAO, do conector e da bateria em seus túneis.
2. Coloque a XIAO sobre a borda longa, alinhe USB-C e RGB e feche a cinta sem
   apertar componentes; deixe a extremidade da antena totalmente livre.
3. Acomode sob a prateleira o tucho já preso com fita isolante.
4. Posicione o buzzer acima da prateleira, a face nos furos, e feche sua cinta.
5. Prenda o conector branco em seu passante.
6. Coloque a bateria, encaixe a ponte impressa sobre ela e feche a T18R sobre
   a ponte. Aperte somente até eliminar a folga; a ponte deve apoiar no piso.
7. Passe primeiro o prolongador por fora da tampa. Por dentro, empurre a trava
   em C lateralmente até ela ocupar todo o canal. Depois encaixe o corpo
   quadrado do botão eletrônico no alojamento em U.
8. Pressione o prolongador 20 vezes: ele deve clicar, retornar sozinho e não
   pode sair quando puxado moderadamente para fora. Só então teste USB-C, LED
   e som.
9. Feche com quatro parafusos M2 x 8 mm autoatarraxantes para plástico, sem
   excesso de torque.

## Impressão de teste

- Base e tampa: PLA ou PETG, camada de 0,20 mm, 3 perímetros e 20% de
  preenchimento.
- Ponte protetora da bateria: PLA ou PETG, camada de 0,20 mm, 3 perímetros e
  30% de preenchimento, com a face larga apoiada na mesa.
- Prolongador e trava: **PETG recomendado**, camada de 0,12 mm, 4 perímetros e
  100% de preenchimento. Imprimir sem alterar a escala.
- A tampa, o prolongador e a trava já são exportados na orientação correta.
- Faça primeiro a prova da tampa com o prolongador e a trava. Não use cola no
  primeiro teste; o objetivo é validar encaixe, retenção e curso.

Dimensão nominal do corpo: 61 × 46 mm; com os passantes, a largura total é
57 mm. A base agora tem **33 mm** e a tampa 2,4 mm. O aumento de altura é a
consequência direta de empilhar o tucho de 14 mm e o buzzer de 12 mm.

Esta continua sendo uma peça de prova. Antes do uso no braço, confirme na peça
real o alinhamento da janela do RGB, do USB-C, do botão e a folga do tucho.
