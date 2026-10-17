# Primeira passagem de 1 a 10 m — análise dos dados recebidos

## Origem e seleção

Arquivo integral preservado em `dados/calibracao-radio4-1-a-10m-2026-10-15-original.csv`, SHA-256 `BB607C397DBF1236E6168CF0752E2038F500049FD2B8F69228D62C6B24A73571`. Exportação contém 502 linhas de dados: 202 históricas e 300 desta passagem. Não misturar as 202 históricas ao ajuste principal.

Selecionados os dez ensaios com condição literal `Teste 1`, firmware `xiao-p5-r4`, início entre `2026-10-16T01:25:25.393Z` e `2026-10-16T01:39:48.988Z` (15/10, 22:25–22:39 em São Paulo). Primeiro ID `1792113925393-hlwypj`, último `1792114788988-s0bqk9`. Modelo SM-S928B, Android 36, app informado 1.0.0.

Responsável informou caixa fechada em cadeira e confirmou isolamento dos fios soltos. Altura está vazia no CSV; condição não descreve orientação/ambiente/alimentação em detalhe. Não preencher metadados retrospectivamente como se tivessem sido medidos.

## Integridade

- Dez distâncias, de 1 a 10 m, um ensaio por distância; todos concluídos com amostras 1–30.
- IDs de leitura distintos e estritamente crescentes dentro de cada ensaio.
- Primeira leitura de cada ensaio após os 10 s de acomodação.
- Maior intervalo entre leituras exportadas: 1.540 ms; maior idade leitura→recebimento: 688 ms; nenhuma idade negativa.
- Esses registros não mostram congelamento durante as coletas. Não comprovam ausência de desconexão entre ensaios ou funcionamento em segundo plano.

## Resultados antes de qualquer ajuste

RSSI abaixo é o valor filtrado arredondado exportado pela placa. Distância é a média das estimativas exportadas, não a conversão da média do RSSI.

| Distância real (m) | RSSI médio (dBm) | Faixa RSSI (dBm) | Estimativa média (m) | Estado nas 30 amostras |
|---:|---:|:---:|---:|:---|
| 1 | -65,53 | -66 a -65 | 0,78 | seguro |
| 2 | -71,57 | -72 a -71 | 1,32 | seguro |
| 3 | -84,23 | -87 a -83 | 3,94 | atenção |
| 4 | -92,03 | -93 a -91 | 7,76 | pânico |
| 5 | -86,03 | -87 a -86 | 4,64 | pânico |
| 6 | -92,97 | -94 a -92 | 8,46 | pânico |
| 7 | -93,20 | -95 a -92 | 8,65 | pânico |
| 8 | -93,67 | -95 a -93 | 8,99 | pânico |
| 9 | -90,10 | -92 a -89 | 6,55 | pânico |
| 10 | -92,40 | -95 a -91 | 8,05 | pânico |

Erro absoluto médio das 300 estimativas atuais: **1,5453 m**; maior erro absoluto observado: **4,4 m**. São erros desta passagem, não precisão generalizável nem avaliação independente de uma nova calibração.

## Consequências para o ajuste

1. A passagem é utilizável para avaliar e ajustar um candidato. O responsável dispensou a segunda passagem completa; não presumir que ela produziria dados semelhantes nem registrar validação B inexistente.
2. A 4 m o sinal ficou cerca de 6 dB mais fraco que a 5 m, com faixas sem sobreposição nessa coleta. Uma conversão monotônica baseada somente nesse RSSI necessariamente atribui maior distância ao ponto de 4 m. Um limiar de sinal que reconheça 5 m como distante também reconhecerá esse ponto de 4 m como distante. Alterar apenas referência/expoente não resolve essa ambiguidade.
3. Pontos de 4, 6, 7, 8, 9 e 10 m têm sobreposições de RSSI. Não construir tabela que use a distância real do ensaio como entrada do sistema nem forçar pontos monotônicos para aparentar acerto.
4. Todos os registros a partir de 4 m têm pânico ativo. Como o alerta é retido até confirmação de segurança, o pânico a 5 m não demonstra um novo disparo nessa distância. A origem/momento inicial do disparo não está registrada nesta exportação.
5. Comparar ajustes simples com a fórmula atual usando todos os pontos desta passagem, preservar os dados anteriores de 1 m como avaliação adicional de robustez (não validação independente da campanha) e documentar erros. Não anunciar limites físicos exatos de 2/5 m com base neste CSV.
6. Após escolher um candidato, fazer conferência física curta de limites e retorno, incluindo 4 e 5 m, em vez de exigir agora outra passagem completa de 1 a 10 m. Sem essa conferência, calibração continua provisória. Reparo/teste do botão físico permanece pendente.

Nesta análise não houve alteração de firmware, potência, filtros, fórmula, limites, aplicativo ou versão oficial; nenhuma gravação no dispositivo foi realizada.
