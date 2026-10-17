# Impressão de teste — apoios do botão corrigidos (02/10/2026)

## Para quem já possui as outras peças

Imprimir somente `02_tampa_v2_8.stl`. Reutilizar a base V2.6, o prolongador
vermelho V2.7 e a trava C V2.5: suas geometrias não foram alteradas.

## Kit completo atual

1. `01_base_v2_6.stl` — base; fundo na mesa.
2. `02_tampa_v2_8.stl` — tampa corrigida; face externa plana na mesa.
3. `03_botao_vermelho_v2_7.stl` — prolongador; cabeça larga na mesa.
4. `04_trava_C_v2_5.stl` — trava; face maior na mesa.

Manter escala de 100% em todos os eixos. As duas abas de apoio do botão são
integradas à tampa: NÃO são impressas como peças separadas. A face externa
da tampa mantém 61 × 46 mm e 2,4 mm de espessura; o alojamento interno
estende-se 10,4 mm para dentro. O STL orientado para impressão tem 12,8 mm
de altura total por incluir esse alojamento.

## Atenção ao fatiamento da tampa

- Conferir na prévia por camadas que as duas abas existem: começam em
  Z=11,0 mm e terminam em Z=12,8 mm na orientação fornecida.
- Cada aba avança 1,2 mm para dentro, tem 1,8 mm de espessura e se une à
  parede lateral. O centro continua aberto, com 4 mm de largura.
- Pedir ao responsável pela impressão para avaliar suportes localizados
  sob as abas, em vez de assumir que a configuração antiga sem suportes
  produzirá essa região corretamente. Se usados, remover completamente
  antes de montar, sem danificar a superfície plana de apoio.
- Não ampliar ou reduzir a peça no fatiador para corrigir folgas.

## Montagem e conferência física

1. Passar a haste vermelha pelo furo externo de Ø4,8 mm, sem forçar.
2. Instalar a trava C pelo lado interno.
3. Introduzir o botão eletrônico pela entrada frontal do alojamento em U.
   A carcaça deve assentar nas duas abas, sem apoiar sobre soldas ou pernas.
4. Executar 20 acionamentos e conferir clique, retorno e ausência de recuo
   do botão eletrônico. Não pode ficar acionado em repouso.
5. Fechar a tampa e repetir o teste, verificando também o alinhamento dos
   parafusos e a ausência de pressão sobre componentes e fios.

No CAD, a face de apoio está a 8,6 mm da face interna da tampa e a folga
sobre o atuador é de 0,5 mm. A correção elimina a interferência anterior;
o desempenho da impressão e das soldas reais ainda exige o teste acima.

Não enviar modelos de `historico`. A tampa antiga foi preservada em
`historico/antes_apoios_v2_8`, junto com o código anterior.
