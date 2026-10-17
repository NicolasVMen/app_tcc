// ============================================================
//   ESCOLTA UNITAU — Firmware BLE para XIAO nRF52840 Sense
// ============================================================
//  Protótipo acadêmico funcional desenvolvido na UNITAU.
//
//  Mantém o mesmo contrato GATT do firmware do ESP32 para que o
//  aplicativo possa usar qualquer uma das placas sem alterações.
//
//  Placa no Arduino IDE:
//    Seeed XIAO nRF52840 Sense (Seeed nRF52 mbed-enabled Boards)
//
//  Biblioteca:
//    ArduinoBLE
//
//  Ligações previstas:
//    D3 -> resistor 1 kOhm -> base do 2N2222 (buzzer ativo)
//    D1 -> botão -> GND (INPUT_PULLUP)
// ============================================================

#include <ArduinoBLE.h>
#include <math.h>
#include <nrf.h>
#include "ProximitySignal.h"
#include "ProximityDistance.h"
#include "RadioDiagnostics.h"
#include "RadioPowerExperiment.h"
#include "CommunicationWatchdog.h"

#if defined(ESCOLTA_TESTE_WATCHDOG_RSSI)
#if ESCOLTA_TESTE_WATCHDOG_RSSI != 1 || !defined(ESCOLTA_TESTE_KALMAN_K2)
#error "Watchdog W1 requer opt-in explicito junto do perfil K2"
#endif
Comunicacao::Watchdog watchdogRssi;
#endif

// Experimento isolado: altera somente a aquisição do ADC, não o carregador.
#if defined(ESCOLTA_TESTE_BATERIA_AQUISICAO_40US)
#if ESCOLTA_TESTE_BATERIA_AQUISICAO_40US != 1 || !defined(ARDUINO_ARCH_MBED) || !defined(ESCOLTA_TESTE_CONFIRMACAO_PROXIMA) || !defined(ESCOLTA_TESTE_RADIO_TX_DBM)
#error "ADC 40 us requer opt-in explicito e o firmware de teste p5-r4 no core Mbed"
#endif
// Na descoberta de bibliotecas o Arduino omite temporariamente a API da variante.
#if !defined(ANALOG_CONFIG) && ARDUINO_LIBRARY_DISCOVERY_PHASE != 1
#error "A variante selecionada nao oferece analogAcquisitionTime"
#endif
static_assert(ESCOLTA_TESTE_RADIO_TX_DBM == 4, "Manter radio em +4 dBm neste ensaio de bateria");
#endif

#if defined(ESCOLTA_TESTE_BATERIA_TOPO_4100MV)
#if ESCOLTA_TESTE_BATERIA_TOPO_4100MV != 1 || !defined(ESCOLTA_TESTE_BATERIA_AQUISICAO_40US)
#error "Topo visual 4,10 V requer opt-in explicito na variante de bateria de teste"
#endif
#endif

// ============================================================
//   PINOS
// ============================================================
const uint8_t PINO_BUZZER = D3;
const uint8_t PINO_BOTAO_EMERGENCIA = D1;
const uint8_t PINO_LEITURA_BATERIA = PIN_VBAT;  // índice 6 -> P0.31 / AIN7_BAT
const uint8_t PINO_CORRENTE_CARGA = 21;         // índice 21 -> P0.13 / HICHG
const uint8_t PINO_STATUS_CARGA = 22;           // índice 22 -> P0.17 / ~CHG

// Atenção confirmada mantém bipe lento; pânico mantém o bipe rápido obrigatório.
const bool SAIDAS_DE_ALARME_ATIVAS = true;
#if defined(ESCOLTA_TESTE_CONFIRMACAO_PROXIMA)
#if defined(ESCOLTA_TESTE_KALMAN_K2)
static_assert(Proximidade::ATENCAO_ENTRA == -77 && Proximidade::PERIGO_ENTRA == -90
  && Proximidade::ATENCAO_MS == 4000 && Proximidade::PERIGO_MS == 4000,
  "Candidato K2 requer perfil experimental -77/-90/4s");
