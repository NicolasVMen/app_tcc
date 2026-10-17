#ifndef ESCOLTA_RADIO_POWER_POLICY_H
#define ESCOLTA_RADIO_POWER_POLICY_H
#include <stdint.h>
namespace EnsaioPotencia {
constexpr int8_t ALVO_DBM = 4;
constexpr bool podeAplicar(uint8_t status, int8_t anterior) {
  return status == 0 && anterior >= -40 && anterior <= 8;
}
constexpr bool aplicado(uint8_t escrita, uint8_t leitura, int8_t atual) {
  return escrita == 0 && leitura == 0 && atual == ALVO_DBM;
}
constexpr bool precisaRetornar(uint8_t leitura, int8_t atual, int8_t anterior) {
  return leitura != 0 || atual != anterior;
}
}
#endif
