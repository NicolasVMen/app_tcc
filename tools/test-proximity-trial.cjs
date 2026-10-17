// Sem dependências novas: executa as funções TypeScript com o compilador local.
// Uso: node --test tools/test-proximity-trial.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const filename = path.join(__dirname, '../src/utils/proximityTrial.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context, { filename });
const api = context.exports;
const start = 1800000000000;
const packet = (id = 1, time = start + 10000, overrides = {}) => ({
  receivedAt: time, readAt: time - 100, sampleId: id, phoneRssi: -65,
  rawRssi: -64, filteredRssi: -66, estimatedM: 2, state: 'seguro',
  panic: false, active: true, ...overrides,
});

test('rejeita RSSI inválido, sentinelas e dados antigos', () => {
  for (const value of [0, 127, -127, NaN, Infinity, null, '-65']) assert.equal(api.validRssi(value), false);
  assert.equal(api.validRssi(-65), true);
  assert.equal(api.isFreshPacket(packet(), start + 10000), true);
  assert.equal(api.isFreshPacket(packet(), start + 13000), false);
  assert.equal(api.isFreshPacket(packet(1, start + 10000, { readAt: start }), start + 10000), false);
});

test('aguarda estabilização e aceita apenas novas leituras espaçadas', () => {
  const initial = api.createTrial(1, 'sala', start);
  assert.equal(api.appendTrialPacket(initial, packet(1, start + 5000)), initial);
  const first = api.appendTrialPacket(initial, packet(1, start + 10100));
  assert.equal(first.samples.length, 1);
  assert.equal(api.appendTrialPacket(first, packet(1, start + 11100)), first);
  assert.equal(api.appendTrialPacket(first, packet(2, start + 10200)), first);
  assert.equal(api.appendTrialPacket(first, packet(2, start + 11100, { active: false })), first);
});

test('conclui exatamente 30, sem acrescentar amostra após o término', () => {
  let run = api.createTrial(1, 'sala', start);
  for (let i = 0; i < 30; i++) run = api.appendTrialPacket(run, packet(i + 1, start + 10100 + i * 1000));
  assert.equal(run.samples.length, 30);
  assert.equal(run.stopReason, 'concluído');
  assert.equal(api.appendTrialPacket(run, packet(31, start + 40100)), run);
  assert.equal(api.isStoredTrial(run), true);
});

test('permite iniciar em alerta e concluir 30 amostras, inclusive o ensaio seguinte', () => {
  const ready = { loaded: true, connected: true, standby: false, foreground: true, collecting: false };
  const initialPacket = packet(1, start, { state: 'panico', panic: true });
  assert.equal(api.canStartTrial({ ...ready, packet: initialPacket, now: start }), true);
  let run = api.createTrial(5, 'caixa fixa; celular na marca', start);
  for (let i = 0; i < 30; i++) {
    run = api.appendTrialPacket(run, packet(i + 2, start + 10100 + i * 1000,
      { state: i < 10 ? 'atencao' : 'panico', panic: i >= 10 }));
  }
  assert.equal(run.samples.length, 30);
  assert.equal(run.stopReason, 'concluído');
  assert.equal(api.summarizeTrial(run).panicSamples, 20);
  const nextPacket = packet(32, start + 41000, { state: 'panico', panic: true });
  assert.equal(api.canStartTrial({ ...ready, packet: nextPacket, now: nextPacket.receivedAt }), true);
  const nextRun = api.createTrial(6, 'próximo metro; sem reset do alerta', nextPacket.receivedAt);
  const measured = api.appendTrialPacket(nextRun, packet(33, start + 51100, { state: 'panico', panic: true }));
  assert.equal(measured.samples.length, 1);
});

test('ensaio continua indisponível sem vínculo, em espera ou sem leitura nova', () => {
  const ready = { loaded: true, connected: true, standby: false, foreground: true,
    collecting: false, packet: packet(1, start), now: start };
  assert.equal(api.canStartTrial(ready), true);
  for (const change of [{ loaded: false }, { connected: false }, { standby: true },
    { foreground: false }, { collecting: true }, { packet: null }, { now: start + 5000 },
    { packet: packet(1, start, { active: false }) }]) {
    assert.equal(api.canStartTrial({ ...ready, ...change }), false);
  }
});

test('lacuna não vira uma coleta completa silenciosamente', () => {
  let run = api.createTrial(1, 'sala', start);
  run = api.appendTrialPacket(run, packet(1, start + 10100));
  run = api.appendTrialPacket(run, packet(2, start + 16100));
  assert.equal(run.samples.length, 1);
  assert.match(run.stopReason, /lacuna/);
});

test('erro absoluto não cancela erro positivo com negativo', () => {
  let run = api.createTrial(2, 'sala', start);
  run = api.appendTrialPacket(run, packet(1, start + 10100, { estimatedM: 1, panic: true }));
  run = api.appendTrialPacket(run, packet(2, start + 11100, { estimatedM: 3, state: 'atencao' }));
  const summary = api.summarizeTrial(run);
  assert.equal(summary.estimated.mean, 2);
  assert.equal(summary.meanAbsoluteError, 1);
  assert.equal(summary.panicSamples, 1);
  assert.equal(summary.warningSamples, 1);
  assert.equal(api.statistics([]), null);
});

test('CSV conserva dados brutos, condição, incompletos e escapa fórmulas', () => {
  let run = api.createTrial(1, '=SUM(1;2) "nota"', start);
  run = api.appendTrialPacket(run, packet(1, start + 10100));
  run = { ...run, endedAt: start + 12000, stopReason: 'interrompido pelo usuário' };
  const csv = api.trialsToCsv([run]);
  assert.match(csv, /rssi_bruto_placa_dbm/);
  assert.match(csv, /interrompido pelo usuário/);
  assert.match(csv, /'=SUM\(1;2\) ""nota""/);
  assert.match(csv, /"-65"/);
  assert.equal(api.isStoredTrial({ ...run, samples: [{}] }), false);
  assert.throws(() => api.createTrial(0, '', start));
});

test('CSV conserva metadados também no ensaio interrompido antes da primeira amostra', () => {
  const metadata = { firmware: 'xiao-p2', phone: 'Galaxy S24 Ultra', platform: 'android 35', heightM: 1, app: '1.0.0' };
  const run = { ...api.createTrial(5, 'sala', start, metadata), endedAt: start + 1000, stopReason: 'interrompido' };
  const rows = api.trialsToCsv([run]).split('\r\n');
  assert.equal(rows[0].split(';').length, rows[1].split(';').length);
  assert.match(rows[1], /Galaxy S24 Ultra/);
  assert.match(rows[1], /xiao-p2/);
});
