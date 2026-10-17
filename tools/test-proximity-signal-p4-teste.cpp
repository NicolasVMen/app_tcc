// Segundo perfil experimental; p2 e p3 permanecem reproduzíveis.
#define ESCOLTA_TESTE_PROXIMIDADE_4DB 1
#include "../firmware/xiao_escolta_ble/ProximitySignal.h"
#include "../firmware/xiao_escolta_ble/ProximityDistance.h"
using namespace Proximidade;

static_assert(ATENCAO_ENTRA == -82 && ATENCAO_SAI == -77, "Amarelo -82, margem de retorno de 5 dB");
static_assert(PERIGO_ENTRA == -90 && PERIGO_SAI == -86, "Perigo -90, margem de retorno de 4 dB");
static_assert(ATENCAO_MS == 4000 && PERIGO_MS == 4000, "Ambas as faixas exigem 4 s de confirmacao");
static_assert(RETORNO_MS == 2000 && MAX_LACUNA_MS == 2500, "Retorno e tratamento de dados antigos preservados");

constexpr bool confirmaSomenteAposQuatroSegundos(int rssi, Estado esperado) {
  Monitor m;
  // Cinco leituras preenchem a janela em t=2000 ms. Depois contam os 4 s.
  for (uint32_t t = 0; t < 6000; t += 500) {
    m.receber(rssi, t);
    if (m.estado() != SEGURO) return false;
  }
  m.receber(rssi, 6000);
  return m.estado() == esperado;
}
static_assert(confirmaSomenteAposQuatroSegundos(-82, ATENCAO), "Amarelo aguarda 4 s continuos apos a filtragem");
static_assert(confirmaSomenteAposQuatroSegundos(-90, PERIGO), "Perigo aguarda 4 s continuos apos a filtragem");

constexpr bool sinalMaisForteNaoAvisa() {
  Monitor m;
  for (uint32_t t = 0; t <= 60000; t += 500) {
    m.receber(-81, t);
    if (m.estado() != SEGURO) return false;
  }
  return true;
}
static_assert(sinalMaisForteNaoAvisa(), "Sinal -81 nao inicia amarelo");

constexpr bool lacunaReiniciaConfirmacao() {
  Monitor m;
  for (uint32_t t = 0; t <= 5000; t += 500) m.receber(-94, t);
  m.receber(-94, 20000);
  for (uint32_t t = 20500; t < 26000; t += 500) {
    m.receber(-94, t);
    if (m.estado() != SEGURO) return false;
  }
  m.receber(-94, 26000);
  return m.estado() == PERIGO;
}
static_assert(lacunaReiniciaConfirmacao(), "Lacuna nao completa o tempo de perigo");
static_assert(periodoBuzzer(true, true, false, SEGURO) == 150, "Panico vence mute independentemente do RSSI");
static_assert(periodoBuzzer(false, true, true, PERIGO) == 0, "Espera permanece silenciosa");
static_assert(periodoBuzzer(true, false, true, ATENCAO) == 600, "Cadencia do amarelo nao mudou");
static_assert(RSSI_REF_1M == -68.44f && N_PROPAGACAO == 2.65f, "Formula de distancia preservada");