#if defined(ESCOLTA_TESTE_WATCHDOG_RSSI)
const char* VERSAO_FIRMWARE = "xiao-p5-r4-d1-k2-w1";
#else
const char* VERSAO_FIRMWARE = "xiao-p5-r4-d1-k2";
#endif
#elif defined(ESCOLTA_TESTE_KALMAN_K1)
static_assert(Proximidade::ATENCAO_ENTRA == -77 && Proximidade::PERIGO_ENTRA == -85
  && Proximidade::ATENCAO_MS == 4000 && Proximidade::PERIGO_MS == 4000,
  "Candidato K1 requer perfil experimental -77/-85/4s");
const char* VERSAO_FIRMWARE = "xiao-p5-r4-d1-k1";
#else
static_assert(Proximidade::ATENCAO_ENTRA == -82 && Proximidade::PERIGO_ENTRA == -90
  && Proximidade::ATENCAO_MS == 4000 && Proximidade::PERIGO_MS == 4000,
  "A confirmacao p5 requer o perfil de sinal p4");
#if defined(ESCOLTA_TESTE_RADIO_TX_DBM)
#if defined(ESCOLTA_TESTE_DISTANCIA_RADIO4)
const char* VERSAO_FIRMWARE = "xiao-p5-r4-d1";
#else
const char* VERSAO_FIRMWARE = "xiao-p5-r4";
#endif
#else
const char* VERSAO_FIRMWARE = "xiao-p5-teste";
#endif
#endif
#elif defined(ESCOLTA_TESTE_PROXIMIDADE_4DB)
const char* VERSAO_FIRMWARE = "xiao-p4-teste";
#elif defined(ESCOLTA_TESTE_PROXIMIDADE_6DB)
const char* VERSAO_FIRMWARE = "xiao-p3-teste";
#else
const char* VERSAO_FIRMWARE = "xiao-p2";
#endif

// ============================================================
//   UUIDs BLE — idênticos aos usados pelo aplicativo
// ============================================================
const char* SERVICE_UUID = "e5c1f4a0-1234-4b5c-9abc-def012345678";
const char* CHAR_STATUS_UUID = "e5c1f4a1-1234-4b5c-9abc-def012345678";
const char* CHAR_SOM_UUID = "e5c1f4a2-1234-4b5c-9abc-def012345678";
const char* CHAR_RESET_UUID = "e5c1f4a3-1234-4b5c-9abc-def012345678";
const char* CHAR_RSSI_UUID = "e5c1f4a4-1234-4b5c-9abc-def012345678";
const char* CHAR_CONTROLE_UUID = "e5c1f4a5-1234-4b5c-9abc-def012345678";
const char* NOME_DISPOSITIVO = "ESCOLTA_BLE";

// O JSON da XIAO não inclui GPS, pois esta placa não possui esse sensor.
// Mantê-lo abaixo de 244 bytes garante uma notificação BLE completa.
BLEService escoltaService(SERVICE_UUID);
BLEStringCharacteristic statusCharacteristic(
  CHAR_STATUS_UUID,
  BLERead | BLENotify,
  244
);
BLEStringCharacteristic somCharacteristic(
  CHAR_SOM_UUID,
  BLERead | BLEWrite,
  8
);
BLEStringCharacteristic resetCharacteristic(
  CHAR_RESET_UUID,
  BLEWrite,
  16
);
BLEStringCharacteristic rssiCharacteristic(
  CHAR_RSSI_UUID,
  BLEWrite,
  8
);
BLEStringCharacteristic controleCharacteristic(
  CHAR_CONTROLE_UUID,
  BLERead | BLEWrite,
  16
);

// ============================================================
//   ESTADO DO SISTEMA
// ============================================================
bool clienteConectado = false;
bool escoltaAtivada = false;
bool pausaIntencional = false;
bool modoPanico = false;
bool somHabilitado = true;
float tensaoBateria = 0.0f;
uint8_t percentualBateria = 0;
bool bateriaCarregando = false;
bool usbConectado = false;
bool leituraBateriaIniciada = false;

