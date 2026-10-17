# Escolta UNITAU — mapa da infraestrutura

Revisão do código local em 07/10/2026. Este mapa descreve o que existe,
não uma arquitetura futura ou certificada.

## Visão geral

```text
XIAO / firmware atual                     Celular Android
  botão D1, buzzer D3, RGB, ADC  <--GATT--> bleApi.ts
  filtros e decisão de estado              | RSSI lido no celular e enviado à XIAO
  distância experimental p2                v
                                      useEsp32Monitor.ts
                                       |      |      |
                                  telas   registros  backgroundSentinel.ts
                                                    |
                                      módulo Expo Kotlin -> serviço Android
                                      notificação, timer e sirene nativa

App -> Firebase Authentication (acesso à conta)
App -> EmailJS (opcional, experimental)
App -> localização do próprio celular (opcional, não GPS da criança)
```

Não existe backend próprio nem servidor HTTP que calcule a distância. O Metro
serve JavaScript durante o desenvolvimento. Um build standalone incorpora
esse bundle; login/e-mail continuam dependendo de serviços externos.
Referência: [modos de desenvolvimento e produção do Expo](https://docs.expo.dev/workflow/development-mode/).

## Responsabilidades por camada

| Camada | Fonte principal | Responsabilidade / limite |
|---|---|---|
| Entrada | `App.tsx` | Autenticação e navegação; uma instância do hook entre abas |
| Estado | `src/hooks/useEsp32Monitor.ts` | Pausa, retomar, reconectar, alertas, bateria e histórico |
| Rádio | `src/services/bleApi.ts` | Scan, GATT, RSSI, comandos e observadores; procura por nome |
| Alarme Android | `modules/escolta-sentinela` | Foreground service e áudio nativo, comandados pelo JS |
| Notificações | `notificationService.ts` | Canais/permissões/avisos locais Expo |
| Acesso | `firebaseConfig.ts`, `AuthScreen.tsx` | Firebase Auth; não autoriza o enlace BLE |
| Dados locais | AsyncStorage | Perfil, preferências, intenção, eventos e ensaios; hoje sem UID nas chaves |
| Coleta | `ProximityTrialModal.tsx`, `proximityTrial.ts` | Distância real informada com trena, 10 s de estabilização, 30 amostras |
| Firmware atual | `firmware/xiao_escolta_ble` | Arduino/C++, ArduinoBLE, mediana/EMA/histerese/tempo |
| Firmware legado | `firmware/esp32_escolta_ble` | ESP32 com limiares antigos; não é a implementação atual |
| Caixa | `hardware/case_3d/escolta_case_v2.scad` | Geometria paramétrica; eletrônicas coloridas são ilustrações |
| Acadêmico | `docs/tcc`, `docs/cicted`, `CICTED` | Entregas diferentes, independentes da execução do app |

O nome `useEsp32Monitor` e os tipos `Esp32Status` são históricos. Hoje eles
também atendem a XIAO. Renomeá-los não resolve um defeito funcional; foi
evitado nesta auditoria para não criar mudanças desnecessárias.

## Fluxo de sinal e comandos

1. O app procura `ESCOLTA_BLE`, conecta, solicita MTU e descobre serviços.
2. A cada 500 ms tenta ler RSSI no celular e escrevê-lo na característica RSSI.
3. A XIAO processa somente novas leituras recebidas; calcula filtro, estado e estimativa.
4. A cada 1 s envia JSON com RSSI, estado, bateria, distância e identificação `xiao-p2`.
5. O hook interpreta a telemetria e comanda tela, vibração, serviço Android e registros.
6. Pausar/retomar exige confirmação por telemetria; reset de alarme hoje espera
   apenas a escrita GATT, não uma confirmação explícita da aplicação remota.

UUID do serviço: `e5c1f4a0-1234-4b5c-9abc-def012345678`.
Características com prefixo `e5c1f4a`: `1` status, `2` som, `3` reset,
`4` RSSI, `5` controle. Firmware e aplicativo usam os mesmos UUIDs.

## Regras atuais da XIAO p2

| Situação | Regra no código |
|---|---|
| Filtro | Mediana de 5 + EMA 0,30; aguarda janela inicial |
| Atenção | RSSI filtrado ≤ −78 dBm sustentado por 4 s |
| Volta da atenção | RSSI > −73 dBm por 2 s |
| Perigo | RSSI ≤ −86 dBm por 8 s; pânico fica retido |
| Histerese de perigo | Retorno de nível interno acima de −82 dBm por 2 s; não limpa pânico retido |
| Lacuna de RSSI | Mais de 2,5 s reinicia leituras/candidato; estado anterior é preservado |
| Distância | `10^((-68,44 - RSSI)/(10 × 2,65))`, experimental |
| Atenção sonora | Alternância do buzzer a cada 600 ms, se som habilitado |
| Pânico sonoro | Alternância a cada 150 ms; não depende do mute informativo |
| Botão | Debounce de 50 ms e pressão sustentada de 1,5 s |
| Perda BLE | XIAO: 10 ticks de 500 ms; app: tolerância de 5 s |
| Espera | Desarma alertas e exige retomada; sem equivalência a proteção ativa |

Os tempos de sinal começam após estabilização/filtro/candidatura; não são
cronômetros exatos contados desde um metro de afastamento. Não existe limite
garantido de distância real. RSSI não é trena.

## Persistência e infraestrutura externa

- Firebase Authentication: conta e sessão; nenhuma base Firestore é usada no fluxo ativo lido.
- AsyncStorage: `@escolta_user_profile`, `@escolta_alerts_history`,
  `@escolta_preferences_v2`, `@escolta_monitoring_intent`, `@escolta_proximity_trials_v1`.
- EmailJS: envio direto do app; identificadores públicos extraíveis, sem backend autenticado.
- Localização: permissões e posição do celular responsável; não determina onde a criança está.
- Serviço Android: mantém notificação e áudio/timer nativos, mas **não possui leitor GATT próprio**.
  `START_STICKY` não restaura sozinho os estados guardados apenas em memória.
  Ver [ciclo de vida de Service](https://developer.android.com/reference/android/app/Service).

## Compilação e arquivos gerados

- `src`, `App.tsx`, `modules`, firmware e `.scad`: fontes que precisam ser preservadas.
- `android/` e `ios/`: ignorados pelo Git, configuração nativa gerada pelo Expo.
  Mudanças permanentes customizadas devem morar em módulo/plugin, não só em `android/`.
- `.expo`, `node_modules`, `local_tools`, caches Gradle/Arduino: execução/dependências locais.
- `eas.json`: development client, preview APK interno e production. Nenhum APK
  foi gerado, enviado, instalado ou aprovado nesta auditoria.
- `android/app/build.gradle` local usa assinatura debug inclusive na seção release
  gerada; isso não prova qual credencial um build EAS futuro utilizará.

O módulo nativo foi descoberto corretamente pelo autolinking. A compilação
Kotlin ficou não confirmada devido à falha de loopback do ambiente Gradle.
Não confundir sucesso de TypeScript/Hermes com sucesso do APK nativo.

Inventário detalhado: [catálogo](CATALOGO_ARQUIVOS.md).
Pendências: [relatório](RELATORIO_2026-10-07.md).
