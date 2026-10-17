#define ESCOLTA_TESTE_KALMAN_K1 1
#define ESCOLTA_TESTE_PROXIMIDADE_4DB 1
#define ESCOLTA_TESTE_CONFIRMACAO_PROXIMA 1
#define ESCOLTA_TESTE_DISTANCIA_RADIO4 1
#define ESCOLTA_TESTE_RADIO_TX_DBM 4
#include "../firmware/xiao_escolta_ble/ProximitySignal.h"
#include "../firmware/xiao_escolta_ble/ProximityDistance.h"
using namespace Proximidade;
constexpr bool close(float a, float b) { return a - b < 0.0001f && b - a < 0.0001f; }
static_assert(ATENCAO_ENTRA == -77 && ATENCAO_SAI == -72, "K1 amarelo e margem de retorno");
#if defined(ESCOLTA_TESTE_KALMAN_K2)
static_assert(PERIGO_ENTRA == -90 && PERIGO_SAI == -86, "K2 altera somente vermelho e sua histerese");
#else
static_assert(PERIGO_ENTRA == -85 && PERIGO_SAI == -81, "K1 vermelho e margem de retorno");
#endif
static_assert(ATENCAO_MS == 4000 && PERIGO_MS == 4000 && RETORNO_MS == 2000, "Tempos preservados");
static_assert(KALMAN_Q_POR_SEGUNDO == 1 && KALMAN_R == 4, "Kalman Q1 R4 opt-in");
static_assert(RSSI_REF_1M == -63.386376f && N_PROPAGACAO == 3.377961f, "Formula D1 preservada");
constexpr bool ganho(float intervaloMs, float esperado) {
  Monitor m; m.receber(-70, 0); m.receber(-80, uint32_t(intervaloMs));
  return close(m.sinal(), esperado);
}
static_assert(ganho(500, -75.294117647f), "Q escalado por 500 ms reais");
static_assert(ganho(1000, -75.555555556f), "Q escalado por 1000 ms reais");
constexpr bool confirmaDepois(int rssi, Estado esperado) {
  Monitor m;
  for (uint32_t t = 0; t < 6000; t += 500) {
    m.receber(rssi, t);
    if (m.estado() != SEGURO) return false;
  }
  m.receber(rssi, 6000);
  return m.estado() == esperado;
}
static_assert(confirmaDepois(-77, ATENCAO), "Amarelo so apos janela e 4 s");
static_assert(confirmaDepois(PERIGO_ENTRA, PERIGO), "Vermelho so apos janela e 4 s");
constexpr bool naoDispara(int base, bool picos) {
  Monitor m;
  for (uint32_t t = 0; t <= 30000; t += 500) {
    m.receber(picos && (t == 10000 || t == 10500) ? -110 : base, t);
    if (m.estado() != SEGURO) return false;
  }
  return true;
}
static_assert(naoDispara(-69, false), "Proximo constante silencioso");
static_assert(naoDispara(-69, true), "Duas quedas isoladas nao confirmam alerta");
static_assert(naoDispara(-76, false), "Limite conhecido: sinal forte de 5 m nao cria vermelho ficticio");
constexpr bool lacuna() {
  Monitor m;
  for (uint32_t t = 0; t <= 5000; t += 500) m.receber(-95, t);
  m.receber(-95, 20000);
  for (uint32_t t = 20500; t < 26000; t += 500) {
    m.receber(-95, t); if (m.estado() != SEGURO) return false;
  }
  m.receber(-95, 26000); return m.estado() == PERIGO;
}
static_assert(lacuna(), "Lacuna reinicia filtro, janela e candidato");
constexpr bool invalidos() {
  Monitor m;
  return !m.receber(0, 0) && !m.receber(-127, 500) && !m.receber(20, 1000) && !m.temLeitura();
}
static_assert(invalidos(), "Sentinelas rejeitadas");
constexpr bool confirmar() {
  Monitor m;
  for (uint32_t t = 0; t < 2000; t += 500) {
    m.receber(-69, t); if (m.podeConfirmarSeguranca(t)) return false;
  }
  m.receber(-69, 2000);
  if (!m.podeConfirmarSeguranca(2000) || m.podeConfirmarSeguranca(4501)) return false;
  m.receber(-78, 2500);
  return !m.podeConfirmarSeguranca(2500);
}
static_assert(confirmar(), "ACK requer janela recente e ultimo cru > -77");
constexpr bool voltaPerto() {
  Monitor m;
  for (uint32_t t = 0; t <= 10000; t += 500) m.receber(-95, t);
  if (m.estado() != PERIGO) return false;
  m.resetLeituras();
  if (m.estado() != PERIGO || m.podeConfirmarSeguranca(10500)) return false;
  for (uint32_t t = 10500; t <= 30000; t += 500) m.receber(-69, t);
  return m.estado() == SEGURO && m.podeConfirmarSeguranca(30000);
}
static_assert(voltaPerto(), "Reconectar nao apaga perigo; leituras novas fortes permitem ACK");
constexpr bool overflow() {
  Monitor m;
  const uint32_t start = UINT32_MAX - 3000;
  for (uint32_t dt = 0; dt <= 7000; dt += 500) m.receber(-90, start + dt);
  return m.estado() == PERIGO && m.leituraRecente(start + 9500) && !m.leituraRecente(start + 9501);
}
static_assert(overflow(), "Filtro e frescor toleram overflow millis");
static_assert(periodoBuzzer(false, true, true, PERIGO) == 0, "Espera permanece silenciosa");
static_assert(periodoBuzzer(true, true, false, SEGURO) == 150, "Panico retido vence mute");
static_assert(periodoBuzzer(true, false, true, ATENCAO) == 600, "Bipe lento preservado");
