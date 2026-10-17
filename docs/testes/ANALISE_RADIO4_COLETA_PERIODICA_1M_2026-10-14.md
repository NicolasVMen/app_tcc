# Radio4: nova coleta de 1 m e consultas periódicas

## Origem e separação do histórico

CSV original: `C:/Users/Nicolas Venciguerra/.codex/attachments/afecef7c-6bd5-44e9-b22a-6972d39c8246/Texto colado.txt`.
SHA256: `6A90ADC8951A699700DE2DBB25F366D48930D4773C679BC5356A9E4D2CB1BB46`.

São 202 linhas de amostras em oito ensaios. Os sete primeiros IDs já constavam da exportação anterior: quatro ensaios p5 e três radio4. O novo ensaio é somente `1792017373986-hr6ipq`, com 30 amostras, firmware `xiao-p5-r4`, modelo SM-S928B, Android 36, app 1.0.0. Não contar novamente o histórico como novas execuções.

O responsável relatou que manuseou o celular, recolocou os aparelhos parados e iniciou a coleta de 1 m. Após a coleta, informou ausência de bipes em todos os testes desta etapa. Esse relato não apaga o ensaio histórico p5 que registrou atenção. Condição textual e altura numérica estão vazias no novo CSV; o contexto de USB conectado e diagnóstico vem da preparação no chat, não desses campos.

## Nova coleta

Início UTC `2026-10-14T22:36:13.986Z`; amostras de `22:36:24.273Z` a `22:36:53.284Z`, ou 19:36:24–19:36:53 em America/Sao_Paulo. Resultado: concluído, distância real informada 1 m.

| Grandeza | Média | Mínimo–máximo |
| --- | --- | --- |
| RSSI do celular | -66,8333 dBm | -68 a -65 dBm |
| RSSI bruto informado pela placa | -67,0333 dBm | -68 a -65 dBm |
| RSSI filtrado informado pela placa | -66,9333 dBm | -68 a -65 dBm |
| Distância estimada | 0,89 m | 0,8 a 1,0 m |

Erro absoluto médio de 0,11 m apenas nesta coleta. Desvio-padrão populacional: celular 0,9339 dB, filtrado 0,6799 dB, estimativa 0,0396 m. As 30 linhas registram seguro e pânico falso. Há 30 IDs distintos (2038–2096), intervalos entre amostras de 957–1054 ms e idade da leitura do celular de 16–535 ms. Não há congelamento de identificadores ou lacuna grande dentro desta coleta.

O filtrado ficou pelo menos 14 dB acima do limiar de entrada amarelo (-82 dBm). A ausência de bipe é coerente com o estado exportado; não demonstra por si só que o alerta ainda será acionado no afastamento.

## Captura USB periódica concomitante

Leitor passivo delimitado a 300 s encerrado com código 0. O trecho preservado contém 51 consultas de controlador, de `22:35:11.7157992Z` a `22:39:21.6827981Z`, abrangendo toda a nova coleta. Uptime de 80395 a 330409 ms. Todas reportaram `tx_status=0`, `tx_dbm=4`, `phy_status=0`, `tx_phy=1`, `rx_phy=1`, `adv_status=0`, `adv_dbm=0`, no handle 0. Não houve evento de desconexão no trecho preservado. As consultas são espaçadas em aproximadamente 5 s, não uma medição contínua de RF.

Os marcadores `max_dbm=20` não representam capacidade física da XIAO: correspondem à constante genérica da biblioteca, já investigada por inspeção do binário. Não solicitar 20 dBm. A instrumentação consulta somente o estado e não reaplica potência.

As amostras RSSI esparsas da captura permaneceram em seguro, embora o sinal e os metros estimados tenham variado antes e depois do intervalo do CSV. Não atribuir cada variação a um instante exato de movimento: o momento do manuseio foi informado por mensagem, não sincronizado por marcador no dispositivo.

## Conclusão limitada e continuidade

