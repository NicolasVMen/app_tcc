#define ESCOLTA_TESTE_KALMAN_K2 1
// Reexecuta todos os testes de filtro/tempo/frescor/ACK de K1 com o limiar novo.
#include "test-proximity-kalman-k1.cpp"
constexpr bool intermediarioSemVermelho(int rssi) {
  Monitor m;
  for (uint32_t t = 0; t <= 60000; t += 500) {
    m.receber(rssi, t);
    if (m.estado() == PERIGO) return false;
  }
  return m.estado() == ATENCAO;
}
static_assert(intermediarioSemVermelho(-85), "K2 -85 sustentado fica amarelo, nao vermelho");
static_assert(intermediarioSemVermelho(-89), "K2 -89 sustentado fica amarelo, nao vermelho");
static_assert(confirmaDepois(-90, PERIGO), "K2 -90 confirma perigo sem alongar 4 s");