// ============================================================
//   FILTRAGEM DE SINAL — mediana/EMA ou K1 opt-in + histerese/tempo
// ============================================================
using Proximidade::Estado;
using Proximidade::SEGURO;
using Proximidade::ATENCAO;
using Proximidade::PERIGO;
Estado estadoAtual = SEGURO;
Proximidade::Monitor monitorProximidade;

// ============================================================
//   LED RGB INTERNO — LOW acende, HIGH apaga
// ============================================================
void definirLedRgb(bool vermelho, bool verde, bool azul) {
  digitalWrite(LED_RED, vermelho ? LOW : HIGH);
  digitalWrite(LED_GREEN, verde ? LOW : HIGH);
  digitalWrite(LED_BLUE, azul ? LOW : HIGH);
}

bool pulsoLedAtivo(uint32_t periodoMs, uint32_t duracaoMs) {
  return millis() % periodoMs < duracaoMs;
}

const uint32_t INTERVALO_AMOSTRA = 500;
// Os tempos de atenção/perigo contam leituras contínuas, não ticks sem RSSI.
// Política experimental e filtro estão em ProximitySignal.h.
const uint8_t DEBOUNCE_DESCONEXAO_AMOSTRAS = 10;
const uint32_t INTERVALO_NOTIFY = 1000;

// Escala experimental ajustada separadamente dos limites de alarme.
// Parâmetros e fórmula em ProximityDistance.h.

float rssiFiltrado = -50.0f;
bool filtroIniciado = false;
int ultimoRssiCru = -50;
uint8_t contadorDesconectado = 0;
int rssiRecebidoDoApp = -50;
bool rssiAtualizado = false;

// ============================================================
//   BOTÃO — debounce e acionamento sustentado não bloqueantes
// ============================================================
bool ultimaLeituraBotao = HIGH;
bool estadoEstavelBotao = HIGH;
uint32_t instanteMudancaBotao = 0;
uint32_t inicioPressionamentoBotao = 0;
bool pressionamentoBotaoValido = false;
bool acionamentoBotaoRegistrado = false;
const uint32_t DEBOUNCE_BOTAO_MS = 50;
const uint32_t TEMPO_ACIONAMENTO_BOTAO_MS = 1500;

// ============================================================
//   BATERIA — leitura interna da XIAO e estimativa por tensão
// ============================================================
uint8_t estimarPercentualBateria(float volts) {
  // Estimativa por tensão, não medição de capacidade ou de fim de carga.
#if defined(ESCOLTA_TESTE_BATERIA_TOPO_4100MV)
  // Convenção visual solicitada: 100% em 4,10 V; faixa até 90% inalterada.
  const float tensaoTopo = 4.10f;
#else
  const float tensaoTopo = 4.20f;
#endif
  const float tensoes[] = {3.30f, 3.50f, 3.60f, 3.70f, 3.75f, 3.79f, 3.83f, 3.87f, 3.92f, 3.98f, 4.08f, tensaoTopo};
  const uint8_t percentuais[] = {0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100};
  const size_t quantidade = sizeof(tensoes) / sizeof(tensoes[0]);

  if (volts <= tensoes[0]) return 0;
  if (volts >= tensoes[quantidade - 1]) return 100;

  for (size_t i = 1; i < quantidade; i++) {
    if (volts <= tensoes[i]) {
      float proporcao = (volts - tensoes[i - 1]) / (tensoes[i] - tensoes[i - 1]);
      float estimativa = percentuais[i - 1]
        + proporcao * (percentuais[i] - percentuais[i - 1]);
      return (uint8_t)round(estimativa);
    }
  }

  return 100;
}

