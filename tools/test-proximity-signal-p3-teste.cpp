// Perfil experimental separado: o firmware padrão p2 permanece inalterado.
#define ESCOLTA_TESTE_PROXIMIDADE_6DB 1
#include "../firmware/xiao_escolta_ble/ProximitySignal.h"
#include "../firmware/xiao_escolta_ble/ProximityDistance.h"
using namespace Proximidade;

static_assert(ATENCAO_ENTRA == -84 && ATENCAO_SAI == -79, "Amarelo deslocado 6 dB, com histerese mantida");
static_assert(PERIGO_ENTRA == -92 && PERIGO_SAI == -88, "Perigo deslocado 6 dB, com histerese mantida");
static_assert(ATENCAO_MS == 5000 && PERIGO_MS == 5000, "Ambas as faixas exigem 5 s de confirmacao");
static_assert(RETORNO_MS == 2000 && MAX_LACUNA_MS == 2500, "Retorno e tratamento de dados antigos preservados");

constexpr bool confirmaSomenteAposCincoSegundos(int rssi, Estado esperado) {
  Monitor m;
  // Cinco leituras preenchem a janela em t=2000 ms. A confirmação começa depois disso.
  for (uint32_t t = 0; t < 7000; t += 500) {
    m.receber(rssi, t);
    if (m.estado() != SEGURO) return false;
  }
  m.receber(rssi, 7000);
  return m.estado() == esperado;
}
static_assert(confirmaSomenteAposCincoSegundos(-84, ATENCAO), "Amarelo nao inicia antes da confirmacao");
static_assert(confirmaSomenteAposCincoSegundos(-92, PERIGO), "Perigo nao inicia antes da confirmacao");

constexpr bool sinalMaisForteNaoAvisa() {
  Monitor m;
  for (uint32_t t = 0; t <= 60000; t += 500) {
    m.receber(-83, t);
    if (m.estado() != SEGURO) return false;
  }
  return true;
}
static_assert(sinalMaisForteNaoAvisa(), "Sinal de -83 dBm nao deve iniciar amarelo no perfil novo");

constexpr bool lacunaReiniciaConfirmacao() {
  Monitor m;
  for (uint32_t t = 0; t <= 6000; t += 500) m.receber(-94, t);
  m.receber(-94, 20000);
  for (uint32_t t = 20500; t < 27000; t += 500) {
    m.receber(-94, t);
    if (m.estado() != SEGURO) return false;
  }
  m.receber(-94, 27000);
  return m.estado() == PERIGO;
}
static_assert(lacunaReiniciaConfirmacao(), "Tempo sem leitura nao completa a confirmacao");
static_assert(periodoBuzzer(true, true, false, SEGURO) == 150, "Panico vence mute independentemente do RSSI");
static_assert(periodoBuzzer(false, true, true, PERIGO) == 0, "Modo espera permanece silencioso");
static_assert(periodoBuzzer(true, false, true, ATENCAO) == 600, "Cadencia do amarelo nao mudou");
static_assert(RSSI_REF_1M == -68.44f && N_PROPAGACAO == 2.65f, "Estimativa de distancia nao foi adulterada");
