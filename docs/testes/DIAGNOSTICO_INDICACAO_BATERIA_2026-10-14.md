# Investigação da indicação de 95% / 4,13 V

## Relatos

Na abertura da investigação, o responsável informou teto observado de 4,12–4,13 V e 95% após longo período carregando no dia anterior. Posteriormente, somente na bateria, informou 4,10 V e 90%. As primeiras hipóteses foram levantadas antes do esclarecimento do indicador de carga e da comparação externa atual, registrados nas atualizações abaixo. A duração exata da carga não foi informada.

## Código conferido, sem alteração

Em `firmware/xiao_escolta_ble/xiao_escolta_ble.ino`, a tensão é lida do ADC da placa, suavizada e convertida em percentual por tabela. No trecho final, a tabela interpola 90% a 4,08 V e 100% a 4,20 V. Em 4,13 V, resulta aproximadamente 94,17%, arredonda para 94% e depois para passo de 5%: 95%. Isso explica o percentual exibido, não o teto da tensão. Não há comando para interromper a carga quando o percentual chega a 95%.

Configuração encontrada: leitura ADC de 12 bits, referência `AR_INTERNAL2V4`, divisor nominal 1 MΩ / 510 kΩ, `PIN_VBAT_ENABLE` mantido LOW, 16 leituras com 250 µs entre elas, média e EMA 0,20. Corrente de carga selecionada por P0.13 em alta impedância (aproximadamente 50 mA, conforme documentação Seeed). Status é `USB detectado && P0.17 LOW`; P0.17 HIGH não distingue sozinho carga completa de todos os estados sem carga/falha.

Núcleo instalado conferido: Seeeduino Mbed 2.9.3, variante `SEEED_XIAO_NRF52840_SENSE`. `variant.cpp` inicia `adcCurrentConfig.acq_time` em `NRF_SAADC_ACQTIME_10US`. `analogReference` altera referência e ganho, não esse tempo. O sketch não chama `analogAcquisitionTime`. `wiring_analog.cpp` aplica a configuração modificada ao criar o objeto ADC. Não foi feita leitura runtime do registrador ADC nesta investigação.

## Ponto técnico a investigar: aquisição do ADC

O equivalente resistivo nominal do divisor 1 MΩ em paralelo com 510 kΩ é aproximadamente 337,75 kΩ. A especificação Nordic lista resistência máxima da fonte de 100 kΩ a 10 µs, 400 kΩ a 20 µs e 800 kΩ a 40 µs. Portanto, 10 µs merece revisão para esse circuito de leitura de alta impedância; uma aquisição mais longa é alternativa técnica a testar, em vez de um ganho arbitrário para forçar 4,20 V.

O tempo entre chamadas `analogRead` e o atraso após habilitar o divisor não são o tempo de aquisição interno do conversor. Entretanto, não foi medida a tensão real nem caracterizado o efeito quantitativo do circuito/ADC. Não afirmar que esse ponto explica exatamente os 70 mV ou que corrigir o tempo fará a carga chegar a 100%. A tolerância dos componentes/referência também pode contribuir. O efeito sobre a tensão deve ser comparado com instrumento independente, idealmente com auxílio técnico se os terminais não estiverem acessíveis com segurança.

## Carregamento versus leitura

O BQ25101 tem regulação nominal de 4,2 V segundo a TI; a carga é controlada por hardware, não pela tabela percentual. A TI também ressalva o efeito de carga do sistema em paralelo sobre a conclusão do carregamento. Assim, há hipóteses distintas: leitura ADC subestimada, comportamento real da carga/alimentação/consumo ou combinação. O relato sozinho não escolhe uma delas.

Não aumentar corrente ou tensão de carga, não declarar 4,13 V como 100% e não orientar carga indefinida. Primeiro esclarecer estado Carregando/USB no teto e disponibilidade de medição independente. Nenhum código, firmware, pacote ou parâmetro foi alterado nesta investigação; não houve gravação na placa.

## Comparação atual informada pelo responsável

| Condição | Aplicativo | Multímetro | Diferença multímetro menos app |
| --- | --- | --- | --- |
| USB conectado, Carregando | 95%, 4,12 V | 4,16 V | +0,04 V, aproximadamente 0,96% da referência externa |
| USB desconectado, sem carregar | 95%, 4,12 V | 4,15 V | +0,03 V, aproximadamente 0,72% da referência externa |

São duas observações próximas ao topo da carga, relatadas pelo responsável, não captura instrumental independente. Não foram informados modelo/exatidão/calibração do multímetro, horários, tempo de estabilização ou pontos físicos exatos de medição. O app suaviza a tensão por EMA e a exporta com duas casas; a demora de resposta após retirar USB também pode contribuir. Não aplicar offset fixo de 35/40 mV nem fator de ganho com essas duas observações.