void atualizarLeituraBateria() {
  // P0.14 em LOW habilita o divisor interno de leitura da bateria.
  digitalWrite(PIN_VBAT_ENABLE, LOW);
  delay(10);

  uint32_t soma = 0;
  const uint8_t amostras = 16;
  for (uint8_t i = 0; i < amostras; i++) {
    soma += analogRead(PINO_LEITURA_BATERIA);
    delayMicroseconds(250);
  }

  float mediaAdc = (float)soma / amostras;
  float tensaoAdc = mediaAdc * 2.4f / 4095.0f;
  // Divisor da placa: 1 MOhm no ramo superior e 510 kOhm no inferior.
  float novaTensao = tensaoAdc * (1510.0f / 510.0f);
  if (!leituraBateriaIniciada) {
    tensaoBateria = novaTensao;
    leituraBateriaIniciada = true;
  } else {
    // Suaviza pequenas oscilações do ADC e da carga instantânea do circuito.
    tensaoBateria = 0.20f * novaTensao + 0.80f * tensaoBateria;
  }

  uint8_t percentualCalculado = estimarPercentualBateria(tensaoBateria);
  // Passos de 5% representam melhor a precisão real de uma estimativa por tensão.
  percentualBateria = min(100, ((percentualCalculado + 2) / 5) * 5);

  usbConectado = (NRF_POWER->USBREGSTATUS & POWER_USBREGSTATUS_VBUSDETECT_Msk) != 0;
  bateriaCarregando = usbConectado && digitalRead(PINO_STATUS_CARGA) == LOW;
#if defined(ESCOLTA_TESTE_BATERIA_AQUISICAO_40US)
  // Apenas com monitor USB aberto; não altera o contrato BLE ou a estimativa.
  if (Serial) {
    Serial.print("[BATTERY_ADC] profile=p5-r4-adc40 requested_us=40 adc_mean=");
    Serial.print(mediaAdc, 2);
    Serial.print(" unfiltered_v=");
    Serial.print(novaTensao, 4);
    Serial.print(" filtered_v=");
    Serial.print(tensaoBateria, 4);
#if defined(ESCOLTA_TESTE_BATERIA_TOPO_4100MV)
    Serial.print(" display_top_v=4.10 pct=");
    Serial.print(percentualBateria);
#endif
    Serial.print(" usb=");
    Serial.print(usbConectado);
    Serial.print(" charging=");
    Serial.println(bateriaCarregando);
  }
#endif
}

// ============================================================
//   FUNÇÕES DE ESTADO
// ============================================================
float estimarDistancia(float rssi) {
  return Proximidade::estimarDistancia(rssi);
}

const char* nomeEstado() {
  if (modoPanico) return "panico";
  if (estadoAtual == SEGURO) return "seguro";
  if (estadoAtual == ATENCAO) return "atencao";
  return "perigo";
}

void restaurarEstadoSeguro() {
  modoPanico = false;
  estadoAtual = SEGURO;
  monitorProximidade.reset();
  contadorDesconectado = 0;
  filtroIniciado = false;
  rssiAtualizado = false;
  rssiFiltrado = -50.0f;
  ultimoRssiCru = -50;
  digitalWrite(PINO_BUZZER, LOW);
}

void aplicarModoEspera(bool emEspera) {
  pausaIntencional = emEspera;
  escoltaAtivada = !emEspera;
  restaurarEstadoSeguro();
#if defined(ESCOLTA_TESTE_WATCHDOG_RSSI)
  if (emEspera) watchdogRssi.desarmar();
  else watchdogRssi.armar(millis());
#endif
  controleCharacteristic.writeValue(emEspera ? "espera" : "ativo");

  Serial.println(emEspera
    ? "[SISTEMA] MODO EM ESPERA CONFIRMADO"
    : "[SISTEMA] PROTECAO RETOMADA");
}

