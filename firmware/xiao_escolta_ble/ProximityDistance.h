#ifndef ESCOLTA_PROXIMITY_DISTANCE_H
#define ESCOLTA_PROXIMITY_DISTANCE_H

#include <math.h>

namespace Proximidade {
// Perfil padrão preservado: coletas históricas de 1/3/5/7 m.
constexpr float RSSI_REF_1M_LEGADO = -68.44f;
constexpr float N_PROPAGACAO_LEGADO = 2.65f;

#if defined(ESCOLTA_TESTE_DISTANCIA_RADIO4)
#if ESCOLTA_TESTE_DISTANCIA_RADIO4 != 1 || !defined(ESCOLTA_TESTE_CONFIRMACAO_PROXIMA) || !defined(ESCOLTA_TESTE_RADIO_TX_DBM) || !defined(ESCOLTA_TESTE_PROXIMIDADE_4DB)
#error "Calibracao D1 requer opt-in explicito no teste p5/radio4 com perfil p4"
#endif
static_assert(ESCOLTA_TESTE_RADIO_TX_DBM == 4, "Calibracao D1 requer potencia solicitada +4 dBm");
// Ajuste inverso ponderado de log10(d) em RSSI, 12 ensaios completos de
// 15/10: 1..10 m e repeticoes de 4/5 m. Cada distancia tem peso igual;
// ambos os ensaios de 4 m permanecem. Nao modifica limites de alarme.
constexpr float RSSI_REF_1M = -63.386376f;
constexpr float N_PROPAGACAO = 3.377961f;
#else
constexpr float RSSI_REF_1M = RSSI_REF_1M_LEGADO;
constexpr float N_PROPAGACAO = N_PROPAGACAO_LEGADO;
#endif

constexpr float expoenteDistancia(float rssi) {
  return (RSSI_REF_1M - rssi) / (10.0f * N_PROPAGACAO);
}

inline float estimarDistancia(float rssi) {
  if (!isfinite(rssi) || rssi < -126.0f || rssi >= 0.0f) return NAN;
  // Sem teto artificial em 7/15 m: valores fora dos ensaios são extrapolações.
  return powf(10.0f, expoenteDistancia(rssi));
}
}  // namespace Proximidade
#endif
