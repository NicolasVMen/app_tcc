// ============================================================
//   ESCOLTA UNITAU — Firmware BLE (Bluetooth Low Energy)
// ============================================================
//  Migrado de Wi-Fi HTTP para BLE GATT Server.
//  Toda a logica de filtragem (EMA, histerese, debounce) do Dedini
//  foi PRESERVADA. So a camada de comunicacao mudou.
//
//  O celular agora conecta via Bluetooth, NAO precisa mais se
//  desconectar do Wi-Fi da casa. Internet funciona normalmente.
//
//  Placa: ESP32 DevKit V1 (funciona em qualquer ESP32 com BLE)
// ============================================================

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>
#include <math.h>

// ============================================================
//   GPS (EVOLUCAO FUTURA - ja deixado preparado)
// ============================================================
// Para ativar a localizacao absoluta no futuro:
//   1) Mude USAR_GPS para 1
//   2) Ligue um modulo NEO-6M:  GPS_TX -> GPIO16 (RX2) | GPS_RX -> GPIO17 (TX2)
//      VCC -> 3.3V | GND -> GND
//   3) Instale a biblioteca "TinyGPSPlus" (Gerenciador de Bibliotecas)
#define USAR_GPS 0
#if USAR_GPS
  #include <TinyGPSPlus.h>
  #include <HardwareSerial.h>
  TinyGPSPlus gps;
  HardwareSerial GPSSerial(2);
  #define GPS_RX 16
  #define GPS_TX 17
  #define GPS_BAUD 9600
#endif
bool   gpsFix = false;
double gpsLat = 0.0, gpsLng = 0.0;

// ============================================================
//   PINOS
// ============================================================
#define PINO_BUZZER 13
#define LED_INTERNO 2

// ============================================================
//   UUIDs BLE (gerados exclusivamente para o Escolta UNITAU)
// ============================================================
// Servico principal
#define SERVICE_UUID              "e5c1f4a0-1234-4b5c-9abc-def012345678"
// Characteristics
#define CHAR_STATUS_UUID          "e5c1f4a1-1234-4b5c-9abc-def012345678"  // Notify - JSON com status completo
#define CHAR_SOM_UUID             "e5c1f4a2-1234-4b5c-9abc-def012345678"  // Read/Write - "1" ou "0"
#define CHAR_RESET_UUID           "e5c1f4a3-1234-4b5c-9abc-def012345678"  // Write - qualquer valor reseta panico
#define CHAR_NOME_DISPOSITIVO     "ESCOLTA_BLE"

// ============================================================
//   VARIAVEIS BLE
// ============================================================
BLEServer*         pServer = NULL;
BLECharacteristic* pStatusChar = NULL;
BLECharacteristic* pSomChar = NULL;
BLECharacteristic* pResetChar = NULL;
bool clienteConectado = false;
bool clienteAnterior  = false;

Preferences prefs;

// ============================================================
//   VARIAVEIS DO SISTEMA
// ============================================================
bool escoltaAtivada = false;
bool modoPanico = false;
bool somHabilitado = true;

// ============================================================
//   FILTRAGEM DE SINAL  (EMA + Histerese + Debounce)
// ============================================================
// O RSSI cru do BLE e MUITO ruidoso: um corpo na frente, uma parede
// ou um reflexo faz o valor "pular" 10-20 dBm de uma leitura pra outra.
// Reagir a uma unica leitura gera alarmes falsos o tempo todo.
//
// A placa faz 3 coisas, em camadas:
//   1) EMA       -> media exponencial que suaviza o ruido instantaneo
//   2) HISTERESE -> o limiar pra ENTRAR num estado e diferente do de SAIR,
//                   evitando "tremular" entre seguro/atencao na fronteira
//   3) DEBOUNCE  -> so muda de estado depois de N leituras seguidas
//                   concordando (a tendencia precisa ser real, nao um pico)

enum Estado { SEGURO, ATENCAO, PERIGO };
Estado estadoAtual = SEGURO;
Estado candidatoEstado = SEGURO;

// --- Parametros ajustaveis (mexa aqui pra calibrar) ---
const float    EMA_ALFA          = 0.30f;  // 0 = lento/estavel, 1 = rapido/ruidoso
const uint32_t INTERVALO_AMOSTRA = 250;    // ms entre leituras de RSSI
const uint8_t  DEBOUNCE_AMOSTRAS = 6;      // ~1,5s de tendencia p/ trocar estado
const uint32_t INTERVALO_NOTIFY  = 1000;   // ms entre envios BLE (1 segundo)

