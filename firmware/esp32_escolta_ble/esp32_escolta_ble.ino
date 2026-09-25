// ============================================================
//   ESCOLTA UNITAU — Firmware BLE (Bluetooth Low Energy)
// ============================================================
//  Migrado de Wi-Fi HTTP para BLE GATT Server.
//  Toda a logica de filtragem (EMA, histerese, debounce) do Dedini
//  foi PRESERVADA. So a camada de comunicacao mudou.
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
//   UUIDs BLE (exclusivos do Escolta UNITAU)
// ============================================================
#define SERVICE_UUID              "e5c1f4a0-1234-4b5c-9abc-def012345678"
#define CHAR_STATUS_UUID          "e5c1f4a1-1234-4b5c-9abc-def012345678"  // Notify - JSON status
#define CHAR_SOM_UUID             "e5c1f4a2-1234-4b5c-9abc-def012345678"  // Read/Write - "1"/"0"
#define CHAR_RESET_UUID           "e5c1f4a3-1234-4b5c-9abc-def012345678"  // Write - reseta panico
#define CHAR_RSSI_UUID            "e5c1f4a4-1234-4b5c-9abc-def012345678"  // Write - app envia RSSI
#define CHAR_CONTROLE_UUID        "e5c1f4a5-1234-4b5c-9abc-def012345678"  // Read/Write - pausar/retomar
#define CHAR_NOME_DISPOSITIVO     "ESCOLTA_BLE"

// ============================================================
//   VARIAVEIS BLE
// ============================================================
BLEServer*         pServer = NULL;
BLECharacteristic* pStatusChar = NULL;
BLECharacteristic* pSomChar = NULL;
BLECharacteristic* pResetChar = NULL;
BLECharacteristic* pRssiChar = NULL;
BLECharacteristic* pControleChar = NULL;
bool clienteConectado = false;
bool clienteAnterior  = false;

Preferences prefs;

// ============================================================
//   VARIAVEIS DO SISTEMA
// ============================================================
bool escoltaAtivada = false;
bool pausaIntencional = false;
bool modoPanico = false;
bool somHabilitado = true;

// ============================================================
//   FILTRAGEM DE SINAL  (EMA + Histerese + Debounce)
// ============================================================
enum Estado { SEGURO, ATENCAO, PERIGO };
Estado estadoAtual = SEGURO;
Estado candidatoEstado = SEGURO;

// --- Parametros ajustaveis ---
const float    EMA_ALFA          = 0.30f;
const uint32_t INTERVALO_AMOSTRA = 500;    // ms entre processamentos
const uint8_t  DEBOUNCE_AMOSTRAS = 6;
const uint32_t INTERVALO_NOTIFY  = 1000;   // ms entre envios BLE

// ============================================================
// !!! LIMIARES CALIBRADOS PELO EXPERIMENTO DO TCC !!!
// ============================================================
const int LIMIAR_ATENCAO_ENTRA = -70;
const int LIMIAR_ATENCAO_SAI   = -66;
const int LIMIAR_PERIGO_ENTRA  = -86;
const int LIMIAR_PERIGO_SAI    = -82;

const int   RSSI_REF_1M  = -71;   // RSSI BLE tipico a 1 metro
const float N_PROPAGACAO = 2.5f;

float   rssiFiltrado = -50.0f;
bool    filtroIniciado = false;
int8_t  ultimoRssiCru = -100;
uint8_t contadorEstado = 0;
uint8_t contadorDesconectado = 0;

// RSSI recebido do app (o app le e envia pra ca)
volatile int8_t rssiRecebidoDoApp = -100;
volatile bool   rssiAtualizado = false;

// ============================================================
//   FUNCOES DE FILTRAGEM
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
  if (!escoltaAtivada) {
    contadorDesconectado = 0;
    return;
  }

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

  if (!filtroIniciado) { rssiFiltrado = (float)rssiCru; filtroIniciado = true; }
  else rssiFiltrado = EMA_ALFA * (float)rssiCru + (1.0f - EMA_ALFA) * rssiFiltrado;

  Estado alvo = proximoEstadoHisterese(estadoAtual, rssiFiltrado);

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
//   BUZZER NAO-BLOQUEANTE
// ============================================================
void atualizarBuzzer() {
  static unsigned long ultimo = 0;
  static bool ligado = false;

  // Uma pausa confirmada pelo responsavel sempre vence qualquer estado anterior.
  if (!escoltaAtivada) {
    digitalWrite(PINO_BUZZER, LOW);
    ligado = false;
    return;
  }

  // !!! REGRA DE OURO INSERIDA AQUI !!!
  // O som pode estar mutado, MAS SE ENTRAR EM PANICO, ELE APITA!
  if (!somHabilitado && !modoPanico) { digitalWrite(PINO_BUZZER, LOW); ligado = false; return; }

  int periodo;
  if (modoPanico)                  periodo = 150;
  else if (estadoAtual == ATENCAO) periodo = 600;
  else { digitalWrite(PINO_BUZZER, LOW); ligado = false; return; }

  if (millis() - ultimo >= (unsigned long)periodo) {
    ligado = !ligado;
    digitalWrite(PINO_BUZZER, ligado ? HIGH : LOW);
    ultimo = millis();
  }
}

// ============================================================
//   GPS
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
    if (!pausaIntencional) {
      escoltaAtivada = true;
      Serial.println("[SISTEMA] MONITORAMENTO ARMADO!");
    }
    Serial.println("[BLE] Cliente conectado!");
  }
  void onDisconnect(BLEServer* pServer) {
    clienteConectado = false;
    Serial.println("[BLE] Cliente desconectado. Reiniciando advertising...");
    delay(500);
    pServer->startAdvertising();
  }
};

