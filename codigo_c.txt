#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <esp_wifi.h>
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
// O resto do codigo (JSON /api/status e o app) ja entende os campos
// gps_fix / lat / lng, entao nada mais precisa mudar.
#define USAR_GPS 0
#if USAR_GPS
  #include <TinyGPSPlus.h>
  #include <HardwareSerial.h>
  TinyGPSPlus gps;
  HardwareSerial GPSSerial(2);   // UART2
  #define GPS_RX 16
  #define GPS_TX 17
  #define GPS_BAUD 9600
#endif
bool   gpsFix = false;
double gpsLat = 0.0, gpsLng = 0.0;

#define PINO_BUZZER 13
#define LED_INTERNO 2

WebServer server(80);
DNSServer dnsServer;
Preferences prefs;

String ssidSalvo, senhaSalva;
bool escoltaAtivada = false;
bool modoPanico = false;
bool somHabilitado = true;
bool configurado = false;
bool modoEstacao = false;
bool monitoramentoLiberado = false;
bool dispositivoConectado = false;

const byte DNS_PORT = 53;
IPAddress apIP(192, 168, 4, 1);

// ============================================================
//   FILTRAGEM DE SINAL  (o coracao da melhoria de localizacao)
// ============================================================
// O RSSI cru do Wi-Fi e MUITO ruidoso: um corpo na frente, uma parede
// ou um reflexo faz o valor "pular" 10-20 dBm de uma leitura pra outra.
// Reagir a uma unica leitura (como antes) gera alarmes falsos o tempo todo.
//
// Aqui a placa faz 3 coisas, em camadas:
//   1) EMA  -> media exponencial que suaviza o ruido instantaneo
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

// Limiares COM HISTERESE (dBm, aplicados sobre o sinal JA FILTRADO)
const int LIMIAR_ATENCAO_ENTRA = -70;  // seguro  -> atencao
const int LIMIAR_ATENCAO_SAI   = -65;  // atencao -> seguro
const int LIMIAR_PERIGO_ENTRA  = -82;  // atencao -> perigo
const int LIMIAR_PERIGO_SAI    = -78;  // perigo  -> atencao

// Modelo log-distance pra ESTIMAR a metragem (calibravel)
const int   RSSI_REF_1M  = -45;   // RSSI medido a 1 metro de distancia
const float N_PROPAGACAO = 2.7f;  // 2.0 = campo livre | 2.7-3.5 = ambiente interno

float   rssiFiltrado = -50.0f;
bool    filtroIniciado = false;
int8_t  ultimoRssiCru = -100;
uint8_t contadorEstado = 0;
uint8_t contadorDesconectado = 0;

// Estima a distancia (metros) a partir do RSSI filtrado.
// E uma ESTIMATIVA: serve pra ordem de grandeza ("perto/longe"), nao GPS.
float estimarDistancia(float rssi) {
  return pow(10.0f, (RSSI_REF_1M - rssi) / (10.0f * N_PROPAGACAO));
}

// Le o RSSI bruto conforme o modo (estacao = conectado no Wi-Fi da casa,
// AP = celular conectado direto na placa) e diz se ha alguem conectado.
int8_t lerRssiCru(bool &conectado) {
  int8_t rssi = -100;
  if (modoEstacao) {
    conectado = (WiFi.status() == WL_CONNECTED);
    if (conectado) rssi = WiFi.RSSI();
  } else {
    wifi_sta_list_t st;
    esp_wifi_ap_get_sta_list(&st);
    conectado = (st.num > 0);
    if (conectado) rssi = st.sta[0].rssi;
  }
  return rssi;
}

// Decide o estado-alvo aplicando histerese: o limiar depende de onde estamos.
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

// Roda a cada INTERVALO_AMOSTRA: filtra, decide estado e arma o panico.
void processarSinal(int8_t rssiCru, bool conectado) {
  // ---- Desconexao SUSTENTADA vira panico (um blip nao alarma) ----
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
        modoPanico = true;   // panico trava ligado ate reset manual (seguranca)
        Serial.println("[ALARME] PERIGO sustentado -> PANICO!");
      }
    }
  }
}

