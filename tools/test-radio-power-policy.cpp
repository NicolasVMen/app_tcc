#include "../firmware/xiao_escolta_ble/RadioPowerPolicy.h"
using namespace EnsaioPotencia;
static_assert(ALVO_DBM == 4, "Fixed isolated target");
static_assert(podeAplicar(0, 0), "Baseline controller reading accepted");
static_assert(podeAplicar(0, -40) && podeAplicar(0, 8), "Hardware reading boundaries");
static_assert(!podeAplicar(1, 0), "Failed current query never authorizes a write");
static_assert(!podeAplicar(0, 20), "Generic maximum not accepted as actual power");
static_assert(!podeAplicar(0, -41), "Invalid current reading rejected");
static_assert(aplicado(0, 0, 4), "Write and readback required");
static_assert(!aplicado(1, 0, 4), "Failed write not treated as successful");
static_assert(!aplicado(0, 1, 4), "Failed read not treated as successful");
static_assert(!aplicado(0, 0, 0), "Unchanged baseline does not count as +4");
static_assert(precisaRetornar(1, 0, 0), "Unconfirmed reading attempts rollback");
static_assert(precisaRetornar(0, 4, 0), "Unverified change attempts rollback");
static_assert(!precisaRetornar(0, 0, 0), "Already at previous power needs no write");