void processarSinal(int rssiCru, bool conectado) {
  if (!escoltaAtivada) {
    contadorDesconectado = 0;
    return;
  }

  if (!conectado) {
    if (contadorDesconectado < DEBOUNCE_DESCONEXAO_AMOSTRAS) {
      contadorDesconectado++;
    }

    if (contadorDesconectado >= DEBOUNCE_DESCONEXAO_AMOSTRAS && !modoPanico) {
      modoPanico = true;
      estadoAtual = PERIGO;
      Serial.println("[ALARME] Vinculo BLE perdido de forma sustentada!");
    }
    return;
  }

  contadorDesconectado = 0;

#if defined(ESCOLTA_TESTE_WATCHDOG_RSSI)
  // Consumir primeiro a amostra que já chegou; não disparar no limite com dado novo.
  if (rssiAtualizado) watchdogRssi.recebeu(millis());
  if (watchdogRssi.expirou(millis()) && !modoPanico) {
    modoPanico = true;
    estadoAtual = PERIGO;
    Serial.println("[ALARME] Comunicacao sem RSSI valido por 8 s!");
  }
#endif
  // Não cria uma leitura artificial enquanto o app ainda não enviou RSSI.
  if (!rssiAtualizado) return;
  rssiAtualizado = false;

  if (!monitorProximidade.receber(rssiCru, millis())) return;
  rssiFiltrado = monitorProximidade.sinal();
  filtroIniciado = monitorProximidade.temLeitura();
  estadoAtual = monitorProximidade.estado();
  if (estadoAtual == PERIGO && !modoPanico) {
    modoPanico = true;
    Serial.println("[ALARME] Sinal fraco sustentado na faixa de perigo!");
  }
}

// ============================================================
//   BUZZER E BOTÃO
// ============================================================
void atualizarBuzzer() {
  static uint32_t ultimoPulso = 0;
  static bool ligado = false;

  if (!SAIDAS_DE_ALARME_ATIVAS) {
    digitalWrite(PINO_BUZZER, LOW);
    ligado = false;
    return;
  }

  const uint32_t periodo = Proximidade::periodoBuzzer(
    escoltaAtivada, modoPanico, somHabilitado, estadoAtual);
  if (periodo == 0) {
    digitalWrite(PINO_BUZZER, LOW);
    ligado = false;
    return;
  }

  if (millis() - ultimoPulso >= periodo) {
    ligado = !ligado;
    digitalWrite(PINO_BUZZER, ligado ? HIGH : LOW);
    ultimoPulso = millis();
  }
}

void atualizarLedStatus() {
  // Vermelho é reservado exclusivamente para emergência.
  if (modoPanico) {
    definirLedRgb(pulsoLedAtivo(300, 150), false, false);
    return;
  }

  // Espera intencional: lembrete azul muito discreto.
  if (pausaIntencional) {
    definirLedRgb(false, false, pulsoLedAtivo(5000, 100));
    return;
  }

  // Sem vínculo: pulso azul indica que o dispositivo está procurando.
  if (!clienteConectado) {
    definirLedRgb(false, false, pulsoLedAtivo(1500, 120));
    return;
  }

  // Amarelo (vermelho + verde) indica alcance reduzido.
  if (estadoAtual == ATENCAO) {
    bool ligado = pulsoLedAtivo(1000, 200);
    definirLedRgb(ligado, ligado, false);
    return;
  }

  // Protegido: pulso verde curto para economizar a bateria.
  definirLedRgb(false, pulsoLedAtivo(3000, 100), false);
}

void lerBotaoEmergencia() {
  bool leitura = digitalRead(PINO_BOTAO_EMERGENCIA);
  uint32_t agora = millis();

  if (leitura != ultimaLeituraBotao) {
    instanteMudancaBotao = agora;
    ultimaLeituraBotao = leitura;
  }

  if (agora - instanteMudancaBotao >= DEBOUNCE_BOTAO_MS
      && leitura != estadoEstavelBotao) {
    estadoEstavelBotao = leitura;

    if (estadoEstavelBotao == LOW) {
      inicioPressionamentoBotao = agora;
      pressionamentoBotaoValido = escoltaAtivada;
      acionamentoBotaoRegistrado = false;
    } else {
      if (pressionamentoBotaoValido
          && !acionamentoBotaoRegistrado
          && agora - inicioPressionamentoBotao < TEMPO_ACIONAMENTO_BOTAO_MS) {
        Serial.println("[BOTAO] Toque curto ignorado.");
      }

      inicioPressionamentoBotao = 0;
      pressionamentoBotaoValido = false;
      acionamentoBotaoRegistrado = false;
    }
  }

  // Se a proteção for pausada durante o pressionamento, exige que o
  // botão seja solto e pressionado novamente depois da retomada.
  if (!escoltaAtivada) {
    pressionamentoBotaoValido = false;
    return;
  }

  if (estadoEstavelBotao == LOW
      && pressionamentoBotaoValido
      && !acionamentoBotaoRegistrado
      && agora - inicioPressionamentoBotao >= TEMPO_ACIONAMENTO_BOTAO_MS) {
    acionamentoBotaoRegistrado = true;
    modoPanico = true;
    estadoAtual = PERIGO;
    Serial.println("[ALARME] Botao de emergencia mantido por 1,5 s!");
  }
}

