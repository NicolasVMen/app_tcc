const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sketch = fs.readFileSync(path.resolve(__dirname, '../firmware/xiao_escolta_ble/xiao_escolta_ble.ino'), 'utf8');

test('ADC 40 us: opt-in restrito ao teste p5-r4 e core com API de aquisição', () => {
  assert.match(sketch, /ESCOLTA_TESTE_BATERIA_AQUISICAO_40US != 1/);
  for (const macro of ['ARDUINO_ARCH_MBED', 'ANALOG_CONFIG', 'ESCOLTA_TESTE_CONFIRMACAO_PROXIMA', 'ESCOLTA_TESTE_RADIO_TX_DBM']) {
    assert.ok(sketch.includes(`!defined(${macro})`));
  }
  assert.match(sketch, /static_assert\(ESCOLTA_TESTE_RADIO_TX_DBM == 4,/);
  assert.doesNotMatch(sketch, /#define\s+ESCOLTA_TESTE_BATERIA_AQUISICAO_40US/);
});

test('ADC 40 us: configuração após referência e antes da primeira leitura, ausente no padrão', () => {
  assert.match(sketch, /analogReference\(AR_INTERNAL2V4\);\s+#if defined\(ESCOLTA_TESTE_BATERIA_AQUISICAO_40US\)\s+\/\/[^\n]*\n\s+analogAcquisitionTime\(AT_40_US\);\s+#endif\s+atualizarLeituraBateria\(\);/);
  assert.equal((sketch.match(/analogAcquisitionTime\(/g) || []).length, 1);
});

test('ADC 40 us: mantém carga, divisor, referência, faixa baixa e suavização', () => {
  assert.match(sketch, /pinMode\(PINO_CORRENTE_CARGA, INPUT\);/);
  assert.doesNotMatch(sketch, /digitalWrite\(PINO_CORRENTE_CARGA,/);
  assert.match(sketch, /const uint8_t amostras = 16;/);
  assert.match(sketch, /mediaAdc \* 2\.4f \/ 4095\.0f/);
  assert.match(sketch, /tensaoAdc \* \(1510\.0f \/ 510\.0f\)/);
  assert.match(sketch, /tensaoBateria = 0\.20f \* novaTensao \+ 0\.80f \* tensaoBateria/);
  assert.match(sketch, /3\.98f, 4\.08f, tensaoTopo/);
  assert.match(sketch, /#else\s+const float tensaoTopo = 4\.20f;/);
  assert.match(sketch, /percentualBateria = min\(100, \(\(percentualCalculado \+ 2\) \/ 5\) \* 5\)/);
});

// Simula numericamente a tabela extraída do firmware; não substitui ensaio
// físico de capacidade ou exatidão do ADC.
function batteryEstimate(volts, testProfile) {
  const top = sketch.match(/#if defined\(ESCOLTA_TESTE_BATERIA_TOPO_4100MV\)[\s\S]*?const float tensaoTopo = ([\d.]+)f;\s+#else\s+const float tensaoTopo = ([\d.]+)f;/);
  assert.ok(top);
  const voltages = sketch.match(/const float tensoes\[\] = \{([^}]+)\}/)[1]
    .split(',').map(value => value.trim() === 'tensaoTopo'
      ? Number(top[testProfile ? 1 : 2]) : Number(value.trim().replace(/f$/, '')));
  const percentages = sketch.match(/const uint8_t percentuais\[\] = \{([^}]+)\}/)[1]
    .split(',').map(Number);
  let result = 100;
  if (volts <= voltages[0]) result = 0;
  else if (volts < voltages.at(-1)) {
    for (let i = 1; i < voltages.length; i++) {
      if (volts <= voltages[i]) {
        result = Math.round(percentages[i - 1] + (volts - voltages[i - 1])
          / (voltages[i] - voltages[i - 1]) * (percentages[i] - percentages[i - 1]));
        break;
      }
    }
  }
  return Math.min(100, Math.floor((result + 2) / 5) * 5);
}

test('topo visual 4,10 V: isolado, preserva padrão e não declara fim de carga', () => {
  assert.match(sketch, /ESCOLTA_TESTE_BATERIA_TOPO_4100MV != 1 \|\| !defined\(ESCOLTA_TESTE_BATERIA_AQUISICAO_40US\)/);
  assert.doesNotMatch(sketch, /#define\s+ESCOLTA_TESTE_BATERIA_TOPO_4100MV/);
  for (const volts of [4.10, 4.13, 4.15, 4.20]) assert.equal(batteryEstimate(volts, true), 100);
  assert.equal(batteryEstimate(4.09, true), 95);
  assert.equal(batteryEstimate(4.13, false), 95);
  assert.equal(batteryEstimate(4.20, false), 100);
  assert.match(sketch, /bateriaCarregando = usbConectado && digitalRead\(PINO_STATUS_CARGA\) == LOW;/);
});

test('topo visual: faixa até 4,08 V e alertas baixos preservados, curva monotônica', () => {
  for (let millivolts = 2500; millivolts <= 4080; millivolts++) {
    assert.equal(batteryEstimate(millivolts / 1000, true), batteryEstimate(millivolts / 1000, false));
  }
  for (const [volts, expected] of [[3.30, 0], [3.50, 5], [3.60, 10], [3.70, 20], [4.08, 90]]) {
    assert.equal(batteryEstimate(volts, true), expected);
  }
  let previous = 0;
  for (let millivolts = 2500; millivolts <= 4400; millivolts++) {
    const current = batteryEstimate(millivolts / 1000, true);
    assert.ok(current >= previous && current <= 100);
    previous = current;
  }
  const monitor = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useEsp32Monitor.ts'), 'utf8');
  assert.match(monitor, /batteryPercent <= 10 \? 10 : batteryPercent <= 20 \? 20 : 0/);
});

test('ADC 40 us: diagnóstico opt-in condicionado ao USB, sem alteração de estado', () => {
  const diagnostic = sketch.match(/#if defined\(ESCOLTA_TESTE_BATERIA_AQUISICAO_40US\)\s+\/\/ Apenas com monitor USB aberto;([\s\S]*?)#endif/)?.[1];
  assert.ok(diagnostic);
  assert.match(diagnostic, /if \(Serial\)/);
  assert.match(diagnostic, /profile=p5-r4-adc40 requested_us=40 adc_mean=/);
  assert.doesNotMatch(diagnostic, /digitalWrite|analogRead|modoPanico\s*=|rssiFiltrado\s*=|LlSet/);
});
