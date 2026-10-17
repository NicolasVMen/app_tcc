#include "../firmware/xiao_escolta_ble/CommunicationWatchdog.h"
using Comunicacao::Watchdog;
constexpr bool nuncaArmado() { Watchdog w; return !w.expirou(100000); }
constexpr bool carencia() { Watchdog w; w.armar(1000); return !w.expirou(8999) && w.expirou(9000); }
constexpr bool recebe() { Watchdog w; w.armar(1000); w.recebeu(8000); return !w.expirou(15999) && w.expirou(16000); }
constexpr bool espera() { Watchdog w; w.armar(1000); w.desarmar(); w.recebeu(2000); return !w.expirou(100000); }
constexpr bool retoma() { Watchdog w; w.armar(1000); w.desarmar(); w.armar(50000); return !w.expirou(57999) && w.expirou(58000); }
constexpr bool rollover() { Watchdog w; w.armar(0xfffffff0UL); return !w.expirou(0x1f2fUL) && w.expirou(0x1f30UL); }
constexpr bool pulsoContinuo() {
  Watchdog w; w.armar(0);
  for (unsigned i = 500; i < 100000; i += 500) { w.recebeu(i); if (w.expirou(i)) return false; }
  return true;
}
static_assert(nuncaArmado(), "Nao alarmar antes de armar");
static_assert(carencia(), "Oito segundos de carencia apos conectar");
static_assert(recebe(), "Cada leitura valida renova o prazo");
static_assert(espera(), "Espera/desconexao desarmam o watchdog");
static_assert(retoma(), "Retomada recebe carencia nova");
static_assert(rollover(), "Subtracao uint32 suporta millis rollover");
static_assert(pulsoContinuo(), "Leituras continuas nao provocam alerta");