// Buzzer NAO-BLOQUEANTE: nada de delay() travando o servidor/leituras.
// Padrao do bip muda conforme a gravidade.
void atualizarBuzzer() {
  static unsigned long ultimo = 0;
  static bool ligado = false;

  if (!somHabilitado) { digitalWrite(PINO_BUZZER, LOW); ligado = false; return; }

  int periodo;
  if (modoPanico)                 periodo = 150;  // panico: bip rapido e continuo
  else if (estadoAtual == ATENCAO) periodo = 600; // atencao: bip lento de aviso
  else { digitalWrite(PINO_BUZZER, LOW); ligado = false; return; }

  if (millis() - ultimo >= (unsigned long)periodo) {
    ligado = !ligado;
    digitalWrite(PINO_BUZZER, ligado ? HIGH : LOW);
    ultimo = millis();
  }
}

const char* nomeEstado() {
  if (modoPanico) return "panico";
  if (estadoAtual == SEGURO)  return "seguro";
  if (estadoAtual == ATENCAO) return "atencao";
  return "perigo";
}

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

void enviarPagina(String html) {
  server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  server.send(200, "text/html", html);
}

void enviarJSON(String json) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.sendHeader("Cache-Control", "no-cache");
  server.send(200, "application/json", json);
}

void handleRoot() {
  monitoramentoLiberado = true;
  int rssiMostrar = (int)round(rssiFiltrado);
  float distancia  = estimarDistancia(rssiFiltrado);

  String html = "<html><head><meta name='viewport' content='width=device-width, initial-scale=1.0' charset='utf-8'>";
  // Auto-reload para atualizar o sinal dBm
  if(configurado) html += "<script>setTimeout(function(){ location.reload(); }, 2000);</script>";

  html += "<style>body{font-family:sans-serif; text-align:center; padding:15px; background:#f4f4f9;}";
  html += ".card{background:white; padding:20px; border-radius:15px; box-shadow:0 4px 6px rgba(0,0,0,0.1); margin-bottom:15px;}";
  html += "button{width:100%; height:60px; font-size:16px; margin:5px 0; border-radius:12px; border:none; color:white; font-weight:bold;}";
  html += ".btn-blue{background:#3498db;} .btn-green{background:#2ecc71;} .btn-dark{background:#2c3e50;} .btn-red{background:#e74c3c;}</style></head><body>";

  html += "<h1>ESCOLTA UNITAU</h1>";

  if (configurado) {
    html += "<div class='card'><h2>SISTEMA: " + String(modoEstacao ? "CASA &#127968;" : "RUA &#127970;") + "</h2>";
    html += "<form action='/toggleSom' method='POST'><button class='btn-dark'>" + String(somHabilitado ? "SOM: ON" : "SOM: OFF") + "</button></form>";
    html += "<h3>Sinal: " + String(rssiMostrar) + " dBm</h3>";
    html += "<p>Distancia estimada: ~" + String(distancia, 1) + " m</p>";

    if(modoPanico) {
      html += "<h2 style='color:red;'>ALERTA ATIVO!</h2>";
      if (rssiFiltrado > LIMIAR_ATENCAO_SAI) html += "<form action='/reset' method='POST'><button class='btn-red'>RESETAR (ESTAMOS SEGUROS)</button></form>";
      else html += "<p style='color:red;'>Aproxime-se para resetar</p>";
    }
    html += "</div>";
  }

  // Opcoes de troca sempre visiveis
  html += "<div class='card'><h3>CONFIGURAR MODO</h3>";
  html += "<form action='/modoCasa' method='GET'><button class='btn-blue'>CONECTAR WI-FI CASA</button></form>";
  html += "<form action='/modoRua' method='GET'><button class='btn-green'>ATIVAR MODO RUA</button></form>";
  if(configurado) html += "<form action='/limpar' method='GET'><button style='background:#95a5a6; height:35px;'>ZERAR TUDO</button></form>";
  html += "</div></body></html>";

  enviarPagina(html);
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_BUZZER, OUTPUT);
  pinMode(LED_INTERNO, OUTPUT);

  #if USAR_GPS
    GPSSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX, GPS_TX);
  #endif

  prefs.begin("escolta", false);
  ssidSalvo = prefs.getString("ssid", "");
  senhaSalva = prefs.getString("pass", "");
  configurado = prefs.getBool("config", false);
  prefs.end();

  Serial.println("\n========= DEDO DURO INICIADO =========");

  if (configurado && ssidSalvo != "MODO_RUA" && ssidSalvo != "") {
    Serial.println("[BOOT] Modo Casa: Tentando " + ssidSalvo);
    WiFi.begin(ssidSalvo.c_str(), senhaSalva.c_str());
    int c = 0; while (WiFi.status() != WL_CONNECTED && c < 30) {
      digitalWrite(LED_INTERNO, !digitalRead(LED_INTERNO)); delay(500); Serial.print("."); c++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      modoEstacao = true;
      Serial.println("\n[SUCESSO] Conectado! IP: " + WiFi.localIP().toString());
    } else {
      Serial.println("\n[FALHA] Senha errada ou fora de alcance. Abrindo Modo Rua.");
      WiFi.softAP("ESCOLTA_MODO_RUA", "123456789");
    }
  } else {
    WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
    WiFi.softAP(configurado ? "ESCOLTA_MODO_RUA" : "CONFIG_INICIAL_ESCOLTA", "123456789");
    dnsServer.start(DNS_PORT, "*", apIP);
    Serial.println(configurado ? "[BOOT] Modo Rua Ativo." : "[BOOT] Aguardando Primeira Config.");
  }

  MDNS.begin("escolta");
  server.on("/", handleRoot);

  // Rota 1: Abre a pagina instataneamente e depois busca as redes
  server.on("/modoCasa", [](){
    String h = "<html><body style='text-align:center; font-family:sans-serif;'><h2>Escolha seu Wi-Fi:</h2>";
    h += "<p id='msg'>Procurando redes ao redor, aguarde...</p>";
    h += "<form action='/salvar' method='POST' id='form' style='display:none;'>";
    h += "<select id='redes' name='ssid' style='width:90%; height:40px; margin-bottom:15px;'></select><br>";
    h += "Senha do Wi-Fi: <input type='password' name='pass' style='width:90%; height:40px; margin-bottom:15px;'><br>";
    h += "<button type='submit' style='background:#3498db; color:white; width:90%; height:50px; border-radius:10px;'>SALVAR E CONECTAR</button></form>";
    h += "<script>fetch('/api/redes').then(r=>r.json()).then(data=>{ let s=''; data.forEach(net=>s+='<option value=\"'+net+'\">'+net+'</option>'); document.getElementById('redes').innerHTML=s; document.getElementById('msg').style.display='none'; document.getElementById('form').style.display='block'; }).catch(()=> document.getElementById('msg').innerText = 'Erro ao buscar. Tente de novo.');</script></body></html>";
    enviarPagina(h);
  });

  // Rota 2: Faz a busca pesada "escondida" sem travar a navegacao
  server.on("/api/redes", [](){
    int n = WiFi.scanNetworks();
    String json = "[";
    for (int i = 0; i < n; ++i) {
      if(i>0) json += ",";
      json += "\"" + WiFi.SSID(i) + "\"";
    }
    json += "]";
    enviarJSON(json);
  });

  server.on("/modoRua", [](){
    Serial.println("[ACAO] Usuario escolheu MODO RUA.");
    prefs.begin("escolta", false); prefs.putBool("config", true); prefs.putString("ssid", "MODO_RUA"); prefs.end();
    enviarPagina("<html><body><h1>Ativando Modo Rua...</h1><p>Reiniciando placa.</p></body></html>");
    delay(2000); ESP.restart();
  });

  server.on("/salvar", HTTP_POST, [](){
    Serial.println("[ACAO] Usuario salvando Wi-Fi de Casa.");
    prefs.begin("escolta", false);
    prefs.putString("ssid", server.arg("ssid"));
    prefs.putString("pass", server.arg("pass"));
    prefs.putBool("config", true);
    prefs.end();
    enviarPagina("<html><body><h1>Dados Salvos!</h1><p>Reiniciando para conectar...</p></body></html>");
    delay(2000); ESP.restart();
  });

  server.on("/toggleSom", HTTP_POST, [](){
    if (!modoPanico) { somHabilitado = !somHabilitado; Serial.println("[BOTAO] Som alterado."); }
    else { Serial.println("[NEGADO] Bloqueado: Crianca longe!"); }
    server.sendHeader("Location", "/"); server.send(302);
  });

  server.on("/reset", HTTP_POST, [](){
    modoPanico = false; estadoAtual = SEGURO; candidatoEstado = SEGURO;
    contadorEstado = 0; contadorDesconectado = 0;
    Serial.println("[BOTAO] Alarme Resetado!");
    server.sendHeader("Location", "/"); server.send(302);
  });

  server.on("/limpar", [](){
    Serial.println("[!] ZERANDO TUDO E REINICIANDO...");
    prefs.begin("escolta", false); prefs.clear(); prefs.end();
    enviarPagina("<html><body><h1>Memorias Limpas!</h1><p>Reiniciando placa...</p></body></html>");
    delay(2000); ESP.restart();
  });

  // ===== JSON API PARA O APP REACT NATIVE =====
  server.on("/api/status", HTTP_GET, [](){
    monitoramentoLiberado = true;
    int   rssiMostrar = (int)round(rssiFiltrado);
    float distancia   = estimarDistancia(rssiFiltrado);

    String json = "{";
    json += "\"rssi\":" + String(rssiMostrar) + ",";                 // filtrado (compat. app)
    json += "\"rssi_raw\":" + String(ultimoRssiCru) + ",";           // cru, p/ debug/grafico
    json += "\"rssi_filtrado\":" + String(rssiFiltrado, 1) + ",";
    json += "\"distancia_m\":" + String(distancia, 1) + ",";
    json += "\"estado\":\"" + String(nomeEstado()) + "\",";
    json += "\"modo_casa\":" + String(modoEstacao ? "true" : "false") + ",";
    json += "\"som_on\":" + String(somHabilitado ? "true" : "false") + ",";
    json += "\"panico_ativo\":" + String(modoPanico ? "true" : "false") + ",";
    json += "\"configurado\":" + String(configurado ? "true" : "false") + ",";
    json += "\"gps_fix\":" + String(gpsFix ? "true" : "false") + ",";
    json += "\"lat\":" + String(gpsLat, 6) + ",";
    json += "\"lng\":" + String(gpsLng, 6);
    json += "}";
    enviarJSON(json);
  });

  server.on("/api/toggleSom", HTTP_POST, [](){
    if (!modoPanico) { somHabilitado = !somHabilitado; Serial.println("[API] Som alterado."); }
    else { Serial.println("[API NEGADO] Bloqueado: Crianca longe!"); }
    String json = "{\"ok\":true,\"som_on\":" + String(somHabilitado ? "true" : "false") + "}";
    enviarJSON(json);
  });

  server.on("/api/modoRua", HTTP_POST, [](){
    Serial.println("[API] Ativando Modo Rua.");
    prefs.begin("escolta", false); prefs.putBool("config", true); prefs.putString("ssid", "MODO_RUA"); prefs.end();
    enviarJSON("{\"ok\":true,\"msg\":\"Reiniciando em Modo Rua\"}");
    delay(2000); ESP.restart();
  });

  server.on("/api/zerar", HTTP_POST, [](){
    Serial.println("[API] ZERANDO TUDO.");
    prefs.begin("escolta", false); prefs.clear(); prefs.end();
    enviarJSON("{\"ok\":true,\"msg\":\"Memorias limpas\"}");
    delay(2000); ESP.restart();
  });

  server.on("/api/reset", HTTP_POST, [](){
    modoPanico = false; estadoAtual = SEGURO; candidatoEstado = SEGURO;
    contadorEstado = 0; contadorDesconectado = 0;
    Serial.println("[API] Alarme Resetado!");
    enviarJSON("{\"ok\":true,\"panico_ativo\":false}");
  });

  server.onNotFound([]() { server.sendHeader("Location", "/", true); server.send(302); });
  server.begin();
  MDNS.addService("http", "tcp", 80);
}

