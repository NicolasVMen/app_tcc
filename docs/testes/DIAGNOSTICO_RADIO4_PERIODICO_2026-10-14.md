# Radio4: consulta periódica para investigar queda sem afastamento

Motivação: nos três ensaios recentes a 1 m, o filtrado médio foi -62,40, -75,63 e -74,20 dBm. O responsável negou mudanças intencionais entre ensaios e explicou que manuseia o celular para operar a tela e o devolve ao lugar. A hipótese de alteração tardia da potência ainda não foi comprovada nem descartada pelos checkpoints iniciais de 1,5/3 s.

## Escopo desta instrumentação

Macro adicional `ESCOLTA_TESTE_RADIO_DIAGNOSTICO_PERIODICO=1`, opt-in do diagnóstico. Mantém o perfil funcional `xiao-p5-r4` e solicitação de +4 dBm uma vez por conexão. Nenhuma alteração de filtros, limiares, temporização, confirmação, potência-alvo, advertising ou PHY.

Com USB/monitor Serial aberto e conexão BLE ativa, consulta potência atual reportada pelo controlador, PHY e advertising a cada 5 s, incluindo uptime do firmware. Não reaplica potência nessas consultas. Sem Serial aberto, não há consultas periódicas; sem conexão, limpa o estado da coleta. A diferença de tempos usa aritmética unsigned para rollover.

O binário é identificado pelo novo hash e pelo marcador `build=p5-radio4-periodic`, embora o contrato de telemetria continue `xiao-p5-r4`. O JSON e o CSV não receberam campos novos de potência. A leitura do controlador não equivale a medir potência irradiada com instrumento RF externo.

Leitor `tools/diagnostico-radio.ps1 -WatchWholePeriod` mantém a captura por janela delimitada, sem terminar nas cinco primeiras amostras. Acrescenta horário UTC de recepção USB, registra diagnósticos/eventos BLE e amostras RSSI espaçadas em cerca de 5 s. Não escreve comandos na porta nem executa reset a 1200 baud.

## Preparação

O responsável confirmou “está em espera e tudo conectado”. XIAO Sense reidentificada na COM8, serial 8BDE14575D4B412E. 125 testes JavaScript aprovados; sintaxe PowerShell aprovada sem abrir a porta na checagem.

Compilação completa aprovada: 334808 bytes de programa (41%), 70056 bytes globais (29%). Pacote `.expo/radio-p5-4dbm-periodic/xiao_escolta_ble.ino.zip`, SHA256 `3C7902268AB976996AA77515C4C21E94ABE40F665CAF595BE7283EBE68492F5D`. Gravação em espera concluída via DFU COM9 com `Device programmed`, retorno da aplicação à COM8. Perfil funcional e firmware informado continuam `xiao-p5-r4`; diferenciação da instrumentação pelo hash e marcador `p5-radio4-periodic`. Na preparação, as consultas tardias ainda estavam pendentes; resultado acrescentado abaixo após captura.

## Resultado da captura e da nova coleta

Captura delimitada encerrada normalmente. As 51 consultas preservadas, de 22:35:11Z a 22:39:21Z, reportaram +4 dBm e PHY LE 1M, com sucesso nas leituras, mesmo com oscilação do sinal. Abrangem integralmente o novo ensaio de 1 m, com 30 amostras seguras, estimativa média de 0,89 m e faixa de 0,8–1,0 m. Responsável relatou ausência de bipes nos testes desta etapa. Não apareceu queda da potência configurada neste intervalo, sem que isso prove a causa das oscilações anteriores. Detalhes, identidade do CSV, limites e próximo teste: `ANALISE_RADIO4_COLETA_PERIODICA_1M_2026-10-14.md`. Não houve mudança adicional de parâmetros nesta análise.

## Observação proposta

Após gravação em espera e abertura do monitor, retomar proteção com caixa e celular a 1 m, USB da XIAO mantido conectado nesta observação. Não comparar essa série diretamente com bateria/USB misturados como se fossem condições iguais.

Manter ambos parados por 1 minuto; manusear o celular como normalmente faz entre ensaios e devolvê-lo ao mesmo lugar; aguardar mais 1 minuto. Sem braço bloqueando de propósito nesta etapa. Informar ao chat o momento do manuseio e qualquer variação/alarme. Captura de até cinco minutos permite a preparação, não é promessa de observação ativa fora da sessão.

Objetivo: verificar se os valores de potência/PHY permanecem iguais quando RSSI/estimativa variam. Se a potência cair ou mudar, apurar a mudança antes de regular limites. Se ficar constante, isso enfraquece essa hipótese, mas não isola automaticamente mesa, orientação, corpo, relógio, interferência ou falha de leitura. Não inventar causa nem afirmar que testes de praia/shopping foram feitos.

## Limitação de engenharia

A distância calculada a partir de RSSI não é uma medida direta: mudanças de orientação e propagação podem produzir intensidades diferentes para a mesma distância. Suavizar a tela pode esconder variação sem corrigir a informação. Os alertas permaneceram estáveis nas três novas coletas, mas isso não aprova precisão métrica, segurança infantil ou desempenho universal. Qualquer ajuste posterior deve ser validado também para afastamento real, não apenas para eliminar amarelo perto.

Fontes primárias de apoio: [Bluetooth SIG, RSSI como aproximação de distância](https://www.bluetooth.com/core-specification-6-feature-overview/) e [NIST, avaliação experimental de métricas de encontros BLE](https://tsapps.nist.gov/publication/get_pdf.cfm?lang=en&pub_id=933476). São limites gerais e contexto, não diagnóstico causal destes três ensaios.
