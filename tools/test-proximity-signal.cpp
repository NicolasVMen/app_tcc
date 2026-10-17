// Testes avaliados pelo compilador C++14 (sem placa e sem executar um modelo JS).
// Cada static_assert verifica a implementação usada no firmware.
#include "../firmware/xiao_escolta_ble/ProximitySignal.h"
#include "../firmware/xiao_escolta_ble/ProximityDistance.h"
using namespace Proximidade;

constexpr bool pertoSemAmarelo() {
  Monitor m;
  for (uint32_t t = 0; t <= 60000; t += 500) m.receber(-69, t);
  return m.estado() == SEGURO && m.sinal() > -70;
}
static_assert(pertoSemAmarelo(), "Sinal observado a 1 m nao deve gerar amarelo");

constexpr bool quedasIsoladas() {
  Monitor m;
  for (uint32_t t = 0; t <= 60000; t += 500) {
    m.receber(t % 10000 == 0 || t % 10000 == 500 ? -110 : -69, t);
    if (m.estado() != SEGURO) return false;
  }
  return m.sinal() > -71;
}
static_assert(quedasIsoladas(), "Mediana deve remover ate duas quedas isoladas numa janela");

constexpr bool atencaoConfirmada() {
  Monitor m;
  for (uint32_t t = 0; t < 6000; t += 500) m.receber(-80, t);
  if (m.estado() != SEGURO) return false;
  m.receber(-80, 6000);
  return m.estado() == ATENCAO;
}
static_assert(atencaoConfirmada(), "Amarelo exige janela e 4 s continuos");

constexpr bool perigoConfirmado() {
  Monitor m;
  for (uint32_t t = 0; t < 10000; t += 500) m.receber(-94, t);
  if (m.estado() == PERIGO) return false;
  m.receber(-94, 10000);
  return m.estado() == PERIGO;
}
static_assert(perigoConfirmado(), "Perigo exige janela e 8 s continuos");

constexpr bool cadenciaVariavel() {
  Monitor m;
  for (uint32_t t = 0; t < 12000; t += 1000) m.receber(-94, t);
  if (m.estado() == PERIGO) return false;
  m.receber(-94, 12000);
  return m.estado() == PERIGO;
}
static_assert(cadenciaVariavel(), "Confirmacao usa tempo real, nao numero fixo de ticks");

constexpr bool lacunaNaoConfirma() {
  Monitor m;
  for (uint32_t t = 0; t <= 6000; t += 500) m.receber(-94, t);
  m.receber(-94, 20000);
  for (uint32_t t = 20500; t < 30000; t += 500) m.receber(-94, t);
  if (m.estado() == PERIGO) return false;
  m.receber(-94, 30000);
  return m.estado() == PERIGO;
}
static_assert(lacunaNaoConfirma(), "Lacuna nao pode completar o tempo de perigo");

constexpr bool histereseERetorno() {
  Monitor m;
  for (uint32_t t = 0; t <= 10000; t += 500) m.receber(-80, t);
  if (m.estado() != ATENCAO) return false;
  for (uint32_t t = 10500; t <= 25000; t += 500) m.receber(-75, t);
  if (m.estado() != ATENCAO) return false;
  for (uint32_t t = 25500; t <= 40000; t += 500) m.receber(-69, t);
  return m.estado() == SEGURO;
}
static_assert(histereseERetorno(), "Margem de retorno evita alternancia entre verde e amarelo");

constexpr bool invalidos() {
  Monitor m;
  return !m.receber(0, 0) && !m.receber(-127, 500)
    && !m.receber(127, 1000) && !m.temLeitura() && m.estado() == SEGURO;
}
static_assert(invalidos(), "Sentinelas nao sao leituras de RSSI");

constexpr bool resetCompleto() {
  Monitor m;
  for (uint32_t t = 0; t <= 10000; t += 500) m.receber(-94, t);
  m.reset();
  return !m.temLeitura() && m.estado() == SEGURO;
}
static_assert(resetCompleto(), "Confirmacao humana limpa filtro e estado");

constexpr bool reconectarNaoDeclaraSeguro() {
  Monitor m;
  for (uint32_t t = 0; t <= 10000; t += 500) m.receber(-94, t);
  m.resetLeituras();
  return !m.temLeitura() && m.estado() == PERIGO;
}
static_assert(reconectarNaoDeclaraSeguro(), "Reconectar sozinho nao deve apagar perigo");

constexpr bool relogioCircular() {
  Monitor m;
  uint32_t inicio = UINT32_MAX - 3000;
  for (uint32_t delta = 0; delta <= 10000; delta += 500) m.receber(-94, inicio + delta);
  return m.estado() == PERIGO;
}
static_assert(relogioCircular(), "Temporizacao deve tolerar overflow de millis");

static_assert(alvoHisterese(SEGURO, -78) == ATENCAO, "Limiar amarelo inclusivo");
static_assert(alvoHisterese(ATENCAO, -73) == ATENCAO, "Retorno tem histerese");
static_assert(alvoHisterese(ATENCAO, -72) == SEGURO, "Sinal perto recupera verde");
static_assert(alvoHisterese(SEGURO, -86) == PERIGO, "Perigo nao foi afastado para ocultar alarmes");