A placa indicou abaixo do multímetro nas duas condições. Isso sustenta investigar a medição, com diferença pequena, mas não prova que aquisição de 10 µs seja toda a causa nem que o carregador falhou. Também não existe evidência atual de erro fixo de 70 mV.

Aplicando a curva existente às referências externas: 4,15 V corresponde a aproximadamente 95,83% (arredonda para 96%, depois para 95% em passos de 5%); 4,16 V corresponde a aproximadamente 96,67% (97%, depois 95%). Portanto, corrigir a tensão para coincidir com essas leituras ainda pode deixar o indicador em 95%, coerentemente com a curva. Não trocar o topo por 4,12/4,13 V para obrigar 100%.

Segundo a tabela elétrica do BQ25101, a regulação tem mínimo de 4,16 V, típico de 4,20 V e máximo de 4,23 V nas condições especificadas. A referência externa de 4,16 V, por si, não demonstra defeito nem conclusão de carga: o término depende também de corrente/estado. Não usar a faixa de tolerância como certificação do hardware real ou como justificativa para carga indefinida.

Próximo ensaio técnico proposto: variante isolada de teste com aquisição ADC de 40 µs, mantendo referência, divisor, percentual, corrente de carga, rádio e alertas; comparar novamente a tensão após estabilização. Ainda não implementado, compilado ou gravado nesta atualização. Antes de qualquer gravação, solicitar confirmação de Sentinela em espera/silenciosa e XIAO no USB. O término real do carregamento permanece pendente, separado da indicação de percentual.

## Preparação do experimento ADC de 40 µs — 14/10

Após confirmar Sentinela em espera, USB conectado e autorizar o ensaio, foi implementado opt-in `ESCOLTA_TESTE_BATERIA_AQUISICAO_40US=1`. O padrão sem essa macro não chama a API nova. A variante exige Mbed, API da variante e perfil p5-r4 com +4 dBm. A chamada `analogAcquisitionTime(AT_40_US)` fica após a configuração da referência e antes da primeira leitura. Não há alteração de corrente/tensão de carga, divisor, curva percentual, EMA, rádio ou regras de alarme.

Com monitor serial aberto, o marcador `[BATTERY_ADC] profile=p5-r4-adc40 requested_us=40` identifica a variante e informa média ADC, tensão sem suavização, tensão suavizada e indicadores USB/carga. `requested_us` identifica a configuração solicitada pela API; não representa leitura independente do registrador SAADC. Sem monitor aberto, o diagnóstico não imprime. O leitor USB foi ampliado para aceitar essas linhas, sem comandos de controle.

Os quatro testes novos de contrato passaram, e a suíte total passou com 129 testes, zero falhas/skips/TODO. A primeira tentativa de compilação parou na guarda da API durante a fase de descoberta de bibliotecas: nesse estágio o Arduino omite temporariamente a configuração da variante. A guarda foi ajustada somente para essa fase; os quatro testes passaram novamente. Compilação final/gravação/comparação física serão registradas após execução, sem presumir sucesso por esses testes de contrato.

Retorno preservado: `.expo/radio-p5-4dbm-periodic/xiao_escolta_ble.ino.zip`, SHA256 `3C7902268AB976996AA77515C4C21E94ABE40F665CAF595BE7283EBE68492F5D`. A nova compilação usa diretório separado `.expo/battery-p5-r4-adc40`, sem sobrescrever esse pacote. A corrente extra e o efeito quantitativo sobre a leitura não foram medidos. Não concluir aumento de autonomia, fim de carga ou eliminação de toda diferença do ADC.

## Compilação, gravação e primeira captura ADC40

Compilação final aprovada no core Seeeduino Mbed 2.9.3, FQBN `Seeeduino:mbed:xiaonRF52840Sense`, ArduinoBLE 2.1.0 instalado em `D:/Dados de Nicolas/Documentos/Arduino/libraries/ArduinoBLE`. Flags: perfil de proximidade 4DB, confirmação próxima p5, diagnóstico de rádio, potência solicitada +4 dBm, diagnóstico periódico e o opt-in ADC40. Programa 335096 bytes (41%); globais 70056 bytes (29%).

