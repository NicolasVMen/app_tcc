#ifndef ESCOLTA_PROXIMITY_SIGNAL_H
#define ESCOLTA_PROXIMITY_SIGNAL_H

#include <stdint.h>

#if defined(ESCOLTA_TESTE_KALMAN_K2)
#if ESCOLTA_TESTE_KALMAN_K2 != 1 || !defined(ESCOLTA_TESTE_KALMAN_K1)
#error "K2 requer opt-in explicito junto de K1; altera somente o limiar vermelho"
#endif
#endif

#if defined(ESCOLTA_TESTE_KALMAN_K1)
#if ESCOLTA_TESTE_KALMAN_K1 != 1 || !defined(ESCOLTA_TESTE_PROXIMIDADE_4DB) || !defined(ESCOLTA_TESTE_CONFIRMACAO_PROXIMA) || !defined(ESCOLTA_TESTE_DISTANCIA_RADIO4) || !defined(ESCOLTA_TESTE_RADIO_TX_DBM)
#error "K1 requer opt-in explicito na variante de teste p5/radio4/D1"
#endif
static_assert(ESCOLTA_TESTE_RADIO_TX_DBM == 4, "K1 preserva potencia solicitada +4 dBm");
#endif

// Sem dependência de Arduino/BLE: a mesma lógica é verificada nos testes C++.
namespace Proximidade {
enum Estado { SEGURO, ATENCAO, PERIGO };

#if defined(ESCOLTA_TESTE_KALMAN_K1)
// Candidato experimental 3/5 m. Limites de sinal, não medidas físicas garantidas.
constexpr int ATENCAO_ENTRA = -77;
constexpr int ATENCAO_SAI = -72;
#if defined(ESCOLTA_TESTE_KALMAN_K2)
constexpr int PERIGO_ENTRA = -90;
constexpr int PERIGO_SAI = -86;
#else
constexpr int PERIGO_ENTRA = -85;
constexpr int PERIGO_SAI = -81;
#endif
constexpr uint32_t ATENCAO_MS = 4000;
constexpr uint32_t PERIGO_MS = 4000;
constexpr float KALMAN_Q_POR_SEGUNDO = 1.0f;
constexpr float KALMAN_R = 4.0f;
#elif defined(ESCOLTA_TESTE_PROXIMIDADE_4DB)
// Segundo ajuste experimental: -82/-90 dBm, 4 s de confirmação.
constexpr int ATENCAO_ENTRA = -82;
constexpr int ATENCAO_SAI = -77;
constexpr int PERIGO_ENTRA = -90;
constexpr int PERIGO_SAI = -86;
constexpr uint32_t ATENCAO_MS = 4000;
constexpr uint32_t PERIGO_MS = 4000;
#elif defined(ESCOLTA_TESTE_PROXIMIDADE_6DB)
// Perfil solicitado para teste: sinal 6 dB mais fraco, confirmação de 5 s.
// Mantém a largura das margens de retorno (5 dB no amarelo, 4 dB no perigo).
constexpr int ATENCAO_ENTRA = -84;
constexpr int ATENCAO_SAI = -79;
constexpr int PERIGO_ENTRA = -92;
constexpr int PERIGO_SAI = -88;
constexpr uint32_t ATENCAO_MS = 5000;
constexpr uint32_t PERIGO_MS = 5000;
#else
constexpr int ATENCAO_ENTRA = -78;
constexpr int ATENCAO_SAI = -73;
constexpr int PERIGO_ENTRA = -86;
constexpr int PERIGO_SAI = -82;
constexpr uint32_t ATENCAO_MS = 4000;
constexpr uint32_t PERIGO_MS = 8000;
#endif
constexpr uint32_t RETORNO_MS = 2000;
constexpr uint32_t MAX_LACUNA_MS = 2500;
constexpr uint8_t JANELA = 5;
constexpr float ALFA = 0.30f;

constexpr uint16_t periodoBuzzer(bool ativo, bool panico, bool som, Estado estado) {
  return !ativo ? 0 : panico ? 150 : som && estado == ATENCAO ? 600 : 0;
}

constexpr Estado alvoHisterese(Estado atual, float rssi) {
  return atual == SEGURO
    ? (rssi <= PERIGO_ENTRA ? PERIGO : rssi <= ATENCAO_ENTRA ? ATENCAO : SEGURO)
    : atual == ATENCAO
      ? (rssi <= PERIGO_ENTRA ? PERIGO : rssi > ATENCAO_SAI ? SEGURO : ATENCAO)
      : (rssi > PERIGO_SAI ? ATENCAO : PERIGO);
}

class Monitor {
 public:
  constexpr Monitor()
    : janela{}, quantidade(0), indice(0), iniciado(false), filtrado(-50.0f),
      ultimoCru(-50), ultimoInstante(0), atual(SEGURO), candidato(SEGURO),
      desde(0), amostrasCandidato(0)
#if defined(ESCOLTA_TESTE_KALMAN_K1)
      , varianciaKalman(KALMAN_R)
#endif
      {}

