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

// ============================================================
//   PINOS
// ============================================================
const uint8_t PINO_BUZZER = D3;
const uint8_t PINO_BOTAO_EMERGENCIA = D1;
const uint8_t PINO_LEITURA_BATERIA = PIN_VBAT;  // índice 6 -> P0.31 / AIN7_BAT
const uint8_t PINO_CORRENTE_CARGA = 21;         // índice 21 -> P0.13 / HICHG
const uint8_t PINO_STATUS_CARGA = 22;           // índice 22 -> P0.17 / ~CHG

// Operacao normal: atenção é visual; o buzzer fica reservado ao pânico,
// à perda sustentada do vínculo e ao botão de emergência.
const bool SAIDAS_DE_ALARME_ATIVAS = true;

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
//   FILTRAGEM DE SINAL — EMA + histerese + debounce
// ============================================================
enum Estado { SEGURO, ATENCAO, PERIGO };
Estado estadoAtual = SEGURO;
Estado candidatoEstado = SEGURO;

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

const float EMA_ALFA = 0.30f;
const uint32_t INTERVALO_AMOSTRA = 500;
// Atenção é apenas informativa; perigo precisa permanecer estável por mais
// tempo para que uma oscilação comum do RSSI não dispare uma emergência.
const uint8_t DEBOUNCE_ATENCAO_AMOSTRAS = 8;  // aproximadamente 4 s
const uint8_t DEBOUNCE_PERIGO_AMOSTRAS = 16; // aproximadamente 8 s
const uint8_t DEBOUNCE_RETORNO_AMOSTRAS = 4; // aproximadamente 2 s
const uint8_t DEBOUNCE_DESCONEXAO_AMOSTRAS = 10;
const uint32_t INTERVALO_NOTIFY = 1000;

// Valores herdados do protótipo ESP32. Devem ser recalibrados com a
// XIAO e a carcaça finais antes de serem apresentados como resultado.
const int LIMIAR_ATENCAO_ENTRA = -70;
const int LIMIAR_ATENCAO_SAI = -66;
const int LIMIAR_PERIGO_ENTRA = -86;
const int LIMIAR_PERIGO_SAI = -82;
const int RSSI_REF_1M = -71;
const float N_PROPAGACAO = 2.5f;

float rssiFiltrado = -50.0f;
bool filtroIniciado = false;
int ultimoRssiCru = -50;
uint8_t contadorEstado = 0;
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
  // Curva aproximada de uma célula Li-Po em repouso. Sob carga, o valor pode
  // oscilar; por isso o aplicativo identifica o resultado como estimativa.
  const float tensoes[] = {3.30f, 3.50f, 3.60f, 3.70f, 3.75f, 3.79f, 3.83f, 3.87f, 3.92f, 3.98f, 4.08f, 4.20f};
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
}

// ============================================================
//   FUNÇÕES DE ESTADO
// ============================================================
float estimarDistancia(float rssi) {
  return pow(10.0f, (RSSI_REF_1M - rssi) / (10.0f * N_PROPAGACAO));
}