1. Esta coleta foi mais estável e mais próxima do 1 m informado que as duas últimas coletas radio4 anteriores (médias estimadas de 1,90 e 1,67 m). Não é comparação controlada de bateria versus USB ou de ambiente.
2. A hipótese de queda tardia da potência configurada não apareceu nas 51 verificações desta conexão: o controlador continuou reportando +4 dBm e PHY LE 1M. Isso não mede potência irradiada externamente nem identifica a causa de toda variação de RSSI.
3. O resultado não autoriza recalibrar toda a curva com um único ponto, afirmar precisão de 11 cm em geral ou aprovar praia/shopping. A estimativa continua experimental e a variação entre coletas a 1 m permanece registrada.
4. Não houve alteração de código, limiares, filtros, fórmula, potência ou APK nesta análise. A captura foi encerrada e a porta liberada. M18 ganhou outra execução sem falso amarelo; M19 ainda exige verificar afastamento real e recuperação com radio4 antes de promoção ao oficial.

Próximo teste recomendado: manter a mesma configuração, afastar-se gradualmente até obter amarelo por sinal fraco, sem desligar a placa/Bluetooth, e retornar para verificar recuperação. Registrar distância aproximada, conexão e eventos; não desativar alarmes para coletar nem interpretar ausência de alerta a 1 m como validação de alcance.

## Retorno do teste de afastamento e recuperação

O responsável relatou início do bipe amarelo após 12 passos, manutenção da conexão BLE e, ao retornar, interrupção automática do bipe e retorno a protegido, sem confirmação manual de segurança. Transição amarelo/recuperação aprovada nesta execução por observação do responsável; sem captura RSSI/cronômetro desse percurso. Não confundir com validação de emergência vermelha ou perda do enlace.

Informou calçado 41 e comprimento aproximado do pé de 24,5 cm. Ainda não esclarecido se os 12 passos foram passos normais ou comprimentos de pé encostados em sequência. Não converter passos normais usando comprimento do pé. Apenas se forem 12 comprimentos contíguos de 24,5 cm, o percurso nominal será 2,94 m, ainda aproximado e dependente da medição e dos pontos de início/fim. Não registrar 2,94 m como distância real confirmada antes desse esclarecimento.

Esclarecimento recebido: “foi um colado no outro”. Registrar início do amarelo a aproximadamente 2,94 m (12 × 0,245 m) neste percurso, medido por comprimentos de pé, não por trena. A precisão do pé e as referências entre dispositivos não foram instrumentadas. Isso não estabelece raio fixo de 2,94 m nem uma calibração geral da estimativa BLE. Conexão mantida e recuperação automática ao retorno foram confirmadas pelo responsável.

## Revisão da escala e retorno do segundo roteiro

O responsável informou que o segundo roteiro (vermelho, retorno e confirmação) funcionou. Não detalhou se o vermelho ocorreu ainda conectado ou por perda de vínculo; não classificar a causa sem essa confirmação. Nenhum RSSI/distância/tempo foi exportado para esse percurso.

Esclarecimento posterior: “continuou conectado”. Registrar aprovação por observação do responsável do roteiro de vermelho com vínculo BLE mantido, retorno e confirmação, nesta execução radio4. Não classificar como alarme por desconexão. A distância real e o RSSI no instante do vermelho não foram registrados; este resultado funcional não calibra a escala métrica. A revisão da estimativa permanece pendente e separada dos alarmes.

Questionou indicação aproximada de 3,80 m em -83 dBm. Conferência no código: `ProximityDistance.h` mantém referência -68,44 dBm e expoente 2,65, derivados da campanha elevada antiga de 1/3/5/7 m. Fórmula: `10^((-68,44 - RSSI_filtrado) / 26,5)`. Para -83,0 dBm filtrados exatos: 3,543512 m (telemetria com uma casa: 3,5 m). Para -82: 3,248614 m; para -90: 6,510059 m. Não interpretar estes números como alcance físico dos estados. Firmware calcula com filtrado float e exporta RSSI arredondado inteiro; no ensaio também há leitura bruta do celular assíncrona. Sem pacote simultâneo, o par lembrado de 3,80/-83 não comprova erro de implementação.

