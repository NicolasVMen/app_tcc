# K1 — candidato experimental de filtro e alertas

## Autorização e estado

Em 17/10 o responsável autorizou preparar/testar a proposta explicada no chat: substituir mediana+EMA por Kalman Q1/R4, amarelo -77 dBm, vermelho -85 dBm, confirmação de entrada 4 s. Depois confirmou Sentinela em espera/silenciosa e USB. A detecção inicial Arduino/Windows não encontrou nenhuma porta serial nem XIAO com serial conhecido; ADB também não encontrou celular. Nenhuma gravação foi tentada nessa condição. Responsável reconectou ambos, Arduino identificou XIAO serial `8BDE14575D4B412E` na COM8 e ADB identificou Samsung `RXCXA07DTXF` autorizado. Responsável fechou/abriu Escolta Teste sem `r` e confirmou novamente espera/silêncio antes de gravar.

**Compilação e gravação concluídas**; validação física de proximidade/alertas ainda pendente. Não considerar concluída por testes automatizados.

Não é promoção da oficial. Código padrão sem macro continua p2; p4/p5/D1 sem K1 conservam mediana5+EMA0,30 e limites anteriores. Ver análise favorável/desfavorável em `SIMULACAO_ALARMES_3_5M_2026-10-17.md`.

## Alteração isolada

- Opt-in `ESCOLTA_TESTE_KALMAN_K1=1`, com p4, confirmação p5, D1 e rádio solicitado +4. Valor inválido ou falta dos requisitos impede compilação. Tag exata `xiao-p5-r4-d1-k1` permite rastrear CSVs.
- Kalman escalar: primeiro valor inicializa sinal/P=4; leituras seguintes somam `Q * intervalo_ms/1000` à variância, ganho `P/(P+R)`, Q=1 dB²/s, R=4 dB². Substitui mediana/EMA somente nessa variante. Não empilhar filtros nem aplicar Q como se cada amostra de 500 ms durasse 1 s.
- Amarelo entra -77, sai somente acima de -72; vermelho entra -85, sai acima de -81 dBm. Confirmação contínua 4 s, retorno 2 s, mínimo de três leituras candidatas, aquecimento de cinco leituras, rejeição de RSSI inválido e reset de leituras/candidato em lacuna >2,5 s permanecem.
- Emergência continua retida fora do filtro até confirmação humana aceita pela placa; reconexão não apaga pânico. Standby silencioso, botão/perda BLE/buzzer/UUIDs mantidos.
- App passa a reconhecer somente a tag exata adicional e exige RSSI **cru e filtrado >-77** nessa tag para solicitar/aceitar confirmação; mantém -82 nas variantes antigas. Mantém dados recentes, monitor ativo, distância válida e ACK seguro/sem pânico. Isso é coerência com o perfil, não prova de presença física.
- Fórmula D1 e potência +4 preservadas. A distância numérica **pode mudar** porque o RSSI filtrado muda, embora os coeficientes não mudem. Bateria ADC40/topo4100 e seleção de carga 50 mA preservadas nas flags de compilação.
- Marcador USB `[SIGNAL_FILTER] profile=k1 q_per_s=1 r=4 yellow=-77 red=-85 hold_ms=4000` adicionado somente no K1. Nenhuma nova escrita periódica de potência.

## Reversão e compilação

Pacote anterior confirmado existente e íntegro em `.expo/distance-radio4-d1/xiao_escolta_ble.ino.zip`, SHA-256 `5C0FE4F16226242BF012FB89EA8C98BC49D433C83EB5534BD2480C352CEA3F28`. Não sobrescrever. App mantém reconhecimento D1 para retorno.

Saída K1 separada `.expo/proximity-radio4-d1-k1`. FQBN `Seeeduino:mbed:xiaonRF52840Sense`. Flags do D1 mantidas, mais K1:

```
-DESCOLTA_TESTE_PROXIMIDADE_4DB=1
-DESCOLTA_TESTE_CONFIRMACAO_PROXIMA=1
-DESCOLTA_TESTE_DIAGNOSTICO_RADIO=1
-DESCOLTA_TESTE_RADIO_TX_DBM=4
-DESCOLTA_TESTE_RADIO_DIAGNOSTICO_PERIODICO=1
-DESCOLTA_TESTE_BATERIA_AQUISICAO_40US=1
-DESCOLTA_TESTE_BATERIA_TOPO_4100MV=1
-DESCOLTA_TESTE_DISTANCIA_RADIO4=1
-DESCOLTA_TESTE_KALMAN_K1=1
```

A XIAO esperada tem serial `8BDE14575D4B412E`; não presumir que ainda seja COM8, não gravar em outra placa. Atualização JS de reconhecimento precisa ser carregada **em espera** antes de retomar com a tag K1. Preferir fechar/abrir uma vez; não pedir `r` em monitoramento ativo, devido à ocorrência BLE anterior após recarga.

## Checagens e validação física pendente