// Limiares COM HISTERESE (dBm, aplicados sobre o sinal JA FILTRADO)
const int LIMIAR_ATENCAO_ENTRA = -70;  // seguro  -> atencao
const int LIMIAR_ATENCAO_SAI   = -65;  // atencao -> seguro
const int LIMIAR_PERIGO_ENTRA  = -82;  // atencao -> perigo
const int LIMIAR_PERIGO_SAI    = -78;  // perigo  -> atencao

// Modelo log-distance pra ESTIMAR a metragem (calibravel)
// NOTA: pro BLE, o RSSI a 1m geralmente e menor que Wi-Fi
const int   RSSI_REF_1M  = -59;   // RSSI BLE medido a 1 metro (tipico BLE)
const float N_PROPAGACAO = 2.5f;   // 2.0 = campo livre | 2.5-3.5 = ambiente interno

float   rssiFiltrado = -50.0f;
bool    filtroIniciado = false;
int8_t  ultimoRssiCru = -100;
uint8_t contadorEstado = 0;
uint8_t contadorDesconectado = 0;

// ============================================================
//   FUNCOES DE FILTRAGEM (identicas ao firmware Wi-Fi)
// ============================================================

float estimarDistancia(float rssi) {
  return pow(10.0f, (RSSI_REF_1M - rssi) / (10.0f * N_PROPAGACAO));
}

Estado proximoEstadoHisterese(Estado atual, float r) {
  switch (atual) {
    case SEGURO:
      if (r <= LIMIAR_PERIGO_ENTRA)  return PERIGO;
      if (r <= LIMIAR_ATENCAO_ENTRA) return ATENCAO;
      return SEGURO;
    case ATENCAO:
      if (r <= LIMIAR_PERIGO_ENTRA)  return PERIGO;
      if (r >  LIMIAR_ATENCAO_SAI)   return SEGURO;
      return ATENCAO;
    case PERIGO:
      if (r >  LIMIAR_PERIGO_SAI)    return ATENCAO;
      return PERIGO;
  }
  return atual;
}

void processarSinal(int8_t rssiCru, bool conectado) {
  // ---- Desconexao SUSTENTADA vira panico ----
  if (!conectado) {
    contadorDesconectado++;
    if (escoltaAtivada && contadorDesconectado >= DEBOUNCE_AMOSTRAS && !modoPanico) {
      Serial.println("[ALARME] Dispositivo desconectado (sustentado)!");
      modoPanico = true;
      estadoAtual = PERIGO;
    }
    return;
  }
  contadorDesconectado = 0;

  if (!escoltaAtivada) {
    escoltaAtivada = true;
    Serial.println("\n[SISTEMA] MONITORAMENTO ARMADO!");
  }

  // ---- 1) Filtro EMA: suaviza o ruido do RSSI ----
  if (!filtroIniciado) { rssiFiltrado = (float)rssiCru; filtroIniciado = true; }
  else rssiFiltrado = EMA_ALFA * (float)rssiCru + (1.0f - EMA_ALFA) * rssiFiltrado;

  // ---- 2) Estado-alvo com histerese ----
  Estado alvo = proximoEstadoHisterese(estadoAtual, rssiFiltrado);

  // ---- 3) Debounce: so comita apos N amostras seguidas concordando ----
  if (alvo == estadoAtual) {
    contadorEstado = 0;
  } else {
    if (alvo == candidatoEstado) contadorEstado++;
    else { candidatoEstado = alvo; contadorEstado = 1; }

    if (contadorEstado >= DEBOUNCE_AMOSTRAS) {
      estadoAtual = candidatoEstado;
      contadorEstado = 0;
      if (estadoAtual == PERIGO) {
        modoPanico = true;
        Serial.println("[ALARME] PERIGO sustentado -> PANICO!");
      }
    }
  }
}

const char* nomeEstado() {
  if (modoPanico) return "panico";
  if (estadoAtual == SEGURO)  return "seguro";
  if (estadoAtual == ATENCAO) return "atencao";
  return "perigo";
}

// ============================================================
//   BUZZER NAO-BLOQUEANTE (identico ao firmware Wi-Fi)
// ============================================================
void atualizarBuzzer() {
  static unsigned long ultimo = 0;
  static bool ligado = false;

  if (!somHabilitado) { digitalWrite(PINO_BUZZER, LOW); ligado = false; return; }

  int periodo;
  if (modoPanico)                  periodo = 150;  // panico: bip rapido
  else if (estadoAtual == ATENCAO) periodo = 600;  // atencao: bip lento
  else { digitalWrite(PINO_BUZZER, LOW); ligado = false; return; }

  if (millis() - ultimo >= (unsigned long)periodo) {
    ligado = !ligado;
    digitalWrite(PINO_BUZZER, ligado ? HIGH : LOW);
    ultimo = millis();
  }
}