// ============================================================
//   EVENTOS BLE
// ============================================================
void aoConectar(BLEDevice central) {
#if defined(ESCOLTA_TESTE_RADIO_TX_DBM)
  EnsaioPotencia::resetSession();
#endif
  clienteConectado = true;
  contadorDesconectado = 0;
  filtroIniciado = false;
  rssiAtualizado = false;
  monitorProximidade.resetLeituras();

  if (!pausaIntencional) {
    escoltaAtivada = true;
#if defined(ESCOLTA_TESTE_WATCHDOG_RSSI)
    watchdogRssi.armar(millis());
#endif
    Serial.println("[SISTEMA] MONITORAMENTO ARMADO!");
  }

  Serial.print("[BLE] Cliente conectado: ");
  Serial.println(central.address());
}

void aoDesconectar(BLEDevice central) {
#if defined(ESCOLTA_TESTE_WATCHDOG_RSSI)
  watchdogRssi.desarmar(); // a perda real continua usando o caminho de 5 s existente
#endif
#if defined(ESCOLTA_TESTE_RADIO_TX_DBM)
  EnsaioPotencia::resetSession();
#endif
  clienteConectado = false;
  rssiAtualizado = false;
  filtroIniciado = false;
  monitorProximidade.resetLeituras();
  contadorDesconectado = 0;

  Serial.print("[BLE] Cliente desconectado: ");
  Serial.println(central.address());
  Serial.println("[BLE] Advertising retomado automaticamente.");
}

void aoEscreverSom(BLEDevice central, BLECharacteristic characteristic) {
  (void)central;
  (void)characteristic;

  String valor = somCharacteristic.value();
  valor.trim();
  if (modoPanico) {
    somCharacteristic.writeValue(somHabilitado ? "1" : "0");
    Serial.println("[BLE] Alteracao do som negada: panico ativo.");
    return;
  }

  somHabilitado = valor == "1";
  somCharacteristic.writeValue(somHabilitado ? "1" : "0");
  Serial.println(somHabilitado ? "[BLE] Som ligado." : "[BLE] Som desligado.");
}

void aoEscreverReset(BLEDevice central, BLECharacteristic characteristic) {
  (void)central;
  (void)characteristic;

#if defined(ESCOLTA_TESTE_CONFIRMACAO_PROXIMA)
  if (!clienteConectado || !escoltaAtivada || ultimoRssiCru <= Proximidade::ATENCAO_ENTRA
      || !monitorProximidade.podeConfirmarSeguranca(millis())) {
    Serial.println("[BLE] Confirmacao recusada: aguardando sinal recente na faixa segura.");
    return;
  }
  // Encerra apenas a emergência retida. Não fabrica RSSI -50 nem limpa o filtro.
  modoPanico = false;
  estadoAtual = monitorProximidade.estado();
  contadorDesconectado = 0;
  digitalWrite(PINO_BUZZER, LOW);
#else
  restaurarEstadoSeguro();
#endif
  Serial.println("[BLE] Emergencia confirmada pelo responsavel.");
}

void aoEscreverRssi(BLEDevice central, BLECharacteristic characteristic) {
  (void)central;
  (void)characteristic;

  String valor = rssiCharacteristic.value();
  valor.trim();
  char* fim = nullptr;
  long rssi = strtol(valor.c_str(), &fim, 10);
  if (fim != valor.c_str() && *fim == '\0' && rssi >= -126 && rssi < 0) {
    rssiRecebidoDoApp = (int)rssi;
    ultimoRssiCru = rssiRecebidoDoApp;
    rssiAtualizado = true;
  }
}