void aplicarModoEspera(bool emEspera) {
  pausaIntencional = emEspera;
  escoltaAtivada = !emEspera;
  modoPanico = false;
  estadoAtual = SEGURO;
  candidatoEstado = SEGURO;
  contadorEstado = 0;
  contadorDesconectado = 0;
  filtroIniciado = false;
  digitalWrite(PINO_BUZZER, LOW);

  prefs.begin("escolta", false);
  prefs.putBool("pausado", pausaIntencional);
  prefs.end();

  if (pControleChar != NULL) {
    pControleChar->setValue(emEspera ? "espera" : "ativo");
  }
  Serial.println(emEspera
    ? "[SISTEMA] MODO EM ESPERA CONFIRMADO"
    : "[SISTEMA] PROTECAO RETOMADA");
}

class ControleCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) {
    String comando = pChar->getValue().c_str();
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
};

class SomCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) {
    String valor = pChar->getValue().c_str();
    if (modoPanico) {
      Serial.println("[BLE] Toggle som NEGADO: panico ativo!");
      return;
    }
    somHabilitado = (valor == "1");
    Serial.print("[BLE] Som: "); Serial.println(somHabilitado ? "ON" : "OFF");
  }
};

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

class RssiCallback: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) {
    String valor = pChar->getValue().c_str();
    rssiRecebidoDoApp = (int8_t)valor.toInt();
    rssiAtualizado = true;
  }
};

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

  prefs.begin("escolta", false);
  somHabilitado = prefs.getBool("som", true);
  pausaIntencional = prefs.getBool("pausado", false);
  prefs.end();
  escoltaAtivada = false;

  Serial.println("\n========= ESCOLTA UNITAU - BLE =========");

  BLEDevice::init(CHAR_NOME_DISPOSITIVO);
  BLEDevice::setPower(ESP_PWR_LVL_P9);  

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pStatusChar = pService->createCharacteristic(
    CHAR_STATUS_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pStatusChar->addDescriptor(new BLE2902());

  pSomChar = pService->createCharacteristic(
    CHAR_SOM_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );
  pSomChar->setCallbacks(new SomCallback());
  pSomChar->setValue(somHabilitado ? "1" : "0");

  pResetChar = pService->createCharacteristic(
    CHAR_RESET_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pResetChar->setCallbacks(new ResetCallback());

  pRssiChar = pService->createCharacteristic(
    CHAR_RSSI_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pRssiChar->setCallbacks(new RssiCallback());

  pControleChar = pService->createCharacteristic(
    CHAR_CONTROLE_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );
  pControleChar->setCallbacks(new ControleCallback());
  pControleChar->setValue(pausaIntencional ? "espera" : "ativo");

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Servidor iniciado!");
  Serial.println("[BLE] Nome: " + String(CHAR_NOME_DISPOSITIVO));
  Serial.println("[BLE] Aguardando conexao do app...");
}

// ============================================================
//   LOOP PRINCIPAL
// ============================================================
void loop() {
  #if USAR_GPS
    lerGPS();
  #endif

  static unsigned long ultimaAmostra = 0;
  if (millis() - ultimaAmostra >= INTERVALO_AMOSTRA) {
    ultimaAmostra = millis();

    bool conectado = clienteConectado;
    int8_t rssiCru = conectado ? rssiRecebidoDoApp : -100;
    ultimoRssiCru = rssiCru;

    if (conectado) digitalWrite(LED_INTERNO, HIGH);
    else           digitalWrite(LED_INTERNO, !digitalRead(LED_INTERNO));

    processarSinal(rssiCru, conectado);

    if (conectado && rssiAtualizado) {
      Serial.print("RSSI App: "); Serial.print(rssiCru);
      Serial.print(" | Filt: ");  Serial.print(rssiFiltrado, 1);
      Serial.print(" dBm | ~");   Serial.print(estimarDistancia(rssiFiltrado), 1);
      Serial.print(" m | ");      Serial.println(nomeEstado());
    }
  }

  static unsigned long ultimoNotify = 0;
  if (clienteConectado && millis() - ultimoNotify >= INTERVALO_NOTIFY) {
    ultimoNotify = millis();

    int   rssiMostrar = (int)round(rssiFiltrado);
    float distancia   = estimarDistancia(rssiFiltrado);

    String json = "{";
    json += "\"rssi\":" + String(rssiMostrar) + ",";
    json += "\"rssi_raw\":" + String(ultimoRssiCru) + ",";
    json += "\"distancia_m\":" + String(distancia, 1) + ",";
    json += "\"estado\":\"" + String(nomeEstado()) + "\",";
    json += "\"som_on\":" + String(somHabilitado ? "true" : "false") + ",";
    json += "\"monitoramento_ativo\":" + String(escoltaAtivada ? "true" : "false") + ",";
    json += "\"panico_ativo\":" + String(modoPanico ? "true" : "false") + ",";
    json += "\"gps_fix\":" + String(gpsFix ? "true" : "false") + ",";
    json += "\"lat\":" + String(gpsLat, 6) + ",";
    json += "\"lng\":" + String(gpsLng, 6);
    json += "}";

    pStatusChar->setValue(json.c_str());
    pStatusChar->notify();
    pSomChar->setValue(somHabilitado ? "1" : "0");
  }

  if (clienteConectado && !clienteAnterior) {
    Serial.println("[BLE] Nova conexao!");
    prefs.begin("escolta", false);
    prefs.putBool("som", somHabilitado);
    prefs.end();
  }
  clienteAnterior = clienteConectado;

  atualizarBuzzer();
}
