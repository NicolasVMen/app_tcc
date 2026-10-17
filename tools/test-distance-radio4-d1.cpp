// Somente compilação: não grava no dispositivo.
#define ESCOLTA_TESTE_PROXIMIDADE_4DB 1
#define ESCOLTA_TESTE_CONFIRMACAO_PROXIMA 1
#define ESCOLTA_TESTE_RADIO_TX_DBM 4
#define ESCOLTA_TESTE_DISTANCIA_RADIO4 1
#include "../firmware/xiao_escolta_ble/ProximitySignal.h"
#include "../firmware/xiao_escolta_ble/ProximityDistance.h"
using namespace Proximidade;
static_assert(RSSI_REF_1M < -63.38637f && RSSI_REF_1M > -63.38639f, "D1: referencia de ajuste");
static_assert(N_PROPAGACAO > 3.37795f && N_PROPAGACAO < 3.37797f, "D1: expoente de ajuste");
static_assert(expoenteDistancia(RSSI_REF_1M) == 0.0f, "Referencia representa 1 m");
static_assert(expoenteDistancia(-100.0f) > expoenteDistancia(-90.0f), "Escala monotona");
static_assert(ATENCAO_ENTRA == -82 && ATENCAO_SAI == -77, "D1 nao altera amarelo");
static_assert(PERIGO_ENTRA == -90 && PERIGO_SAI == -86, "D1 nao altera vermelho");
static_assert(ATENCAO_MS == 4000 && PERIGO_MS == 4000 && RETORNO_MS == 2000, "D1 nao altera tempos");
static_assert(JANELA == 5 && ALFA == .30f && MAX_LACUNA_MS == 2500, "D1 nao altera filtro/frescor");
static_assert(periodoBuzzer(true, false, true, ATENCAO) == 600, "D1 mantem bipe lento");
static_assert(periodoBuzzer(true, true, true, PERIGO) == 150, "D1 mantem emergencia");
constexpr bool nearSignal() {
  Monitor m;
  for (uint32_t t = 0; t <= 60000; t += 500) {
    m.receber(t % 10000 == 0 ? -110 : -70, t);
    if (m.estado() != SEGURO) return false;
  }
  m.receber(-70, 60500);
  return m.podeConfirmarSeguranca(60500);
}
static_assert(nearSignal(), "D1 mantem rejeicao de pico e confirmacao proxima");
