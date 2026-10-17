// Conferência de contratos do código. Não prova comunicação física ou SDK remoto.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const read = file => fs.readFileSync(file, 'utf8');
const firmware = read('firmware/xiao_escolta_ble/xiao_escolta_ble.ino');
const ble = read('src/services/bleApi.ts');
const root = read('App.tsx');

test('contrato: nome e seis UUIDs BLE do frontend correspondem ao firmware salvo', () => {
  for (const name of ['SERVICE_UUID','CHAR_STATUS_UUID','CHAR_SOM_UUID','CHAR_RESET_UUID','CHAR_RSSI_UUID','CHAR_CONTROLE_UUID']) {
    const value = source => source.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)`))?.[1];
    assert.ok(value(ble), name);
    assert.equal(value(ble), value(firmware), name);
  }
  assert.match(firmware, /NOME_DISPOSITIVO\s*=\s*"ESCOLTA_BLE"/);
  assert.match(ble, /device\.name === 'ESCOLTA_BLE'/);
});

test('contrato: pausa/retomada possuem comandos e confirmação de telemetria compatíveis', () => {
  assert.match(ble, /active \? 'retomar' : 'pausar'/);
  assert.match(ble, /status => status\.monitoramento_ativo === active/);
  for (const command of ['pausar','retomar']) assert.match(firmware, new RegExp(`comando == "${command}"`));
  assert.match(firmware, /monitoramento_ativo/);
  assert.match(firmware, /escoltaAtivada = !emEspera/);
  assert.match(ble, /CHAR_RESET_UUID, 'reset', status => status\.panico_ativo === false && status\.estado === 'seguro'/);
  assert.match(firmware, /void aoEscreverReset[\s\S]*?restaurarEstadoSeguro\(\)/);
  const guardedReset = firmware.split('void aoEscreverReset')[1].split('#if defined(ESCOLTA_TESTE_CONFIRMACAO_PROXIMA)')[1].split('#else')[0];
  assert.ok(guardedReset.indexOf('podeConfirmarSeguranca(millis())') < guardedReset.indexOf('modoPanico = false'));
  assert.match(guardedReset, /ultimoRssiCru <= Proximidade::ATENCAO_ENTRA/);
  assert.doesNotMatch(guardedReset, /restaurarEstadoSeguro|monitorProximidade\.reset|rssiFiltrado\s*=/);
});

test('contrato: JSON de referência nos quatro estados é aceito pelo parser real e cabe em 244 bytes', () => {
  const c = { exports: {} };
  vm.runInNewContext(ts.transpileModule(read('src/utils/telemetry.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, c);
  const version = firmware.match(/VERSAO_FIRMWARE\s*=\s*"([^"]+)"/)?.[1];
  assert.ok(version);
  const keys = [...firmware.slice(firmware.indexOf('void enviarStatus()')).matchAll(/json \+= .*?\\"(\w+)\\"/g)].map(m => m[1]);
  const expectedKeys = ['rssi','rssi_raw','distancia_m','estado','som_on','monitoramento_ativo','panico_ativo','bateria_pct','bateria_v','carregando','usb_conectado','fw'];
  for (const key of expectedKeys) assert.ok(keys.includes(key), key);
  for (const estado of ['seguro','atencao','perigo','panico']) {
    for (const distancia_m of [null, 1.2, 9999.9]) {
      const value = { rssi:-126,rssi_raw:-126,distancia_m,estado,som_on:false,
        monitoramento_ativo:false,panico_ativo:false,bateria_pct:100,bateria_v:4.25,
        carregando:false,usb_conectado:false,fw:version };
      assert.equal(c.exports.validTelemetry(value), true);
      assert.ok(Buffer.byteLength(JSON.stringify(value)) <= 244, `${estado}: payload longo`);
    }
  }
  assert.match(firmware, /if \(json\.length\(\) > 244\)/);
});

test('contrato: rotas reais são Central/Protocolo/Registros/Sistema e ensaio atual, não PatrolScreen', () => {
  for (const screen of ['DashboardScreen','ManualScreen','AlertsScreen','SettingsScreen','ProximityTrialModal']) assert.match(root,new RegExp(`<${screen}\\b`));
  assert.doesNotMatch(root, /import PatrolScreen|<PatrolScreen\b/);
  const settings = read('src/screens/SettingsScreen.tsx');
  for (const text of ['Conexão automática','Alertas de emergência','Vibração','Reduzir animações','Verificar prontidão','Ensaio de proximidade','Enviar e-mail de teste','Restaurar preferências','Sair da conta']) assert.ok(settings.includes(text), text);
  for (const legacy of ['keepScreenAwake','attentionAlertsToContacts','informationalSounds']) assert.ok(!settings.includes(`key="${legacy}"`) && !settings.includes(`preferences.${legacy}`));
});

test('contrato: email é HTTP EmailJS e localização só é obtida na emergência com envio e opção ativos', () => {
  const email = read('src/services/emergencyEmail.ts');
  assert.match(email,/https:\/\/api\.emailjs\.com\/api\/v1\.0\/email\/send/);
  for (const key of ['to_email','message','child_name']) assert.ok(email.includes(`${key}:`));
  const hook = read('src/hooks/useEsp32Monitor.ts');
  const notify = hook.slice(hook.indexOf('const notifyEmergencyContact'),hook.indexOf('const activateEmergency'));
  assert.ok(notify.indexOf('if (!canSendEmergencyEmail(profile)) return') < notify.indexOf('getResponsiblePhoneLocation()'));
  assert.match(notify,/preferencesRef\.current\.shareLocation\s*\? await withTimeout\(getResponsiblePhoneLocation\(\)/);
  const switchBody = read('src/screens/SettingsScreen.tsx').split('const handleLocationToggle')[1].split('const forceLogout')[0];
  assert.doesNotMatch(switchBody,/requestForegroundPermissionsAsync|getCurrentPositionAsync/);
});
