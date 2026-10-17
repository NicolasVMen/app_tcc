#ifndef ESCOLTA_COMMUNICATION_WATCHDOG_H
#define ESCOLTA_COMMUNICATION_WATCHDOG_H
#include <stdint.h>

namespace Comunicacao {
// Falta de amostra é falha de comunicação, não evidência de distância.
constexpr uint32_t LIMITE_SEM_RSSI_MS = 8000;
class Watchdog {
 public:
  constexpr Watchdog() : ativo(false), ultimo(0) {}
  constexpr void armar(uint32_t agora) { ativo = true; ultimo = agora; }
  constexpr void desarmar() { ativo = false; }
  constexpr void recebeu(uint32_t agora) { if (ativo) ultimo = agora; }
  constexpr bool expirou(uint32_t agora) const {
    return ativo && uint32_t(agora - ultimo) >= LIMITE_SEM_RSSI_MS;
  }
 private:
  bool ativo;
  uint32_t ultimo;
};
}
#endif
