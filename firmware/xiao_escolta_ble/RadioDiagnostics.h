#ifndef ESCOLTA_RADIO_DIAGNOSTICS_H
#define ESCOLTA_RADIO_DIAGNOSTICS_H

// Opt-in, read-only instrumentation for the installed Seeeduino Mbed 2.9.3
// Cordio controller. No radio configuration or safety-state changes here.
#if defined(ESCOLTA_TESTE_DIAGNOSTICO_RADIO)
#if !defined(ARDUINO_ARCH_MBED) || !defined(ESCOLTA_TESTE_CONFIRMACAO_PROXIMA)
#error "Radio diagnostics require the Mbed XIAO p5 test profile"
#endif

#include <mbed.h>
#include <utility/ATT.h>
#include "RadioDiagnosticAddress.h"

// These signatures were checked against this core's ll_api.h and its ELF.
extern "C" {
uint8_t LlGetTxPowerLevel(uint16_t handle, uint8_t type, int8_t* level);
uint8_t LlReadPhy(uint16_t handle, uint8_t* txPhy, uint8_t* rxPhy);
uint8_t LlGetAdvTxPower(int8_t* level);
}

namespace DiagnosticoRadio {
#if defined(ESCOLTA_TESTE_RADIO_TX_DBM)
#if defined(ESCOLTA_TESTE_RADIO_DIAGNOSTICO_PERIODICO)
constexpr const char* BUILD_LABEL = "p5-radio4-periodic";
#else
constexpr const char* BUILD_LABEL = "p5-radio4";
#endif
#else
constexpr const char* BUILD_LABEL = "p5-readonly";
#endif
inline uint16_t connectionHandle(const String& address) {
  const Address decoded = decodeAddress(address.c_str(), address.length());
  if (!decoded.valid) return 0xffff;
  // Resolve an existing peer only; never assume that its handle is zero.
  for (uint8_t type = 0; type < 4; type++) {
    uint16_t handle = ATT.connectionHandle(type, decoded.bytes);
    if (handle != 0xffff) return handle;
  }
  return 0xffff;
}

inline void value(const char* name, uint8_t status, int result) {
  Serial.print(name);
  if (status == 0) Serial.print(result);
  else Serial.print("unavailable");
}

inline void poll(bool connected) {
  static bool reported = false;
  static uint32_t lastReport = 0;
  if (!connected) { reported = false; lastReport = 0; return; }
  if (!Serial) return;
  if (reported) {
#if defined(ESCOLTA_TESTE_RADIO_DIAGNOSTICO_PERIODICO)
    if (uint32_t(millis() - lastReport) < 5000UL) return;
#else
    return;
#endif
  }
  lastReport = millis();
  reported = true;
  BLEDevice central = BLE.central();
  uint16_t handle = central ? connectionHandle(central.address()) : 0xffff;
  if (handle == 0xffff) {
    Serial.print("[RADIO_DIAG] build="); Serial.print(BUILD_LABEL);
    Serial.println(" handle=unavailable");
    return;
  }
  int8_t current = 0, maximum = 0, advertising = 0;
  uint8_t txPhy = 0, rxPhy = 0;
  uint8_t currentStatus, maximumStatus, phyStatus, advertisingStatus;
  {
    // Short non-blocking reads, protected against controller IRQ/thread updates.
    // Never print, poll HCI or wait for a command while interrupts are masked.
    mbed::CriticalSectionLock lock;
    currentStatus = LlGetTxPowerLevel(handle, 0, &current);
    maximumStatus = LlGetTxPowerLevel(handle, 1, &maximum);
    phyStatus = LlReadPhy(handle, &txPhy, &rxPhy);
    advertisingStatus = LlGetAdvTxPower(&advertising);
  }
  Serial.print("[RADIO_DIAG] build="); Serial.print(BUILD_LABEL);
  Serial.print(" uptime_ms="); Serial.print(millis());
  Serial.print(" handle="); Serial.print(handle);
  Serial.print(" tx_status="); Serial.print(currentStatus);
  value(" tx_dbm=", currentStatus, current);
  Serial.print(" max_status="); Serial.print(maximumStatus);
  value(" max_dbm=", maximumStatus, maximum);
  Serial.print(" phy_status="); Serial.print(phyStatus);
  value(" tx_phy=", phyStatus, txPhy);
  value(" rx_phy=", phyStatus, rxPhy);
  Serial.print(" adv_status="); Serial.print(advertisingStatus);
  value(" adv_dbm=", advertisingStatus, advertising);
  Serial.println();
}
}
#endif
#endif