A estimativa é calculada na placa, enviada em `distancia_m` e usada pelo hook sem recalcular no celular. Dashboard arredonda metros para inteiro; a tela de ensaio conserva maior detalhe. A mudança de potência para +4 dBm não alterou os coeficientes da escala anterior. Reavaliar a escala específica radio4 é pendência, mas não ajustar somente -83 para 2,94 m: esse RSSI não foi capturado de forma sincronizada no ponto medido por pés, e as coletas radio4 a 1 m tiveram filtrados médios muito diferentes. Preservar filtros/limiares/confirmacão durante a revisão da fórmula; não fazer parecer precisão por correção cosmética.

Nova observação do responsável: segurar com a mão esquerda, onde usa relógio, piora o sinal; com a direita, sem relógio, melhora. É observação relevante, não prova de interferência ativa do relógio. Mão, corpo, orientação e proximidade das antenas também diferem. Para isolar efeito associado ao relógio, comparar a mesma mão e orientação com/sem relógio; para separar emissão ativa de efeito físico, seriam necessários controles adicionais. Não declarar causa nem atribuir um ganho fixo sem comparação.

Fontes primárias sobre limites gerais (não causa individual): [Silicon Labs, variabilidade do RSSI por corpo, orientação, antena e reflexões](https://www.silabs.com/wireless/bluetooth/channel-sounding); [NIST, avaliação experimental de RSSI como aproximação de distância](https://www.nist.gov/publications/development-and-evaluation-bluetooth-low-energy-device-electronic-encounter-metrics). Nenhum parâmetro ou firmware foi alterado nesta revisão.

## Reaproveitamento da campanha anterior, sem nova coleta

O responsável questionou a repetição de medições. Reanalisado o conjunto preservado `dados/proximidade-elevada-2026-10-06.json`, 30 amostras em cada distância. A fórmula atual já foi derivada desses dados; não é um novo conjunto independente para validá-la. Não reescrever CSV histórico e não iniciar outra campanha por padrão.

| Distância real antiga | RSSI filtrado médio antigo | Média da fórmula atual sobre os filtrados antigos |
| --- | --- | --- |
| 1 m | -69,367 dBm | 1,086 m |
| 3 m | -83,433 dBm | 3,719 m |
| 5 m | -83,900 dBm | 3,860 m |
| 7 m | -90,567 dBm | 7,118 m |

Estes valores aplicam a fórmula diretamente aos filtrados originais; diferem do replay que também reaplica o filtro aos instantâneos brutos. Não misturar as duas análises. As médias de sinal de 3 e 5 m diferem somente 0,467 dB, com faixas sobrepostas. Reduzir a estimativa de -83 dBm para fazer coincidir com cerca de 3 m também reduziria os valores dos antigos 5 m, que já são subestimados. A revisão P2 já documentava melhora modesta e instabilidade fora da amostra, não correção completa.

Conclusão da revisão disponível: os dados antigos servem para diagnosticar a discrepância e comparar modelos sem repetir coleta; não justificam uma nova constante arbitrária nem garantem calibração da potência radio4. Conservar parâmetros atuais e transparência da estimativa enquanto não houver evidência de um modelo superior; não mascarar a limitação nem mudar os alertas funcionais. Os cinco testes de reprodução da escala foram executados e passaram nesta revisão.

## Funcionamento sem USB após o ajuste de rádio

Roteiro solicitado: retirar o USB com bateria carregada, manter dispositivos próximos usando normalmente o celular por 2 minutos, depois bloquear a tela por mais 1 minuto com proteção ativa. Responsável respondeu: “tudo normal, funcionou conforme esperado”. Registrar aprovação por relato para esse roteiro: conexão/proteção mantidas e ausência de alertas indevidos observada. Não houve CSV, captura RF/ADB ou cronômetro independente nessa execução. Como Serial estava fechado/USB retirado, não atribuir ao teste medição periódica da potência. Não extrapolar a ensaio de autonomia, precisão da carga, dez minutos de bloqueio ou validação de outros ambientes.