void loop() {
  dnsServer.processNextRequest();
  server.handleClient();
  #if USAR_GPS
    lerGPS();
  #endif

  // Amostragem em intervalo fixo: estabiliza o filtro e nao sobrecarrega o Wi-Fi.
  static unsigned long ultimaAmostra = 0;
  if (millis() - ultimaAmostra >= INTERVALO_AMOSTRA) {
    ultimaAmostra = millis();

    bool conectado = false;
    int8_t rssiCru = lerRssiCru(conectado);
    ultimoRssiCru = rssiCru;
    dispositivoConectado = conectado;

    // --- LED AZUL INTELIGENTE ---
    // Fixo = protegendo (alguem conectado) | Piscando = procurando
    if (conectado) digitalWrite(LED_INTERNO, HIGH);
    else           digitalWrite(LED_INTERNO, !digitalRead(LED_INTERNO));

    if (monitoramentoLiberado) {
      processarSinal(rssiCru, conectado);

      // LOG SERIAL: cru x filtrado x distancia x estado (otimo p/ o TCC)
      Serial.print("Cru: ");   Serial.print(rssiCru);
      Serial.print(" | Filt: "); Serial.print(rssiFiltrado, 1);
      Serial.print(" dBm | ~");  Serial.print(estimarDistancia(rssiFiltrado), 1);
      Serial.print(" m | Estado: "); Serial.println(nomeEstado());
    }
  }

  // Buzzer roda sempre (nao-bloqueante), reagindo ao estado atual.
  atualizarBuzzer();
}
