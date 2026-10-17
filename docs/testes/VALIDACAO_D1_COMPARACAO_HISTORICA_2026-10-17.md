# Validação D1 e comparação desde os primeiros ensaios — 17/10/2026

## Fonte nova e integridade

Recebido `Escolta_2026-10-17_14-50-10-790_historico_amostras.csv`, copiado integralmente para `dados/` sem alterações. SHA-256 `D3F384B688D914A8D01EF025A5EED51190C4CE8BEF3D16EF8796E65256E0960E`, 69.577 bytes, 22 colunas, 7 ensaios/210 amostras. Distâncias 1, 2, 3, 4, 5, 7 e 10 m, todos concluídos com 30 amostras e firmware `xiao-p5-r4-d1`. Responsável confirma ambos os dispositivos parados. Condição exportada genérica, altura numérica vazia; não inventar medidas de altura ou geometria idêntica entre dias.

IDs `1792258720539-u0q8zk`, `1792258853445-m7x5ee`, `1792259009039-6yr0w3`, `1792259090626-583tje`, `1792259159818-si5vuk`, `1792259254430-5ovvsy`, `1792259330902-1b58kl`. Cada série tem amostras 1–30, IDs de RSSI distintos/crescentes, primeira leitura após 10 s de acomodação, idades entre 65 e 580 ms e maior intervalo 1.503 ms. Sem chaves duplicadas. Não há evidência de congelamento nas sete janelas; não inferir continuidade de conexão fora delas.

O arquivo atual contém somente os sete ensaios novos. Os 21 ensaios/584 linhas exportados antes permanecem preservados em outro arquivo local e foram usados na comparação. Não inferir pela ausência neste arquivo que foram apagados do app: conta, seleção ou histórico atual ainda não esclarecidos.

## Resultados novos: precisão e estabilidade são diferentes

| Real (m) | Estimativa média (m) | Faixa da estimativa (m) | Erro absoluto médio (m) | RSSI filtrado médio/faixa (dBm) | Estados |
|---:|---:|:---:|---:|:---|:---|
| 1 | 0,80 | 0,8–0,8 | 0,20 | -61,00 / -61 a -61 | 30 seguro |
| 2 | 1,24 | 1,2–1,3 | 0,76 | -66,50 / -67 a -66 | 30 seguro |
| 3 | 3,05 | 2,3–4,5 | 0,59 | -79,43 / -85 a -76 | 26 seguro, 4 atenção |
| 4 | 4,42 | 4,1–4,9 | 0,42 | -85,17 / -87 a -84 | 30 atenção |
| 5 | 2,48 | 2,4–2,5 | 2,52 | -76,77 / -77 a -76 | 27 seguro, 3 atenção |
| 7 | 5,06 | 4,7–5,3 | 1,94 | -87,17 / -88 a -86 | 30 atenção |
| 10 | 7,60 | 6,3–9,1 | 2,40 | -93,07 / -96 a -90 | 30 pânico |

Erro absoluto médio das estimativas exportadas: **1,26190 m** nesta campanha. A média a 3 m coincide aproximadamente com a distância real, mas houve oscilação de 2,3 a 4,5 m. A 5 m, a leitura é estável porém enviesada (2,4–2,5 m), portanto aumentar suavização não remove esse erro. O ponto de 4 m teve erro menor que o de 2 m; não há quebra universal exatamente a partir de 3 m.

## Comparação histórica das médias exibidas

Cada célula é a média registrada em uma campanha, não uma medição controlada do efeito da potência. Travessão significa sem ponto equivalente nessa série.

| Real (m) | Inicial, relato no chão | Elevados anteriores ao +4 | +4 antes de D1, 15/10 | D1, 17/10 |
|---:|---:|---:|---:|---:|
| 1 | 3,43 | 0,86 | 0,78 | 0,80 |
| 2 | 8,79 | — | 1,32 | 1,24 |
| 3 | 4,26 | 3,17 | 3,94 | 3,05 |
| 4 | 10,56 | — | 7,76 / 2,72 | 4,42 |
| 5 | 16,06 | 3,35 | 4,64 / 4,53 | 2,48 |
| 7 | 12,51 | 6,36 | 8,65 | 5,06 |
| 10 | 21,77 | — | 8,05 | 7,60 |

As duas células com barra são ensaio inicial e repetição, não média combinada nem escolha do melhor. Condições, versões, altura e fórmula mudaram entre etapas; não atribuir todas as diferenças a +4 dBm ou à D1. As exportações iniciais não informam firmware/potência, e o CSV atual não exporta potência medida por amostra.

Fontes antigas preservadas:

- `dados/primeira-campanha-1-a-10m-2026-10-06-original.csv`, primeiro histórico completo até 10 m, fonte anexo `87c88132-ca1e-4d10-84b7-1aa3e8e9ba7f`, SHA-256 `2CB38C56DD12992533474047C231E09A09802F9256F1B134E3E365F626130E50`.
- `dados/historico-ensaios-elevados-2026-10-06-original.csv`, anexo `4fd4e56e-3b41-4b66-b982-06da2b914a8a`, SHA-256 `FB2E42037D8B7E0E517812F3977EA891F64024000BD072F000E68524474586D3`; quatro séries elevadas também estão na fixture JSON já usada na revisão p2.
- `dados/Escolta_2026-10-15_23-24-03-581_historico_amostras.csv`, histórico +4 antes D1, SHA-256 `1C85425AE6518BC0628AE7272735265B52516AF0E7DF69ED95C49DE0874238F0`.

