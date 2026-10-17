# Revisão experimental de proximidade — XIAO p1

Registro da revisão p1. A escala de distância foi posteriormente ajustada na
[revisão p2](REVISAO_DISTANCIA_P2.md), que mantém os limites e tempos abaixo.

## Escopo e fluxo conferido

Revisão do caminho ativo de RSSI e alertas, sem alterar a caixa, os documentos
acadêmicos, a autenticação ou o firmware legado do ESP32:

1. `App.tsx` mantém uma instância de `useEsp32Monitor` no shell autenticado.
2. `src/services/bleApi.ts` lê RSSI no celular a cada 500 ms, sem sobrepor
   operações pendentes, e escreve o valor na característica RSSI da placa.
3. `firmware/xiao_escolta_ble/` filtra o sinal e decide os estados. A estimativa
   em metros e o estado retornam no JSON BLE, normalmente a cada segundo.
4. `src/hooks/useEsp32Monitor.ts` recebe o estado, atualiza a Central e o histórico
   e aciona a emergência. Não recalibra o RSSI automaticamente ao conectar.
5. `src/services/backgroundSentinel.ts` e `modules/escolta-sentinela/` mantêm o
   serviço Android e o áudio crítico. A perda do vínculo tem tolerância de 5 s;
   o estado de emergência continua retido até confirmação humana.
6. `ProximityTrialModal` observa a telemetria sem substituir esses callbacks.
   `PatrolScreen.tsx` é uma tela anterior, não montada pelas abas atuais.

O código ESP32 preservado tem bipe de atenção com alternância de 600 ms e pânico
de 150 ms. A fonte XIAO salva antes desta revisão já tinha buzzer apenas em
pânico, enquanto o aplicativo ainda vibrava na transição ao amarelo. A descrição
física do usuário (bipe lento no amarelo) evidencia uma divergência a conferir,
não permite afirmar qual binário está gravado na XIAO. Não foi feita leitura da
memória nem gravação da placa durante esta revisão.

## Evidências usadas, sem misturar condições

Últimas coletas de 1, 3, 5 e 7 m tratadas como ensaios elevados conforme o
procedimento combinado. A elevação foi confirmada pelo usuário no ensaio de 1 m;
as notas exportadas não foram atualizadas e continuaram genéricas. Cada coleta
tem 30 instantâneos por notificação, não todas as leituras intermediárias.

| Distância real | Média estimada original | Faixa estimada original | RSSI bruto médio |
| --- | --- | --- | --- |
| 1 m | 0,86 m | 0,8–1,0 m | −69,33 dBm |
| 3 m | 3,17 m | 2,3–3,8 m | −83,20 dBm |
| 5 m | 3,35 m | 3,0–5,0 m | −83,93 dBm |
| 7 m | 6,36 m | 3,8–10,4 m | −90,87 dBm |

As coletas anteriores no chão permanecem como outra condição experimental.
Não se substituiu o resultado elevado de 5 m pelo resultado no chão, nem se
forçou a fórmula a passar por esse ponto. Os sinais de 3 e 5 m se sobrepõem.
As coletas de 5 e 7 m já tinham pânico na primeira amostra: não identificam o
primeiro instante de disparo, sua causa ou o que ocorreu nos 10 s de estabilização.

## Alterações implementadas

### Filtragem e decisão na XIAO

`ProximitySignal.h` aplica mediana móvel de cinco leituras válidas seguida de
EMA com alfa 0,30. Não limita artificialmente a distância nem transforma uma
conexão distante em referência de perto. Rejeita 0, −127 e mensagens malformadas.

| Condição | Entrada | Retorno | Confirmação após filtragem |
| --- | --- | --- | --- |
| Atenção | RSSI ≤ −78 dBm | RSSI > −73 dBm | 4 s contínuos para entrar; 2 s para retornar ao verde |
| Perigo | RSSI ≤ −86 dBm | RSSI > −82 dBm | 8 s contínuos para entrar; 2 s para o filtro sair da faixa de perigo |

O limite antigo de atenção, −70 dBm, era muito próximo do sinal observado a 1 m.
−78 dBm é um ajuste experimental inicial, não uma fronteira garantida em metros.
O limite de perigo não foi afastado para ocultar disparos. A confirmação agora
usa tempo decorrido e pelo menos três leituras, sem contar ciclos sem RSSI.
Lacunas superiores a 2,5 s reiniciam a janela e a confirmação, preservando o
estado já confirmado. Ausência de dados não é declarada como proximidade segura.

