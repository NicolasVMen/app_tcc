# CSV por arquivo e repetição de 4/5 m — 15/10/2026

Arquivo recebido do responsável: `D:/Dados de Nicolas/Downloads/Escolta_2026-10-15_23-24-03-581_historico_amostras.csv`. Cópia integral preservada em `dados/Escolta_2026-10-15_23-24-03-581_historico_amostras.csv`. SHA-256 `1C85425AE6518BC0628AE7272735265B52516AF0E7DF69ED95C49DE0874238F0`, 176.476 bytes, UTF-8 com BOM.

## Conferência da exportação

- 22 colunas, 584 linhas de dados, 21 ensaios; nenhuma chave `ensaio|amostra` duplicada.
- Comparação por chave e por todos os valores com o arquivo anterior de 502 linhas: **zero linhas ausentes e zero linhas modificadas**. O histórico exportado anterior foi preservado neste arquivo.
- 82 linhas adicionais: um ensaio incompleto de 1 m, com 22 amostras, e dois ensaios concluídos de 4/5 m, com 30 amostras cada.
- Receber um CSV completo confirma uma exportação física bem-sucedida no fluxo atual, não todos os cenários de seletor/cancelamento/repetição, salvamento em pasta ou manutenção de BLE durante compartilhamento. A forma exata de entrega do arquivo não foi descrita separadamente pelo responsável; não inferir destino/cancelamentos executados só pelo anexo.

## Ensaios adicionais

Todos informam `xiao-p5-r4`, SM-S928B, Android 36, app 1.0.0, altura vazia. Não inventar altura/condições não registradas.

| Ensaio | ID | Amostras | RSSI filtrado médio/faixa (dBm) | Estimativa média (m) | Estados |
|---|---|---:|---|---:|---|
| 1 m incompleto, condição Teste 1 | 1792115056701-lo1wm0 | 22 | -74,00 / -78 a -70 | 1,62 | 22 seguro |
| Repetição 4m | 1792115514383-udl0zk | 30 | -79,67 / -84 a -77 | 2,72 | 5 atenção, 25 seguro |
| Repetição 5m | 1792115576597-s8utx4 | 30 | -85,83 / -86 a -85 | 4,53 | 30 atenção |

As repetições de 4/5 m começaram às 22:51:54 e 22:52:56 de 15/10 em São Paulo (01:51:54/01:52:56 UTC de 16/10). São anteriores à correção da exportação/layout, portanto não certificam nova coleta depois do patch.

Nos dois ensaios concluídos: amostras 1–30, 30 IDs distintos por ensaio, primeira leitura após os 10 s de acomodação, maiores intervalos 1.037/1.025 ms e idades máximas 340/207 ms. Nenhum congelamento evidente nesses instantâneos. Não usar esses resultados como prova de ausência de desconexões entre ensaios.

## Comparação com a primeira passagem

| Distância | RSSI médio anterior (dBm) | RSSI médio repetido (dBm) | Estimativa média anterior → repetida (m) |
|---:|---:|---:|---:|
| 4 m | -92,03 | -79,67 | 7,76 → 2,72 |
| 5 m | -86,03 | -85,83 | 4,64 → 4,53 |

O ponto de 5 m foi numericamente semelhante nesta repetição, sem certificar repetibilidade geral. A 4 m houve diferença de aproximadamente **12,37 dB** entre médias, com faixas filtradas sem sobreposição. Isso não é explicado como um único pico isolado dentro da primeira coleta: ela permaneceu inteira entre -93 e -91 dBm. Causa física específica não identificada pelos dados; não afirmar movimento de braço, orientação ou defeito como fato.

Novo 4 m teve 25 amostras em seguro com estimativa média total 2,72 m. É mais uma evidência de que os estados atuais não seguem cortes exatos de 2/5 m na estimativa, não uma falha nova criada pelo exportador. Emergência retida na primeira passagem não é comparável diretamente à contagem de atenção do segundo ensaio de 5 m como se fossem novos disparos.

## Direção para calibração

Preservar ambas as leituras de 4 m; não eliminar a mais fraca só porque prejudica o ajuste. Não tratar a repetição como validação independente se ela for usada para escolher parâmetros. Considerar os dez pontos e as repetições, com ponderação explícita para não dar peso dobrado a 4/5 m por terem mais ensaios. Usar o 1 m incompleto somente com identificação e justificativa, não chamá-lo de coleta concluída.

O novo 1 m inclui RSSI filtrado até -78 dBm e o novo 4 m chega a -77 dBm: há sobreposição de sinal mesmo nesta campanha. Não prometer que apenas um limiar de RSSI distinguirá toda distância de 1 a 4 m. Manter proteção temporal e histerese e avaliar separadamente erro de distância, falsas entradas perto e detecção de afastamento; não reduzir a discussão só ao erro médio da fórmula.

Nenhuma alteração de fórmula, filtros, potência, alarmes, firmware ou aplicativo foi feita nesta análise do arquivo.
