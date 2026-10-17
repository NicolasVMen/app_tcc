#define ESCOLTA_TESTE_PROXIMIDADE_4DB 1
#include "../firmware/xiao_escolta_ble/ProximitySignal.h"
using namespace Proximidade;

constexpr bool exigeJanelaCompleta() {
  Monitor m;
  if (m.podeConfirmarSeguranca(0)) return false;
  for (uint32_t t = 0; t < 2000; t += 500) {
    m.receber(-69, t);
    if (m.podeConfirmarSeguranca(t)) return false;
  }
  m.receber(-69, 2000);
  return m.podeConfirmarSeguranca(2000);
}
static_assert(exigeJanelaCompleta(), "Sem leituras completas nao aceita confirmacao");

constexpr bool rejeitaLeituraAntiga() {
  Monitor m;
  for (uint32_t t = 0; t <= 2000; t += 500) m.receber(-69, t);
  return m.podeConfirmarSeguranca(4500) && !m.podeConfirmarSeguranca(4501);
}
static_assert(rejeitaLeituraAntiga(), "Dados antigos nao aprovam proximidade");

constexpr bool rejeitaSinalFraco() {
  Monitor m;
  for (uint32_t t = 0; t <= 20000; t += 500) {
    m.receber(-94, t);
    if (m.podeConfirmarSeguranca(t)) return false;
  }
  return m.estado() == PERIGO;
}
static_assert(rejeitaSinalFraco(), "Distante continua sem permissao para reset");

constexpr bool recuperacaoRealSemApagarFiltro() {
  Monitor m;
  for (uint32_t t = 0; t <= 10000; t += 500) m.receber(-94, t);
  m.receber(-69, 10500);
  if (m.podeConfirmarSeguranca(10500)) return false;
  for (uint32_t t = 11000; t <= 30000; t += 500) m.receber(-69, t);
  const float antes = m.sinal();
  const bool permitida = m.podeConfirmarSeguranca(30000);
  return permitida && m.estado() == SEGURO && m.temLeitura() && m.sinal() == antes;
}
static_assert(recuperacaoRealSemApagarFiltro(), "Voltar de verdade a faixa segura libera sem resetar leituras");

constexpr bool ultimoValorFracoBloqueia() {
  Monitor m;
  for (uint32_t t = 0; t <= 5000; t += 500) m.receber(-69, t);
  if (!m.podeConfirmarSeguranca(5000)) return false;
  m.receber(-94, 5500);
  return !m.podeConfirmarSeguranca(5500);
}
static_assert(ultimoValorFracoBloqueia(), "Mediana ainda forte nao oculta ultimo sinal fraco");

constexpr bool reconexaoPrecisaNovasLeituras() {
  Monitor m;
  for (uint32_t t = 0; t <= 5000; t += 500) m.receber(-69, t);
  m.resetLeituras();
  return !m.podeConfirmarSeguranca(5500);
}
static_assert(reconexaoPrecisaNovasLeituras(), "Reconexao nao reutiliza prova antiga");

constexpr bool amareloNaoConfirma() {
  Monitor m;
  for (uint32_t t = 0; t <= 10000; t += 500) m.receber(-84, t);
  return m.estado() == ATENCAO && !m.podeConfirmarSeguranca(10000);
}
static_assert(amareloNaoConfirma(), "Atencao nao vira seguro pelo comando");

constexpr bool overflowRecente() {
  Monitor m;
  const uint32_t inicio = UINT32_MAX - 1000;
  for (uint32_t dt = 0; dt <= 5000; dt += 500) m.receber(-69, inicio + dt);
  return m.podeConfirmarSeguranca(inicio + 5000) && !m.podeConfirmarSeguranca(inicio + 8000);
}
static_assert(overflowRecente(), "Frescor tolera overflow de millis");