A janela precisa de cinco leituras antes de decidir; há atraso adicional pela
mediana e EMA. Assim, **8 s não é o tempo total garantido de detecção**: é a
persistência exigida depois que o sinal filtrado cruza o limite. Os tempos
precisam de validação física no uso representativo.

A escala em metros foi mantida: referência −71 dBm a 1 m e expoente 2,5.
Melhorar a estabilidade não garante melhorar o erro médio em toda situação.

### Saídas e identificação

- Atenção/amarelo mantém o comportamento informado pelo usuário: bipe lento
  na caixinha (alternância de 600 ms, respeitando `somHabilitado`) e vibração breve
  na transição ao amarelo no celular, conforme a preferência de vibração.
  A melhoria evita oscilações indevidas antes dessa decisão; não consiste
  simplesmente em silenciar os avisos. Não inicia sirene crítica no amarelo.
- Sinal de perigo confirmado continua acionando pânico, com som crítico.
- Botão físico mantém acionamento sustentado de 1,5 s, independente do filtro.
- Perda sustentada de conexão, reconexão e confirmação humana foram preservadas.
- Emergência não desaparece automaticamente quando o sinal melhora.
- A XIAO informa `fw: "xiao-p1"`; o app exibe essa identificação em
  Sistema → Diagnóstico e confiabilidade → Verificar prontidão.
  Placas antigas aparecem como versão não informada; não se inventa uma versão.
- O JSON continua limitado a 244 bytes. Não foram alterados os UUIDs GATT,
  bibliotecas ou código nativo Android.

## Verificação automatizada e limites

`tools/test-proximity-signal.cpp` contém 23 verificações C++14 avaliadas pelo
compilador sobre a implementação real: mediana, histerese, temporização, lacunas,
sentinelas, reset, overflow de relógio, saída do buzzer e replay das quatro coletas recentes.
O replay usa os horários e RSSI exportados, sem inventar dados a cada 500 ms;
é uma reprodução parcial, não validação em hardware ou teste independente.

No replay: 1 m permanece verde, 3/5 m terminam em atenção sem perigo e 7 m
ainda atinge perigo. Não se conclui que estes sejam limites reais universais.

`tools/test-monitor-alerts.cjs` verifica o hook real com áudio/BLE/React simulados:
vibração breve de atenção sem sirene, pânico imediato, retenção até confirmação, perda de vínculo,
espera e identificação de firmware. Os testes anteriores de coleta/BLE continuam.

Comandos locais:

```powershell
.\tools\test-proximity-signal.ps1
node --test tools/test-monitor-alerts.cjs tools/test-proximity-trial.cjs tools/test-proximity-ble.cjs
node node_modules/typescript/bin/tsc --noEmit
```

Resultado local da revisão: 23 verificações C++ e 15 testes JavaScript aprovados;
TypeScript sem erros; exportação Android/Hermes concluída. Firmware compilado
para `Seeeduino:mbed:xiaonRF52840Sense` com ArduinoBLE instalado: 332.184 bytes
de programa (40%) e 70.024 bytes de variáveis globais (29%). Esses resultados
confirmam compilação e testes simulados, não execução desta versão na placa.

## Aplicação no dispositivo

Atualizar JavaScript com `r` no terminal Expo aplica apenas a parte do aplicativo.
O novo filtro, os limites e a lógica de som da caixinha exigem compilar e
gravar `firmware/xiao_escolta_ble/xiao_escolta_ble.ino` pela USB, mantendo
`ProximitySignal.h` na mesma pasta. Selecionar XIAO nRF52840 Sense no core Seeed
mbed já usado pelo projeto; não usar o firmware do ESP32.

Após a gravação, confirmar `xiao-p1` na identificação recebida e fazer verificação
funcional breve, com adultos: perto sem disparo indevido, botão, confirmação de
segurança e perda de vínculo. Não é necessário repetir agora todas as coletas
para concluir a implementação; validação física da mudança continua pendente.

Esta revisão não torna o protótipo certificado nem substitui supervisão humana.