TypeScript aprovado. Suíte final com **169 testes aprovados**, zero falhas/skip/TODO, incluindo confirmação integrada K1 que recusa -78 e só encerra com ACK real perto. Compilador ARM aprovou os **20 asserts K1**, perfil legado, p3, p4, D1 e confirmação legada. Testes específicos K1 cobrem ganho em 500/1000 ms, sinal constante, duas quedas isoladas, atraso mínimo janela+4 s, RSSI inválido, lacunas, overflow, frescor/reset/reconexão, confirmação, fórmula D1 e buzzer. O teste do sinal forte -76 confirma explicitamente a limitação: **não deve inventar vermelho apenas porque se sabe a posteriori que aquela coleta era de 5 m**.

### Registro da gravação

Programa **335.312 bytes (41%)**, globais **70.056 bytes (29%)**. FQBN, flags K1, tag e marcador `[SIGNAL_FILTER]` conferidos no binário. Pacote `.expo/proximity-radio4-d1-k1/xiao_escolta_ble.ino.zip`, SHA-256 `6E20650F7400448FF776C135598C8F28AA1C072BE672D3E591C4117578659EE9`. Reversão D1 conferida novamente com hash original, sem sobrescrever.

Arduino upload pela COM8 entrou em DFU COM9 e terminou com `Activating new firmware`, `Device programmed`, retorno COM8. Não foi gravado ESP32 nem gerado/instalado APK ou promovida oficial.

Leitura passiva USB após gravação (18:25 UTC/15:25 local) recebeu duas linhas ADC40/topo4100, tensão suavizada 4,0260/4,0262 V, 85%, USB=1/carregando=0; não interpretar indicação como medição física da corrente de carga. Não foram capturados marcadores iniciais K1/D1 nem rádio nessa janela; não alegar que leitura de bateria valida firmware por tag, potência ou distância. Upload/inspeção binária confirmados; confirmação da tag na telemetria BLE e testes físicos permanecem pendentes. Leitor serial encerrado após 10 s, sem comandos.

Após gravação identificada e confirmada, conduzir em blocos no chat:

1. Em espera/silencioso após reabrir app, conferir nova tag. Retomar a 1 m real e observar um minuto, primeiros 30 s parado e depois manuseio normal leve do celular. Distância medida externamente; não ocultar alerta nem testar botão com fios soltos.
2. A 3 m, estacionar e aguardar 20–30 s: alvo amarelo com bipe lento. Voltar perto: alvo retorno automático sem apagar emergência retida que já tenha ocorrido.
3. A 4 m, observar: queremos evitar vermelho antecipado. A 5 m, alvo vermelho confirmado, mas **a última coleta permaneceu verde na simulação**. Registrar resultado real; não chamar de aprovado se não disparar. Não caminhar durante coleta estacionária nem inferir precisão geral por uma passagem.
4. Em emergência, voltar perto: deve continuar retida até ACK/confirmar segurança; testar tentativa distante recusada e recuperação sem perder BLE. Depois conferir minimizar/bloquear e retorno com leituras frescas. Não repetir toda a suíte antiga nem 1–10 m sem motivo.

## Observação sobre minimizar

Responsável relatou tela azul sincronizando/procurando breve ao retornar, enquanto placa aparentemente permanece piscando verde. Código `useEsp32Monitor.ts` no evento AppState ativo invalida distância antiga e aguarda nova leitura; chama conectar somente se `isBleConnected()` for falso. Dashboard mostra sincronizando quando conectado sem dado válido. Isso explica ressincronização visual possível, **não comprova ausência de queda real no relato**. Estado procurando/reconectando precisa de logs/observação separada. Não alterado esse fluxo nesta tarefa, nem tratada a questão como regressão confirmada do K1 (ainda não gravado).

## Retorno físico recebido após a gravação

- **1 m:** responsável relatou "foi tranquilo, permaneceu", aprovando o roteiro próximo. Sem CSV dessa execução.
- **3 m:** respondeu "sim, foi" ao alvo amarelo/bipe lento sem vermelho. Registrado como aprovação por relato, sem RSSI, metros exibidos ou tempo medidos.
- **4 m:** relatou emergência e oscilação/demora para estabilizar. **Reprovado para o alvo de permanecer amarelo abaixo de 5 m.** Atribuição causal à oscilação ainda é hipótese do responsável; faltam amostras/timing e confirmação de continuidade do vínculo para separar RSSI sustentado de perda BLE.
- **5 m:** ainda não executado nesta rodada física. Não aprovado por simulação ou por inferência dos outros pontos.

Código conferido após o relato: K1 já exige sinal filtrado <=-85 dBm por 4 s contínuos (e mínimo de três leituras candidatas), não apenas um pico bruto. Pânico permanece retido após a entrada mesmo se o sinal melhorar, por desenho deliberado. Perda BLE sustentada também pode gerar pânico por outra via. Não aumentar espera, alterar limite ou zerar emergência automaticamente sem identificar a causa do evento. Nenhum parâmetro nem firmware foi modificado neste retorno; estado do teste permanece reprovado em 4 m, não promover oficial.
