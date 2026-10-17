#include "../firmware/xiao_escolta_ble/RadioDiagnosticAddress.h"
using namespace DiagnosticoRadio;
constexpr Address sample = decodeAddress("01:23:45:67:89:ab", 17);
static_assert(sample.valid, "Valid displayed peer address");
static_assert(sample.bytes[0] == 0xab, "HCI low address byte first");
static_assert(sample.bytes[1] == 0x89 && sample.bytes[2] == 0x67, "Inner bytes preserved");
static_assert(sample.bytes[3] == 0x45 && sample.bytes[4] == 0x23, "Inner bytes preserved");
static_assert(sample.bytes[5] == 1, "High address byte last");
static_assert(decodeAddress("01:23:45:67:89:AB", 17).bytes[0] == 0xab, "Uppercase accepted");
static_assert(!decodeAddress(nullptr, 17).valid, "Null rejected");
static_assert(!decodeAddress("", 0).valid, "Empty rejected without reading");
static_assert(!decodeAddress("01:23:45:67:89:ab", 16).valid, "Truncated rejected");
static_assert(!decodeAddress("01:23:45:67:89:abx", 18).valid, "Trailing bytes rejected");
static_assert(!decodeAddress("01-23:45:67:89:ab", 17).valid, "Bad separator rejected");
static_assert(!decodeAddress("g1:23:45:67:89:ab", 17).valid, "Bad high nibble rejected");
static_assert(!decodeAddress("01:23:45:67:89:aX", 17).valid, "Bad last nibble rejected");
static_assert(decodeAddress("00:00:00:00:00:00", 17).valid, "Zero bytes not confused with missing handle");
static_assert(hexDigit('F') == 15 && hexDigit('f') == 15 && hexDigit('0') == 0, "Hex decoding");
static_assert(hexDigit('/') == -1 && hexDigit(':') == -1, "Nonhex rejected");
