# Autonomia observada — dois ciclos de novembro de 2026

Os dois ciclos foram acompanhados com a caixa fechada e o aplicativo no Samsung
Galaxy S24 Ultra. Os horários abaixo são de São Paulo (UTC−3), derivados dos
registros UTC exportados. Porcentagem e tensão são indicações da XIAO; não houve
medição contínua independente da corrente ou da capacidade da célula.

| Ciclo | Início | Última telemetria válida | Intervalo observado | Observação |
| --- | --- | --- | --- | --- |
| 6/11 | 5h31, 100% e 4,13 V indicados | 23h55 | cerca de 18 h 24 min | A caixinha parou; 0% apareceu cerca de 2 h 21 min antes da última telemetria. |
| 7–8/11 | 23h41, 100% e 4,11 V indicados | 17h58 do dia seguinte | cerca de 18 h 17 min | Perda do vínculo às 17h59 e parada física observada; 0% apareceu cerca de 2 h 08 min antes da última telemetria. |

Fontes preservadas:

- [`Escolta_autonomia_a1_2026-11-07T16-09-44-199Z_registros.csv`](dados/Escolta_autonomia_a1_2026-11-07T16-09-44-199Z_registros.csv): exportação do primeiro ciclo, incluindo sessões curtas anteriores; 1.162 registros no total.
- [`Escolta_autonomia_a1_2026-11-07T16-11-07-831Z_resumo.csv`](dados/Escolta_autonomia_a1_2026-11-07T16-11-07-831Z_resumo.csv): resumo exportado após o primeiro ciclo.
- [`Escolta_autonomia_a1_2026-11-08T21-02-29-673Z_registros.csv`](dados/Escolta_autonomia_a1_2026-11-08T21-02-29-673Z_registros.csv): exportação cumulativa com o primeiro ciclo e a repetição de 7–8/11. Os registros do primeiro ciclo aparecem novamente aqui; **não são uma terceira coleta independente**.

O fim da observação foi definido pela última telemetria válida, não pela hora em
que o aplicativo exibiu 0%. A duração observada não é uma autonomia mínima
garantida para outros padrões de uso. O descompasso do indicador é uma limitação
real: o percentual exibido não representou adequadamente o tempo restante.
Os ensaios foram anteriores à versão oficial 1.0.5; a descarga completa não foi
repetida após as mudanças nos controles do alerta.