  constexpr void resetLeituras() {
    quantidade = 0;
    indice = 0;
    iniciado = false;
    filtrado = -50.0f;
    ultimoCru = -50;
#if defined(ESCOLTA_TESTE_KALMAN_K1)
    varianciaKalman = KALMAN_R;
#endif
    cancelarCandidato();
  }

  constexpr void reset() {
    atual = SEGURO;
    resetLeituras();
  }

  constexpr bool receber(int rssi, uint32_t agora) {
    // 0 e -127 são sentinelas, não distância real.
    if (rssi < -126 || rssi >= 0) return false;
    if (iniciado && uint32_t(agora - ultimoInstante) > MAX_LACUNA_MS) {
      // Tempo sem leitura não é evidência de afastamento sustentado.
      resetLeituras();
    }
#if defined(ESCOLTA_TESTE_KALMAN_K1)
    // Intervalo real entre leituras; Q não é aplicado como se toda leitura fosse 1 s.
    const uint32_t intervaloMs = iniciado ? uint32_t(agora - ultimoInstante) : 0;
#endif
    ultimoInstante = agora;
    ultimoCru = rssi;
    janela[indice] = rssi;
    indice = (indice + 1) % JANELA;
    if (quantidade < JANELA) quantidade++;

#if defined(ESCOLTA_TESTE_KALMAN_K1)
    if (!iniciado) {
      filtrado = float(rssi);
    } else {
      varianciaKalman += KALMAN_Q_POR_SEGUNDO * (float(intervaloMs) / 1000.0f);
      const float ganho = varianciaKalman / (varianciaKalman + KALMAN_R);
      filtrado += ganho * (float(rssi) - filtrado);
      varianciaKalman *= 1.0f - ganho;
    }
#else
    int ordenados[JANELA] = {};
    for (uint8_t i = 0; i < quantidade; i++) ordenados[i] = janela[i];
    for (uint8_t i = 1; i < quantidade; i++) {
      int valor = ordenados[i];
      uint8_t j = i;
      while (j > 0 && ordenados[j - 1] > valor) {
        ordenados[j] = ordenados[j - 1];
        j--;
      }
      ordenados[j] = valor;
    }
    float mediana = quantidade % 2
      ? float(ordenados[quantidade / 2])
      : (ordenados[quantidade / 2 - 1] + ordenados[quantidade / 2]) / 2.0f;
    filtrado = iniciado ? ALFA * mediana + (1.0f - ALFA) * filtrado : mediana;
#endif
    iniciado = true;

    // Não decide com uma primeira leitura isolada após conexão/reset/lacuna.
    if (quantidade < JANELA) return true;
    Estado alvo = alvoHisterese(atual, filtrado);
    if (alvo == atual) {
      cancelarCandidato();
      return true;
    }
    if (amostrasCandidato == 0 || candidato != alvo) {
      candidato = alvo;
      desde = agora;
      amostrasCandidato = 1;
    } else if (amostrasCandidato < 255) {
      amostrasCandidato++;
    }
    uint32_t espera = candidato == PERIGO ? PERIGO_MS
      : candidato == SEGURO || atual == PERIGO ? RETORNO_MS : ATENCAO_MS;
    if (amostrasCandidato >= 3 && uint32_t(agora - desde) >= espera) {
      atual = candidato;
      cancelarCandidato();
    }
    return true;
  }

  constexpr bool temLeitura() const { return iniciado; }
  constexpr bool leituraRecente(uint32_t agora) const {
    return iniciado && uint32_t(agora - ultimoInstante) <= MAX_LACUNA_MS;
  }
  constexpr float sinal() const { return filtrado; }
  constexpr int bruto() const { return ultimoCru; }
  constexpr Estado estado() const { return atual; }
  constexpr bool podeConfirmarSeguranca(uint32_t agora) const {
    return leituraRecente(agora) && quantidade == JANELA && atual == SEGURO
      && candidato == SEGURO && filtrado > ATENCAO_ENTRA && ultimoCru > ATENCAO_ENTRA;
  }

 private:
  int janela[JANELA];
  uint8_t quantidade, indice;
  bool iniciado;
  float filtrado;
  int ultimoCru;
  uint32_t ultimoInstante;
  Estado atual, candidato;
  uint32_t desde;
  uint8_t amostrasCandidato;
#if defined(ESCOLTA_TESTE_KALMAN_K1)
  float varianciaKalman;
#endif

  constexpr void cancelarCandidato() {
    candidato = atual;
    amostrasCandidato = 0;
    desde = 0;
  }
};
}  // namespace Proximidade
#endif
