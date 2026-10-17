#ifndef ESCOLTA_RADIO_DIAGNOSTIC_ADDRESS_H
#define ESCOLTA_RADIO_DIAGNOSTIC_ADDRESS_H
#include <stddef.h>
#include <stdint.h>

namespace DiagnosticoRadio {
constexpr int hexDigit(char value) {
  return value >= '0' && value <= '9' ? value - '0'
    : value >= 'a' && value <= 'f' ? value - 'a' + 10
    : value >= 'A' && value <= 'F' ? value - 'A' + 10 : -1;
}
struct Address {
  bool valid;
  uint8_t bytes[6];
};
constexpr Address decodeAddress(const char* address, size_t length) {
  Address result = {false, {}};
  if (!address || length != 17) return result;
  for (uint8_t i = 0; i < 6; i++) {
    int high = hexDigit(address[i * 3]);
    int low = hexDigit(address[i * 3 + 1]);
    if (high < 0 || low < 0 || (i < 5 && address[i * 3 + 2] != ':')) return result;
    result.bytes[5 - i] = uint8_t(high * 16 + low);
  }
  result.valid = true;
  return result;
}
}
#endif