// Replay das quatro últimas coletas elevadas (30 instantâneos/notificações).
// Não inventa as leituras intermediárias de 500 ms, que não estão no CSV.
constexpr int rssi1[] = {-68,-69,-68,-69,-69,-70,-69,-71,-68,-71,-70,-70,-70,-69,-69,-70,-69,-70,-69,-69,-69,-70,-68,-68,-68,-69,-69,-69,-72,-71};
constexpr uint32_t ms1[] = {0,1028,2017,3031,4013,5026,6031,7028,8014,9040,10030,11010,12039,13014,14047,15057,16025,17079,18034,19073,20026,21037,22072,23047,24035,25061,26053,27084,28054,29037};
constexpr int rssi3[] = {-86,-85,-85,-84,-85,-84,-85,-83,-85,-86,-85,-82,-86,-84,-83,-83,-83,-83,-83,-83,-83,-83,-84,-81,-80,-80,-79,-81,-82,-80};
constexpr uint32_t ms3[] = {0,1024,2021,3004,4057,5007,6007,7017,8008,9040,10027,11014,12032,13036,14015,15040,16024,17041,18042,19032,20043,21037,22055,23043,24072,25055,26043,27038,28065,29050};
constexpr int rssi5[] = {-83,-85,-85,-85,-85,-83,-85,-84,-92,-86,-85,-83,-83,-82,-82,-83,-83,-83,-83,-84,-84,-83,-83,-83,-83,-84,-83,-84,-83,-84};
constexpr uint32_t ms5[] = {0,1014,2012,3006,4023,5013,6008,7079,8047,9040,10024,11035,12030,13048,14037,15023,16046,17041,18027,19048,20069,21055,22046,23039,24063,25052,26064,27064,28079,29088};
constexpr int rssi7[] = {-86,-85,-86,-85,-88,-91,-87,-94,-97,-95,-97,-93,-93,-94,-93,-93,-92,-92,-94,-98,-98,-93,-88,-89,-86,-88,-87,-87,-88,-89};
constexpr uint32_t ms7[] = {0,981,2004,2999,4026,5007,6003,7013,8016,9033,10019,11018,11993,13019,14015,15032,16023,17012,18048,19023,20005,21009,22026,23011,24002,25014,26024,27025,28016,29029};

constexpr bool replay(const int (&rssi)[30], const uint32_t (&ms)[30], Estado final, bool permitePerigo) {
  Monitor m;
  for (uint8_t i = 0; i < 30; i++) {
    m.receber(rssi[i], ms[i]);
    if (!permitePerigo && m.estado() == PERIGO) return false;
    if (final == SEGURO && m.estado() != SEGURO) return false;
  }
  return m.estado() == final;
}
static_assert(replay(rssi1, ms1, SEGURO, false), "Replay 1 m elevado permanece verde");
static_assert(replay(rssi3, ms3, ATENCAO, false), "Replay 3 m elevado informa amarelo sem perigo");
static_assert(replay(rssi5, ms5, ATENCAO, false), "Replay 5 m nao transforma pico isolado em perigo");
static_assert(replay(rssi7, ms7, PERIGO, true), "Replay 7 m ainda detecta sinal fraco sustentado");
static_assert(periodoBuzzer(true, false, true, ATENCAO) == 600, "Atencao confirmada mantem bipe lento");
static_assert(periodoBuzzer(true, true, false, SEGURO) == 150, "Panico vence mute e estado do filtro");
static_assert(periodoBuzzer(true, false, false, ATENCAO) == 0, "Mute informativo respeitado fora de panico");
static_assert(periodoBuzzer(false, true, true, PERIGO) == 0, "Espera intencional desarma o buzzer");

// Verifica a transformação utilizada pela função real powf do firmware.
static_assert(expoenteDistancia(RSSI_REF_1M) == 0.0f, "Referencia corresponde a 1 m");
static_assert(expoenteDistancia(RSSI_REF_1M - 10.0f * N_PROPAGACAO) > 0.9999f
  && expoenteDistancia(RSSI_REF_1M - 10.0f * N_PROPAGACAO) < 1.0001f,
  "Perda de 10n dB corresponde a dez vezes a distancia");
static_assert(expoenteDistancia(-60) < 0, "Sinal forte estima menos de 1 m");
static_assert(expoenteDistancia(-110) > 1.1761f, "Nao ha teto artificial em 15 m");

constexpr float mediaReplay(const int (&rssi)[30], const uint32_t (&ms)[30]) {
  Monitor m;
  float soma = 0;
  for (uint8_t i = 0; i < 30; i++) {
    m.receber(rssi[i], ms[i]);
    soma += m.sinal();
  }
  return soma / 30.0f;
}
constexpr bool pertoDe(float a, float b) { return a - b < 0.002f && b - a < 0.002f; }
static_assert(pertoDe(mediaReplay(rssi1, ms1), -68.97260446f), "Replay da analise 1 m confere com C++");
static_assert(pertoDe(mediaReplay(rssi3, ms3), -83.93789302f), "Replay da analise 3 m confere com C++");
static_assert(pertoDe(mediaReplay(rssi5, ms5), -83.77631088f), "Replay da analise 5 m confere com C++");
static_assert(pertoDe(mediaReplay(rssi7, ms7), -90.28487747f), "Replay da analise 7 m confere com C++");

constexpr bool frescorDaDistancia() {
  Monitor m;
  if (m.leituraRecente(0)) return false;
  m.receber(-69, 500);
  return m.leituraRecente(3000) && !m.leituraRecente(3001);
}
static_assert(frescorDaDistancia(), "Distancia nao existe antes do RSSI nem apos 2,5 s sem leitura");
constexpr bool frescorComOverflow() {
  Monitor m;
  uint32_t inicio = UINT32_MAX - 1000;
  m.receber(-69, inicio);
  return m.leituraRecente(inicio + 2500) && !m.leituraRecente(inicio + 2501);
}
static_assert(frescorComOverflow(), "Frescor deve tolerar overflow do relogio");
