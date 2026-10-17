const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const radio = fs.readFileSync(path.join(root, 'firmware/xiao_escolta_ble/RadioDiagnostics.h'), 'utf8');
const sketch = fs.readFileSync(path.join(root, 'firmware/xiao_escolta_ble/xiao_escolta_ble.ino'), 'utf8');
const power = fs.readFileSync(path.join(root, 'firmware/xiao_escolta_ble/RadioPowerExperiment.h'), 'utf8');

test('contrato do diagnóstico: opt-in p5, sem configuração de rádio ou estado de proteção', () => {
  assert.match(radio, /#if defined\(ESCOLTA_TESTE_DIAGNOSTICO_RADIO\)/);
  assert.match(radio, /!defined\(ESCOLTA_TESTE_CONFIRMACAO_PROXIMA\)/);
  assert.doesNotMatch(radio, /\bLlSet\w*\s*\(|NRF_RADIO\s*->|resetLeituras\s*\(|resetarAlarme|modoPanico\s*=/);
  assert.match(sketch, /#if defined\(ESCOLTA_TESTE_DIAGNOSTICO_RADIO\)\s+DiagnosticoRadio::poll\(clienteConectado\);\s+#endif/);
});

test('ensaio de potencia: isolado em macro p5/radio4 e nao altera advertising, PHY ou filtros', () => {
  assert.match(power, /#if defined\(ESCOLTA_TESTE_RADIO_TX_DBM\)/);
  assert.match(power, /!defined\(ESCOLTA_TESTE_CONFIRMACAO_PROXIMA\)/);
  assert.match(power, /static_assert\(ESCOLTA_TESTE_RADIO_TX_DBM == EnsaioPotencia::ALVO_DBM/);
  assert.match(sketch, /VERSAO_FIRMWARE = "xiao-p5-r4"/);
  assert.doesNotMatch(power, /LlSetAdvTxPower\(|LlSetPhy\(|NRF_RADIO\s*->|rssiFiltrado\s*=|modoPanico\s*=/);
  const critical = [...power.matchAll(/mbed::CriticalSectionLock lock;([\s\S]*?)\n    ?\}/g)];
  assert.ok(critical.length > 0);
  for (const match of critical) assert.doesNotMatch(match[1], /Serial|\.poll\(|delay|sendCommand/);
});

test('ensaio de potencia: verifica retorno, leitura posterior, rollback e nova conexao', () => {
  assert.match(power, /beforeStatus = LlGetTxPowerLevel\(handle, 0, &previous\)/);
  assert.match(power, /if \(podeAplicar\(beforeStatus, previous\)\)/);
  assert.match(power, /accepted = aplicado\(setStatus, readStatus, actual\)/);
  assert.match(power, /if \(!accepted && precisaRetornar\(readStatus, actual, previous\)\)/);
  assert.match(power, /LlSetAllPhyTxPowerLevel\(handle, previous\)/);
  assert.match(power, /checkpoints >= 2/);
  assert.match(sketch, /void aoConectar[\s\S]*?EnsaioPotencia::resetSession\(\)/);
  assert.match(sketch, /void aoDesconectar[\s\S]*?EnsaioPotencia::resetSession\(\)/);
});

test('contrato do diagnóstico: consulta limitada, erros não viram potência zero', () => {
  assert.match(radio, /if \(!Serial\) return;/);
  assert.match(radio, /if \(!connected\) \{ reported = false; lastReport = 0; return; \}/);
  assert.match(radio, /if \(status == 0\) Serial.print\(result\);\s+else Serial.print\("unavailable"\)/);
  assert.match(radio, /ATT.connectionHandle\(type, decoded.bytes\)/);
  assert.match(radio, /if \(handle == 0xffff\)/);
});

test('diagnóstico periódico: opt-in, consulta só com USB aberto e sem reaplicar potência', () => {
  assert.match(radio, /#if defined\(ESCOLTA_TESTE_RADIO_DIAGNOSTICO_PERIODICO\)/);
  assert.match(radio, /uint32_t\(millis\(\) - lastReport\) < 5000UL/);
  assert.ok(radio.indexOf('if (!Serial) return;') < radio.indexOf('LlGetTxPowerLevel(handle'));
  assert.match(radio, /uptime_ms=/);
  assert.doesNotMatch(radio, /LlSet\w*\s*\(/);
});

test('contrato do diagnóstico: seção crítica não contém IO, HCI poll ou comando de configuração', () => {
  const critical = radio.match(/mbed::CriticalSectionLock lock;([\s\S]*?)\n  \}/)?.[1];
  assert.ok(critical);
  assert.doesNotMatch(critical, /Serial|\.poll\(|delay|sendCommand|LlSet/);
  assert.match(critical, /LlGetTxPowerLevel\(handle, 0, &current\)/);
  assert.match(critical, /LlGetTxPowerLevel\(handle, 1, &maximum\)/);
  assert.match(critical, /LlReadPhy\(handle, &txPhy, &rxPhy\)/);
});