// ============================================================
//   GPS (leitura, se habilitado)
// ============================================================
#if USAR_GPS
void lerGPS() {
  while (GPSSerial.available() > 0) {
    if (gps.encode(GPSSerial.read()) && gps.location.isValid()) {
      gpsFix = true;
      gpsLat = gps.location.lat();
      gpsLng = gps.location.lng();
    }
  }
}
#endif

// ============================================================
//   CALLBACKS BLE
// ============================================================
class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    clienteConectado = true;
    Serial.println("[BLE] Cliente conectado!");
  }
  void onDisconnect(BLEServer* pServer) {
    clienteConectado = false;
    Serial.println("[BLE] Cliente desconectado. Reiniciando advertising...");
    // Reinicia advertising para permitir reconexao
    delay(500);
    pServer->startAdvertising();
  }
};

// Callback para quando o app ESCREVE na characteristic de SOM
class SomCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) {
    String valor = pChar->getValue().c_str();
    if (modoPanico) {
      Serial.println("[BLE] Toggle som NEGADO: panico ativo!");
      return;
    }
    somHabilitado = (valor == "1");
    Serial.print("[BLE] Som alterado para: ");
    Serial.println(somHabilitado ? "ON" : "OFF");
  }
};

// Callback para quando o app ESCREVE na characteristic de RESET
class ResetCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) {
    modoPanico = false;
    estadoAtual = SEGURO;
    candidatoEstado = SEGURO;
    contadorEstado = 0;
    contadorDesconectado = 0;
    Serial.println("[BLE] Alarme RESETADO pelo app!");
  }
};

// ============================================================
//   LEITURA DE RSSI DO CLIENTE CONECTADO
// ============================================================
// No BLE, o servidor (ESP32) pode ler o RSSI do cliente conectado.
// Usamos a API esp_ble_gap do ESP-IDF acessivel pelo Arduino.
#include <esp_gap_ble_api.h>

int8_t lerRssiBle() {
  if (!clienteConectado) return -100;

  // Obtem o RSSI do peer conectado via handle da conexao
  // O ESP32 Arduino BLE nao expoe diretamente, entao usamos o
  // conn_id do servidor
  int rssi = -100;
  uint16_t connId = pServer->getConnId();
  esp_ble_gap_read_rssi(pServer->getPeerDevice(connId));

  // A leitura eh assincrona, mas podemos usar o ultimo valor
  // cacheado. Para simplificar, vamos ler do callback GAP.
  // Alternativa: o app le o RSSI do seu lado (mais confiavel).
  return rssi;
}

// Variavel global que recebe o RSSI via callback do GAP
int8_t bleRssiAtual = -100;

// Callback GAP para receber o RSSI
void gap_event_handler(esp_gap_ble_cb_event_t event, esp_ble_gap_cb_param_t *param) {
  if (event == ESP_GAP_BLE_READ_RSSI_COMPLETE_EVT) {
    if (param->read_rssi_cmpl.status == ESP_BT_STATUS_SUCCESS) {
      bleRssiAtual = param->read_rssi_cmpl.rssi;
    }
  }
}