void aoEscreverControle(BLEDevice central, BLECharacteristic characteristic) {
  (void)central;
  (void)characteristic;

  String comando = controleCharacteristic.value();
  comando.trim();
  comando.toLowerCase();

  if (comando == "pausar") {
    aplicarModoEspera(true);
  } else if (comando == "retomar") {
    aplicarModoEspera(false);
  } else {
    Serial.print("[BLE] Comando de controle invalido: ");
    Serial.println(comando);
  }
}

// ============================================================
//   TELEMETRIA
// ============================================================
void enviarStatus() {
  int rssiMostrar = (int)round(rssiFiltrado);
  float distancia = estimarDistancia(rssiFiltrado);

  String json;
  json.reserve(230);
  json += "{\"rssi\":" + String(rssiMostrar);
  json += ",\"rssi_raw\":" + String(ultimoRssiCru);
  json += ",\"distancia_m\":";
  json += monitorProximidade.leituraRecente(millis()) && isfinite(distancia)
    ? String(distancia, 1) : String("null");
  json += ",\"estado\":\"" + String(nomeEstado()) + "\"";
  json += ",\"som_on\":" + String((SAIDAS_DE_ALARME_ATIVAS && somHabilitado) ? "true" : "false");
  json += ",\"monitoramento_ativo\":" + String(escoltaAtivada ? "true" : "false");
  json += ",\"panico_ativo\":" + String(modoPanico ? "true" : "false");
  json += ",\"bateria_pct\":" + String(percentualBateria);
  json += ",\"bateria_v\":" + String(tensaoBateria, 2);
  json += ",\"carregando\":" + String(bateriaCarregando ? "true" : "false");
  json += ",\"usb_conectado\":" + String(usbConectado ? "true" : "false");
  json += ",\"fw\":\"" + String(VERSAO_FIRMWARE) + "\"";
  json += "}";

  if (json.length() > 244) {
    Serial.println("[ERRO] Status BLE excedeu 244 bytes.");
    return;
  }

  statusCharacteristic.writeValue(json);
  somCharacteristic.writeValue(somHabilitado ? "1" : "0");
}