Estado proximoEstadoHisterese(Estado atual, float rssi) {
  switch (atual) {
    case SEGURO:
      if (rssi <= LIMIAR_PERIGO_ENTRA) return PERIGO;
      if (rssi <= LIMIAR_ATENCAO_ENTRA) return ATENCAO;
      return SEGURO;

    case ATENCAO:
      if (rssi <= LIMIAR_PERIGO_ENTRA) return PERIGO;
      if (rssi > LIMIAR_ATENCAO_SAI) return SEGURO;
      return ATENCAO;

    case PERIGO:
      if (rssi > LIMIAR_PERIGO_SAI) return ATENCAO;
      return PERIGO;
  }

  return atual;
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
  candidatoEstado = SEGURO;
  contadorEstado = 0;
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

  // Não cria uma leitura artificial enquanto o app ainda não enviou RSSI.
  if (!rssiAtualizado) return;
  rssiAtualizado = false;

  if (!filtroIniciado) {
    rssiFiltrado = (float)rssiCru;
    filtroIniciado = true;
  } else {
    rssiFiltrado = EMA_ALFA * (float)rssiCru
      + (1.0f - EMA_ALFA) * rssiFiltrado;
  }

  Estado alvo = proximoEstadoHisterese(estadoAtual, rssiFiltrado);
  if (alvo == estadoAtual) {
    contadorEstado = 0;
    return;
  }

  if (alvo == candidatoEstado) {
    contadorEstado++;
  } else {
    candidatoEstado = alvo;
    contadorEstado = 1;
  }

  uint8_t amostrasNecessarias = candidatoEstado == PERIGO
    ? DEBOUNCE_PERIGO_AMOSTRAS
    : candidatoEstado == ATENCAO
      ? DEBOUNCE_ATENCAO_AMOSTRAS
      : DEBOUNCE_RETORNO_AMOSTRAS;

  if (contadorEstado >= amostrasNecessarias) {
    estadoAtual = candidatoEstado;
    contadorEstado = 0;
    if (estadoAtual == PERIGO) {
      modoPanico = true;
      Serial.println("[ALARME] Distancia sustentada na faixa de perigo!");
    }
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

  // A faixa amarela não aciona o buzzer: RSSI varia naturalmente com posição,
  // corpo, móveis e interferência. O som fica reservado à emergência latched.
  if (!escoltaAtivada || !modoPanico) {
    digitalWrite(PINO_BUZZER, LOW);
    ligado = false;
    return;
  }

  const uint32_t periodo = 150;

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
  clienteConectado = true;
  contadorDesconectado = 0;
  filtroIniciado = false;
  rssiAtualizado = false;

  if (!pausaIntencional) {
    escoltaAtivada = true;
    Serial.println("[SISTEMA] MONITORAMENTO ARMADO!");
  }

  Serial.print("[BLE] Cliente conectado: ");
  Serial.println(central.address());
}

void aoDesconectar(BLEDevice central) {
  clienteConectado = false;
  rssiAtualizado = false;
  filtroIniciado = false;
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

  restaurarEstadoSeguro();
  Serial.println("[BLE] Emergencia confirmada pelo responsavel.");
}

void aoEscreverRssi(BLEDevice central, BLECharacteristic characteristic) {
  (void)central;
  (void)characteristic;

  String valor = rssiCharacteristic.value();
  valor.trim();
  long rssi = valor.toInt();
  if (rssi >= -127 && rssi <= 0) {
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
  json.reserve(210);
  json += "{\"rssi\":" + String(rssiMostrar);
  json += ",\"rssi_raw\":" + String(ultimoRssiCru);
  json += ",\"distancia_m\":" + String(distancia, 1);
  json += ",\"estado\":\"" + String(nomeEstado()) + "\"";
  json += ",\"som_on\":" + String((SAIDAS_DE_ALARME_ATIVAS && somHabilitado) ? "true" : "false");
  json += ",\"monitoramento_ativo\":" + String(escoltaAtivada ? "true" : "false");
  json += ",\"panico_ativo\":" + String(modoPanico ? "true" : "false");
  json += ",\"bateria_pct\":" + String(percentualBateria);
  json += ",\"bateria_v\":" + String(tensaoBateria, 2);
  json += ",\"carregando\":" + String(bateriaCarregando ? "true" : "false");
  json += ",\"usb_conectado\":" + String(usbConectado ? "true" : "false");
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
  atualizarLeituraBateria();

  Serial.begin(115200);
  uint32_t esperaSerial = millis();
  while (!Serial && millis() - esperaSerial < 3000) {
    delay(10);
  }

  Serial.println("\n========= ESCOLTA UNITAU — XIAO nRF52840 Sense =========");
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