Pacote `.expo/battery-p5-r4-adc40/xiao_escolta_ble.ino.zip`, SHA256 `54B6EF9451082975CD22FC4A260010C0232D1D192BEEC335587E8E812B5B0201`. O hash do pacote anterior foi reconferido e permaneceu o registrado acima. Identidade USB antes da gravação: serial `8BDE14575D4B412E`, VID 2886/PID 8045, COM8. Gravação autorizada concluída via DFU COM9 com `Device programmed`, retorno à COM8. ID funcional BLE permanece `xiao-p5-r4`; distinguir o experimento pelo hash e marcador ADC40.

Leitura passiva USB de 30 segundos concluída em 14/10 às 21:33 (UTC−3): seis registros, todos `usb=1 charging=1`. Tensão sem suavização de 4,1253 a 4,1308 V; suavizada de 4,1270 a 4,1281 V. Isso confirma execução da instrumentação da variante, não exatidão do ADC, término de carga, capacidade nem registrador SAADC lido independentemente. Não houve diagnóstico de rádio nessa janela; não inferir conexão, estado de espera confirmado pelo app, potência/PHY atuais ou regressão de alcance a partir dela. Não foram enviados comandos de proteção, carga ou rádio pelo leitor.

Captura preservada em `dados/battery-adc40-usb-2026-10-14.log`. Comparação simultânea com multímetro e app, após estabilização, permanece pendente. A captura inicial não demonstra grande mudança em relação aos 4,12 V anteriores; não calcular ganho/offset nem promover o experimento ao oficial por esse resultado.

## Comparação externa após ADC40 — relato do responsável

| Condição | Aplicativo | Multímetro | Diferença multímetro menos app |
| --- | --- | --- | --- |
| USB conectado, Carregando | 95%, 4,13 V | 4,15 V | +0,02 V, aproximadamente 0,48% |
| USB desconectado, sem carregar | 95%, 4,13 V | 4,15 V | +0,02 V, aproximadamente 0,48% |

A diferença relatada diminuiu em relação aos 30–40 mV anteriores. É evidência favorável ao ensaio, não calibração rastreável nem prova de que toda a variação foi causada pela aquisição mais longa: a referência com USB também mudou de 4,16 para 4,15 V, e não houve repetição controlada A/B, registro de incerteza do instrumento ou duração de estabilização. Não aplicar offset fixo de 20 mV.

O indicador de carga acompanhou a retirada do USB nas duas observações. O percentual de 95% permanece coerente tanto com 4,13 V quanto com 4,15 V na curva existente e não deve ser forçado a 100%. Não foi relatada transição para USB conectado sem carregar com o cabo ainda inserido; término real de carga permanece pendente. Antes de orientar qualquer tempo adicional de carga, esclarecer a duração já transcorrida. Nenhuma nova alteração de firmware, corrente de carga ou versão oficial nesta atualização.

## Esclarecimento de duração de carga

O responsável informou que a carga do dia anterior durou aproximadamente duas horas ou mais, sem lembrar a duração exata. Não tratar como sessão atual cronometrada nem como carga iniciada em bateria vazia. Pela capacidade nominal documentada de 180 mAh e corrente configurada de aproximadamente 50 mA, a divisão idealizada 180/50 corresponde a 3,6 h desde vazio, sem contabilizar redução da corrente na fase final, tolerâncias ou consumo. Esse cálculo não estima o tempo restante a 4,15 V nem certifica a célula. Duas horas isoladamente não demonstram falha de término de carga. Não aumentar corrente ou alterar a curva percentual com base nesse relato.

Próxima observação proposta, ainda não executada: uma janela adicional limitada a 30 minutos, supervisionada, com sistema em espera, registrando tensão/indicador no início e fim e, se ocorrer, mudança do indicador para USB conectado sem carregar. Interromper em caso de aquecimento anormal, inchaço ou odor. A janela é observação, não promessa de carga completa; se permanecer sem mudança, registrar e investigar em vez de orientar carga indefinida.

## Mudança visual solicitada após a investigação

O responsável solicitou aproximar a indicação para 100% acima de 4,10 V, preservando especialmente a faixa baixa. Essa é uma convenção visual de bateria alta, não calibração de capacidade, prova de fim de carga ou alteração do carregador. A observação adicional de 30 minutos anteriormente proposta não foi relatada como executada e deixa de ser requisito para esse ajuste visual; término real de carga continua sem comprovação.

Implementado opt-in `ESCOLTA_TESTE_BATERIA_TOPO_4100MV=1`, restrito à variante de teste ADC40. O último ponto da tabela passa de 4,20 V/100% para 4,10 V/100%, sem modificar os pontos até 4,08 V/90%. Com interpolação e passos de 5%, 4,09 V indica 95%; 4,10 V ou mais indica 100%. Sem a macro, o topo continua em 4,20 V. A tensão transmitida continua sendo a leitura suavizada real, sem offset ou substituição. O marcador USB adicional `display_top_v=4.10 pct=...` identifica a convenção em uso.

