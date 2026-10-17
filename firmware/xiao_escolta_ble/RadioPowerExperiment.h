#ifndef ESCOLTA_RADIO_POWER_EXPERIMENT_H
#define ESCOLTA_RADIO_POWER_EXPERIMENT_H
#if defined(ESCOLTA_TESTE_RADIO_TX_DBM)
#if !defined(ESCOLTA_TESTE_DIAGNOSTICO_RADIO) || !defined(ESCOLTA_TESTE_CONFIRMACAO_PROXIMA)
#error "Radio power experiment requires the diagnostic p5 test build"
#endif
#include "RadioDiagnostics.h"
#include "RadioPowerPolicy.h"
static_assert(ESCOLTA_TESTE_RADIO_TX_DBM == EnsaioPotencia::ALVO_DBM,
  "Only the isolated +4 dBm experiment is supported; not the generic stack maximum");
extern "C" uint8_t LlSetAllPhyTxPowerLevel(uint16_t handle, int8_t level);

namespace EnsaioPotencia {
struct Session {
  bool attempted = false;
  bool accepted = false;
  uint16_t handle = 0xffff;
  uint32_t started = 0;
  uint8_t checkpoints = 0;
};
inline Session& session() { static Session value; return value; }
inline void resetSession() { session() = Session{}; }
inline void poll(bool connected) {
  Session& state = session();
  bool& attempted = state.attempted;
  bool& accepted = state.accepted;
  uint16_t& activeHandle = state.handle;
  uint32_t& started = state.started;
  uint8_t& checkpoints = state.checkpoints;
  if (!connected) {
    resetSession();
    return;
  }
  if (!attempted) {
    BLEDevice central = BLE.central();
    uint16_t handle = central ? DiagnosticoRadio::connectionHandle(central.address()) : 0xffff;
    if (handle == 0xffff) return;
    attempted = true;
    int8_t previous = 0, actual = 0, restored = 0;
    uint8_t beforeStatus, setStatus = 0xff, readStatus = 0xff;
    uint8_t rollbackStatus = 0xff, restoreReadStatus = 0xff;
    {
      mbed::CriticalSectionLock lock;
      beforeStatus = LlGetTxPowerLevel(handle, 0, &previous);
      if (podeAplicar(beforeStatus, previous)) {
        setStatus = LlSetAllPhyTxPowerLevel(handle, ALVO_DBM);
        readStatus = LlGetTxPowerLevel(handle, 0, &actual);
        accepted = aplicado(setStatus, readStatus, actual);
        if (!accepted && precisaRetornar(readStatus, actual, previous)) {
          rollbackStatus = LlSetAllPhyTxPowerLevel(handle, previous);
          restoreReadStatus = LlGetTxPowerLevel(handle, 0, &restored);
        }
      }
    }
    activeHandle = handle;
    started = millis();
    if (Serial) {
      Serial.print("[RADIO_POWER] profile=p5-r4 handle="); Serial.print(handle);
      Serial.print(" before_status="); Serial.print(beforeStatus);
      DiagnosticoRadio::value(" before_dbm=", beforeStatus, previous);
      Serial.print(" requested_dbm="); Serial.print(ALVO_DBM);
      Serial.print(" set_status="); Serial.print(setStatus);
      Serial.print(" read_status="); Serial.print(readStatus);
      DiagnosticoRadio::value(" actual_dbm=", readStatus, actual);
      Serial.print(" applied="); Serial.print(accepted ? "true" : "false");
      if (rollbackStatus != 0xff) {
        Serial.print(" rollback_status="); Serial.print(rollbackStatus);
        Serial.print(" restore_read_status="); Serial.print(restoreReadStatus);
        DiagnosticoRadio::value(" restored_dbm=", restoreReadStatus, restored);
      }
      Serial.println();
    }
    return;
  }
  // Verify persistence twice without adaptively increasing power or touching PHY.
  if (!accepted || checkpoints >= 2 || uint32_t(millis() - started) < (checkpoints + 1) * 1500UL) return;
  int8_t current = 0;
  uint8_t status;
  {
    mbed::CriticalSectionLock lock;
    status = LlGetTxPowerLevel(activeHandle, 0, &current);
  }
  checkpoints++;
  if (Serial) {
    Serial.print("[RADIO_POWER_VERIFY] profile=p5-r4 checkpoint="); Serial.print(checkpoints);
    Serial.print(" read_status="); Serial.print(status);
    DiagnosticoRadio::value(" actual_dbm=", status, current);
    Serial.print(" retained="); Serial.println(status == 0 && current == ALVO_DBM ? "true" : "false");
  }
}
}
#endif
#endif