// ============================================================
//   SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  pinMode(PINO_BUZZER, OUTPUT);
  pinMode(LED_INTERNO, OUTPUT);

  #if USAR_GPS
    GPSSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX, GPS_TX);
  #endif

  // Carrega preferencias salvas
  prefs.begin("escolta", false);
  somHabilitado = prefs.getBool("som", true);
  prefs.end();

  Serial.println("\n========= ESCOLTA UNITAU - BLE =========");

  // ---- Inicializa BLE ----
  BLEDevice::init(CHAR_NOME_DISPOSITIVO);
  BLEDevice::setPower(ESP_PWR_LVL_P9);  // Potencia maxima para maior alcance

  // Registra callback GAP para ler RSSI
  esp_ble_gap_register_callback(gap_event_handler);

  // Cria servidor BLE
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  // Cria servico
  BLEService* pService = pServer->createService(SERVICE_UUID);

  // ---- Characteristic: STATUS (Notify) ----
  // Envia JSON compacto com todos os dados a cada segundo
  pStatusChar = pService->createCharacteristic(
    CHAR_STATUS_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pStatusChar->addDescriptor(new BLE2902());  // Necessario para Notify

  // ---- Characteristic: SOM (Read/Write) ----
  pSomChar = pService->createCharacteristic(
    CHAR_SOM_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );
  pSomChar->setCallbacks(new SomCallback());
  pSomChar->setValue(somHabilitado ? "1" : "0");

  // ---- Characteristic: RESET PANICO (Write) ----
  pResetChar = pService->createCharacteristic(
    CHAR_RESET_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pResetChar->setCallbacks(new ResetCallback());

  // Inicia servico e advertising
  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Servidor iniciado! Aguardando conexao...");
  Serial.println("[BLE] Nome: " + String(CHAR_NOME_DISPOSITIVO));
}

// ============================================================
//   LOOP PRINCIPAL
// ============================================================
void loop() {
  #if USAR_GPS
    lerGPS();
  #endif

  // ---- Amostragem em intervalo fixo ----
  static unsigned long ultimaAmostra = 0;
  if (millis() - ultimaAmostra >= INTERVALO_AMOSTRA) {
    ultimaAmostra = millis();

    bool conectado = clienteConectado;

    // Le RSSI do cliente BLE conectado
    if (conectado) {
      // Solicita leitura de RSSI (assincrona, resultado via callback GAP)
      uint16_t connId = pServer->getConnId();
      esp_ble_gap_read_rssi(pServer->getPeerDevice(connId));
    }
    int8_t rssiCru = conectado ? bleRssiAtual : -100;
    ultimoRssiCru = rssiCru;

    // --- LED AZUL INTELIGENTE ---
    if (conectado) digitalWrite(LED_INTERNO, HIGH);   // Fixo = protegendo
    else           digitalWrite(LED_INTERNO, !digitalRead(LED_INTERNO));  // Piscando = procurando

    // Processa sinal (filtragem + decisao de estado)
    processarSinal(rssiCru, conectado);

    // LOG SERIAL
    if (conectado) {
      Serial.print("Cru: ");    Serial.print(rssiCru);
      Serial.print(" | Filt: "); Serial.print(rssiFiltrado, 1);
      Serial.print(" dBm | ~");  Serial.print(estimarDistancia(rssiFiltrado), 1);
      Serial.print(" m | Estado: "); Serial.println(nomeEstado());
    }
  }

  // ---- Envia status via BLE Notify (a cada INTERVALO_NOTIFY) ----
  static unsigned long ultimoNotify = 0;
  if (clienteConectado && millis() - ultimoNotify >= INTERVALO_NOTIFY) {
    ultimoNotify = millis();

    int   rssiMostrar = (int)round(rssiFiltrado);
    float distancia   = estimarDistancia(rssiFiltrado);

    // JSON compacto (BLE tem limite de 512 bytes por characteristic)
    String json = "{";
    json += "\"rssi\":" + String(rssiMostrar) + ",";
    json += "\"rssi_raw\":" + String(ultimoRssiCru) + ",";
    json += "\"rssi_filtrado\":" + String(rssiFiltrado, 1) + ",";
    json += "\"distancia_m\":" + String(distancia, 1) + ",";
    json += "\"estado\":\"" + String(nomeEstado()) + "\",";
    json += "\"som_on\":" + String(somHabilitado ? "true" : "false") + ",";
    json += "\"panico_ativo\":" + String(modoPanico ? "true" : "false") + ",";
    json += "\"gps_fix\":" + String(gpsFix ? "true" : "false") + ",";
    json += "\"lat\":" + String(gpsLat, 6) + ",";
    json += "\"lng\":" + String(gpsLng, 6);
    json += "}";

    pStatusChar->setValue(json.c_str());
    pStatusChar->notify();

    // Atualiza characteristic de som (caso mudou pelo buzzer)
    pSomChar->setValue(somHabilitado ? "1" : "0");
  }

  // ---- Detecta reconexao: rearma o sistema ----
  if (clienteConectado && !clienteAnterior) {
    Serial.println("[BLE] Nova conexao detectada!");
    // Salva preferencia de som
    prefs.begin("escolta", false);
    prefs.putBool("som", somHabilitado);
    prefs.end();
  }
  if (!clienteConectado && clienteAnterior) {
    // Cliente desconectou - o callback ja reinicia o advertising
  }
  clienteAnterior = clienteConectado;

  // Buzzer roda sempre (nao-bloqueante)
  atualizarBuzzer();
}