Os avisos existentes do app permanecem nos limiares de 20% e 10%, com a mesma curva baixa (3,70 V/20%, 3,60 V/10%, 3,50 V/5%, 3,30 V/0%). Isso preserva o comportamento implementado, mas não certifica a precisão da reserva real ou o tempo restante de uso. A mensagem `Carregando` continua vindo do pino do carregador e da presença USB, independente de exibir 100%; pode aparecer junto com 100%. Não alterar corrente de carga, proteção ou desligamento físico. Não usar o novo topo visual para inferir autonomia real de 100% a 0% ou comparar diretamente com ensaios antigos por percentual.

Suíte automatizada aprovada: 131 testes, zero falhas/skips/TODO. Inclui checagem numérica de igualdade entre os perfis em cada milivolt de 2,50 a 4,08 V, monotonicidade até 4,40 V, novos exemplos do topo e preservação do padrão/limiares. É simulação da tabela extraída e teste de contrato, não ensaio físico de bateria baixa. Compilação/gravação da nova variante e resultado físico serão acrescentados quando concluídos. Responsável confirmou novamente espera, silêncio e USB antes da gravação; USB identificado como COM8, serial `8BDE14575D4B412E`.

### Gravação e conferência do topo visual

Compilação aprovada: 335184 bytes de programa (41%), 70056 bytes globais (29%), mesmo core/FQBN/biblioteca e flags anteriores, acrescidas de `ESCOLTA_TESTE_BATERIA_TOPO_4100MV=1`. Pacote separado `.expo/battery-p5-r4-top410/xiao_escolta_ble.ino.zip`, SHA256 `584F2E453EB3B7FC943DB67AA2C4A9E7A1FCA59A88010C9A585BC76D76563158`. Retorno ADC40 anterior preservado com SHA256 `54B6EF9451082975CD22FC4A260010C0232D1D192BEEC335587E8E812B5B0201`, reconferido antes da gravação.

Gravação após confirmação de espera/USB concluída com `Device programmed` via DFU COM9, retorno COM8. Leitura passiva de 15 segundos em 14/10 às 21:50 (UTC−3) apresentou três registros com `display_top_v=4.10 pct=100`, tensão suavizada 4,1300–4,1302 V e `usb=1 charging=1`. Isso confirma a nova porcentagem no firmware em execução, preservando o indicador de carga. Não houve diagnóstico de rádio nessa janela; não inferir reconexão, potência/PHY runtime ou teste de alarmes. Conferência visual no app ainda depende do responsável. Captura em `dados/battery-top410-usb-2026-10-14.log`.

Conferência visual posterior: responsável informou “agora está aparecendo 100%”. A indicação nova foi aprovada por relato no aplicativo de teste. Término físico de carga, autonomia e validação dos avisos baixos durante descarga natural continuam separados e pendentes. Nenhuma nova alteração ou gravação nesta confirmação.

## Fontes primárias consultadas

Na investigação inicial, no teto de 4,13 V continuava aparecendo Carregando, e ainda não havia observação do texto USB conectado sozinho. Portanto, não foi relatado término de carga. Investigação adicional encontrou o circuito externo documentado (P2N2222A, 1 kΩ, 10 kΩ e 1N4007 em paralelo com o buzzer) e registro histórico no TCC/README de app 4,13 V versus multímetro 4,14 V. Não tratar a medição histórica como atual nem pressupor erro fixo de 70 mV. Análise por componente, efeito no consumo e limites da evidência em `hardware/ANALISE_ELETRICA_ESCOLTA_2026-10-14.md`. A alteração posterior de aquisição ADC e sua gravação estão documentadas acima, separadas dessa análise inicial.

- [Seeed: XIAO nRF52840, corrente, leitura de bateria e status P0.17](https://wiki.seeedstudio.com/XIAO_BLE/).
- [Seeed: esquema oficial com BQ25101, R16 1 MΩ e R17 510 kΩ, página 3](https://files.seeedstudio.com/wiki/XIAO-BLE/Seeed_Studio_XIAO_nRF52840_PDF.pdf). A revisão física exata da placa do responsável não foi identificada nesta etapa.
- [Nordic: nRF52840 Product Specification v1.8, SAADC, tabela de tempo de aquisição e resistência da fonte](https://docs-be.nordicsemi.com/bundle/nRF52840_PS_v1.8/raw/resource/enus/nRF52840_PS_v1.8.pdf).
- [TI: BQ25101, regulação, fases de carga e consumo em paralelo](https://www.ti.com/product/BQ25101).