Há um ensaio antigo interrompido de 3 m sem amostras representado por seis campos apenas. O leitor de análise acrescenta células vazias somente em memória e exclui esse ensaio dos cálculos: nunca trata vazio como RSSI/distância zero. O primeiro anexo parcial até 8 m (`867f...`) e a exportação completa posterior (`87c...`) têm valores diferentes para o mesmo ID do ensaio de 8 m; não contam como medições independentes. A tabela usa explicitamente o histórico completo e não inclui esse ponto sem correspondente atual.

## Sinal: o problema antecede o aumento da potência

- Nos ensaios elevados antigos, 3 m: **-83,43 dBm**, 5 m: **-83,90 dBm**. Diferença de apenas 0,47 dB entre médias; a ambiguidade de distância já estava presente.
- Em 15/10, 4 m teve **-92,03 dBm** e depois **-79,67 dBm**, diferença de 12,37 dB sem mudar a distância real informada. A 5 m, as médias foram -86,03/-85,83 dBm.
- Hoje, 4 m: **-85,17 dBm**, 5 m: **-76,77 dBm**. O sinal em 5 m ficou **8,40 dB mais forte** que em 4 m. A 5 m também ficou mais forte que em 3 m (-79,43 dBm), apesar da distância maior.
- A leitura de 5 m ficou cerca de 9,07/9,27 dB mais forte que as duas coletas de 5 m de 15/10. A conversão monotônica necessariamente interpreta esse sinal mais forte como menor distância.

Não há nos registros evidência de um bloqueio de software em 3 m. Ambos parados e leituras novas não eliminam diferenças de propagação/reflexões/ambiente. A causa física específica da inversão de hoje não foi isolada; não atribuir ao braço, relógio, antena, mesa ou perda de potência como fato.

## Teste da D1 contra a fórmula anterior nas MESMAS leituras novas

Para separar efeitos da fórmula e do ambiente, recalcular as duas fórmulas usando os mesmos 210 valores inteiros de RSSI filtrado exportado:

- Legada (-68,44 / 2,65): erro absoluto médio **1,30563 m**.
- D1 (-63,386376 / 3,377961): erro absoluto médio **1,25253 m**.
- Redução relativa **4,07%**, cerca de 5,3 cm no erro médio deste conjunto, sem teste de significância/generalização.
- Melhora nos pontos 1, 2, 3 e 5 m; piora em 4, 7 e 10 m. A 10 m, erro passa de aproximadamente 1,52 m para 2,41 m nesse cálculo.

Esse recálculo usa RSSI arredondado do CSV, enquanto o firmware usa float e exporta metros com uma casa decimal; por isso difere ligeiramente do erro real exportado (1,26190 m). Não comparar 1,30563 com 1,26190 para anunciar uma porcentagem exata do efeito da fórmula. Não refazer o ajuste com estes dados e ainda chamá-los de conferência independente da nova versão.

Reprodução: `node tools/analisar-validacao-d1.cjs`, somente leitura. Mantida a fórmula D1 fixa nessa análise.

## Conclusão e impacto antes do APK

A D1 apresenta melhoria média modesta nesta conferência, mas **não valida precisão métrica nem separação física exata verde ≤2 m/amarelo 2–5 m/vermelho ≥5 m**. A 5 m houve 27/30 amostras em seguro. Como cores e confirmação usam sinal, sinal forte pode ser interpretado como proximidade sem comprovar distância real. Esse cenário precisa constar como limite real do sistema; não aprovar o requisito físico apenas porque código e temporizadores funcionam.

Não recomendar mais potência como correção comprovada de precisão, nem aumentar indiscriminadamente filtros para esconder uma leitura estável e errada. Não descartar o ensaio de 5 m nem retocar coeficientes para encaixá-lo isoladamente. Próxima decisão deve separar apresentação experimental em metros da política de alertas por condição do enlace, sem declarar presença física comprovada por RSSI. Nenhuma mudança de código do aplicativo, firmware ou parâmetros e nenhuma gravação realizadas nesta análise.

Confirmação da execução D1/CSV e 210 amostras novas concluída; regressão de alertas/retorno/confirmação/tela bloqueada, reparo/teste do botão, bateria e APK sem servidor permanecem separados. Não repetir a campanha toda como resposta automática ao erro de 5 m.

## Referências de contexto (não diagnóstico individual)

- [Bluetooth SIG — Bluetooth LE Primer, seção 8.1](https://www.bluetooth.com/bluetooth-le-primer/): explicita limitações da estimativa por RSSI além de poucos metros. Não demonstra que a XIAO tenha Channel Sounding nem fornece uma atualização de software para habilitá-lo.
- [Bluetooth SIG — alcance e potência](https://www.bluetooth.com/learn-about-bluetooth/key-attributes/range/): potência aumenta a possibilidade de recepção/alcance; propagação depende do ambiente. Maior potência não é garantia de distância mais exata.