// ============================================================
//   SETUP
// ============================================================
void setup() {
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  definirLedRgb(false, false, false);

  pinMode(PINO_BUZZER, OUTPUT);
  digitalWrite(PINO_BUZZER, LOW);
  pinMode(PINO_BOTAO_EMERGENCIA, INPUT_PULLUP);

  // A XIAO permite selecionar 50 mA ou 100 mA para o carregamento.
  // Entrada em alta impedância seleciona cerca de 50 mA, escolha conservadora
  // para a bateria de 180 mAh. LOW selecionaria cerca de 100 mA.
  pinMode(PINO_CORRENTE_CARGA, INPUT);

  // Habilita com segurança o divisor interno que leva a bateria ao ADC.
  pinMode(PIN_VBAT_ENABLE, OUTPUT);
  digitalWrite(PIN_VBAT_ENABLE, LOW);
  pinMode(PINO_LEITURA_BATERIA, INPUT);
  // A saída ~CHG do carregador é open-drain. O pull-up evita leitura falsa
  // de "carregando" quando o USB está desconectado.
  pinMode(PINO_STATUS_CARGA, INPUT_PULLUP);
  analogReadResolution(12);
  analogReference(AR_INTERNAL2V4);
#if defined(ESCOLTA_TESTE_BATERIA_AQUISICAO_40US)
  // O divisor de alta impedância precisa de tempo para carregar o ADC.
  analogAcquisitionTime(AT_40_US);
#endif
  atualizarLeituraBateria();

  Serial.begin(115200);
  uint32_t esperaSerial = millis();
  while (!Serial && millis() - esperaSerial < 3000) {
    delay(10);
  }

  Serial.println("\n========= ESCOLTA UNITAU — XIAO nRF52840 Sense =========");
  Serial.print("[FIRMWARE] ");
  Serial.println(VERSAO_FIRMWARE);
#if defined(ESCOLTA_TESTE_KALMAN_K2)
  Serial.println("[SIGNAL_FILTER] profile=k2 q_per_s=1 r=4 yellow=-77 red=-90 hold_ms=4000");
#elif defined(ESCOLTA_TESTE_KALMAN_K1)
  Serial.println("[SIGNAL_FILTER] profile=k1 q_per_s=1 r=4 yellow=-77 red=-85 hold_ms=4000");
#endif
#if defined(ESCOLTA_TESTE_DISTANCIA_RADIO4)
  Serial.print("[DISTANCE_CAL] profile=radio4-d1 ref_1m=");
  Serial.print(Proximidade::RSSI_REF_1M, 6);
  Serial.print(" n=");
  Serial.println(Proximidade::N_PROPAGACAO, 6);
#endif
  Serial.println("[BATERIA] Corrente de carregamento configurada em 50 mA.");

  if (!BLE.begin()) {
    Serial.println("[ERRO] Nao foi possivel iniciar o Bluetooth.");
    while (true) {
      digitalWrite(PINO_BUZZER, LOW);
      delay(1000);
    }
  }

  BLE.setLocalName(NOME_DISPOSITIVO);
  BLE.setDeviceName(NOME_DISPOSITIVO);
  BLE.setAdvertisedService(escoltaService);

  escoltaService.addCharacteristic(statusCharacteristic);
  escoltaService.addCharacteristic(somCharacteristic);
  escoltaService.addCharacteristic(resetCharacteristic);
  escoltaService.addCharacteristic(rssiCharacteristic);
  escoltaService.addCharacteristic(controleCharacteristic);
  BLE.addService(escoltaService);

  somCharacteristic.writeValue("1");
  controleCharacteristic.writeValue("ativo");
  enviarStatus();

  somCharacteristic.setEventHandler(BLEWritten, aoEscreverSom);
  resetCharacteristic.setEventHandler(BLEWritten, aoEscreverReset);
  rssiCharacteristic.setEventHandler(BLEWritten, aoEscreverRssi);
  controleCharacteristic.setEventHandler(BLEWritten, aoEscreverControle);
  BLE.setEventHandler(BLEConnected, aoConectar);
  BLE.setEventHandler(BLEDisconnected, aoDesconectar);

  BLE.advertise();
  Serial.println("[BLE] Nome: ESCOLTA_BLE");
  Serial.println("[BLE] Aguardando conexao do aplicativo...");
}

// ============================================================
//   LOOP PRINCIPAL
// ============================================================
void loop() {
  BLE.poll();
  lerBotaoEmergencia();
#if defined(ESCOLTA_TESTE_RADIO_TX_DBM)
  EnsaioPotencia::poll(clienteConectado);
#endif
#if defined(ESCOLTA_TESTE_DIAGNOSTICO_RADIO)
  DiagnosticoRadio::poll(clienteConectado);
#endif

  static uint32_t ultimaAmostra = 0;
  if (millis() - ultimaAmostra >= INTERVALO_AMOSTRA) {
    ultimaAmostra = millis();
    processarSinal(rssiRecebidoDoApp, clienteConectado);

    if (clienteConectado && filtroIniciado) {
      Serial.print("RSSI App: ");
      Serial.print(ultimoRssiCru);
      Serial.print(" | Filt: ");
      Serial.print(rssiFiltrado, 1);
      Serial.print(" dBm | ~");
      Serial.print(estimarDistancia(rssiFiltrado), 1);
      Serial.print(" m | ");
      Serial.println(nomeEstado());
    }
  }

  static uint32_t ultimoNotify = 0;
  if (clienteConectado && millis() - ultimoNotify >= INTERVALO_NOTIFY) {
    ultimoNotify = millis();
    enviarStatus();
  }

  static uint32_t ultimaLeituraBateria = 0;
  if (millis() - ultimaLeituraBateria >= 5000) {
    ultimaLeituraBateria = millis();
    atualizarLeituraBateria();
  }

  atualizarBuzzer();
  atualizarLedStatus();
}
