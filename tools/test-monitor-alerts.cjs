// Executa o hook real com React/BLE/áudio/Android simulados, sem tocar hardware.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

async function createMonitor(options = {}) {
  const effects = [], states = [], refs = [], callbacks = [], timers = new Map(), intervals = [], nativeTicks = [], appStateListeners = new Set();
  const calls = { vibration: 0, audio: 0, arms: [], cancel: 0, notifications: 0, resets: 0, disconnects: 0, sequence: [], email: [] };
  let clock = 100000;
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  let onStatus, onConnection, connected = true, stateIndex = 0, refIndex = 0, effectIndex = 0, callbackIndex = 0, nativeActive = false;
  const safeStatus = { rssi: -69, rssi_raw: -69, rssiFresh: true, fw: 'xiao-p5-teste', distancia_m: 1,
    estado: 'seguro', som_on: true, monitoramento_ativo: true, panico_ativo: false };
  const sameDependencies = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const appState = { currentState: 'active', addEventListener: (_name, fn) => {
    appStateListeners.add(fn); return { remove: () => appStateListeners.delete(fn) };
  } };
  const sound = {
    setIsLoopingAsync: async () => {}, unloadAsync: async () => {}, stopAsync: async () => {},
    setPositionAsync: async () => {}, playAsync: async () => { calls.audio++; },
  };
  const dependencies = {
    '../services/nativeIdentity': { IS_TEST_BUILD: options.testBuild !== false,
      INTERNAL_TOOLS_ENABLED: options.internalTools === true,
      VALIDATED_MONITOR_ENABLED: options.validatedMonitor ?? options.testBuild !== false },
    '../services/blePermissions': { ensureBlePermissions: async () => {
      calls.sequence.push('permissions');
      if (options.bleDenied) throw new Error('Bluetooth não autorizado');
    } },
    '../utils/telemetry': loadUtility('telemetry'),
    '../utils/safetyConfirmation': loadUtility('safetyConfirmation'),
    '../utils/asyncTimeout': { withTimeout: async operation => operation },
    '../services/emergencyEmail': options.emailTransport ? loadEmailService(async (url, request) => {
      calls.email.push({ url, method:request.method, payload:JSON.parse(request.body) });
      return options.emailTransport(request);
    }) : {
      canSendEmergencyEmail: () => false,
      sendExperimentalEmail: async () => { throw new Error('Este teste não envia e-mail'); },
    },
    react: {
      useCallback: (fn, deps) => {
        const index = callbackIndex++;
        if (!sameDependencies(callbacks[index]?.deps, deps)) callbacks[index] = { fn, deps };
        return callbacks[index].fn;
      },
      useRef: value => { const index = refIndex++; return refs[index] ?? (refs[index] = { current: value }); },
      useEffect: (fn, deps) => {
        const index = effectIndex++;
        if (!sameDependencies(effects[index]?.deps, deps)) {
          effects[index]?.cleanup?.();
          effects[index] = { fn, deps, pending: true };
        }
      },
      useState: initial => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      },
    },
    'react-native': {
      AppState: appState,
      Vibration: { vibrate: () => { calls.vibration++; }, cancel() {} },
    },
    'expo-av': { Audio: { Sound: { createAsync: async () => ({ sound }) }, setAudioModeAsync: async () => {} } },
    '../services/accountStorage': {
      getItem: async key => key === '@escolta_monitoring_intent' && options.initialStandby ? 'standby'
        : key === '@escolta_alerts_history' && options.historyPending ? options.historyPending
        : key === '@escolta_user_profile' && options.profile ? JSON.stringify(options.profile) : null,
      setItem: async () => {}, removeItem: async () => {},
      subscribeAccountStorage: () => () => {},
    },
    'expo-location': options.location ?? {},
    '../services/bleApi': {
      deferRssiRecoveryForWatchdogExperiment: () => options.rssiExperiment === true,
      connectBle: async () => { calls.sequence.push('connect'); }, disconnectBle: async () => { calls.disconnects++; connected = false; onConnection?.(false); }, isBleConnected: () => connected,
      resetarAlarmeBle: async () => {
        calls.resets++;
        if (options.resetFails) throw new Error('Sem confirmação');
        const response = { ...safeStatus, ...options.resetResponse };
        onStatus?.(response);
        return response;
      }, setMonitoringModeBle: async () => {},
      setBleCallbacks: (status, connection) => { onStatus = status; onConnection = connection; },
    },
    '../context/AppPreferencesContext': {
      useAppPreferences: () => ({ preferences: {
        notificationsEnabled: true, vibrationEnabled: true, autoConnect: false, shareLocation: false,
        ...options.preferences,
      } }),
    },
    '../services/backgroundSentinel': {
      subscribeBackgroundProtectionTick: fn => {
        if (!options.nativeTicks) return null;
        const tick = { fn, active: true }; nativeTicks.push(tick);
        return () => { tick.active = false; };
      },
      armBackgroundEmergency: async (...args) => {
        calls.arms.push(args);
        if (options.nativePending) return options.nativePending;
        if (options.nativeAvailable === false) return false;
        nativeActive = args[1] === 0;
        return true;
      },
      cancelBackgroundEmergency: async () => {
        calls.cancel++; nativeActive = false;
        if (options.signalChangesDuringCancel) onStatus?.({ ...safeStatus, rssi: -95, rssi_raw: -95, estado: 'panico', panico_ativo: true });
        return true;
      },
      isBackgroundEmergencyActive: async () => nativeActive,
      isBackgroundEmergencyLatched: async () => nativeActive,
      notifyBackgroundConnectionRestored: async () => true,
      startBackgroundSentinel: async () => { calls.sequence.push('sentinel'); return true; }, stopBackgroundSentinel: async () => true,
      updateBackgroundSentinel: async () => true,
    },
    '../services/notificationService': {
      dismissEmergencyNotification: async () => {}, prepareNotifications: async () => true,
      showBatteryNotification: async () => {},
      showEmergencyNotification: async () => { calls.notifications++; },
    },
    '../../assets/alert_tone.wav': 'mock-audio',
  };
  const filename = path.join(__dirname, '../src/hooks/useEsp32Monitor.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const context = {
    exports: {}, require: name => {
      if (!(name in dependencies)) throw new Error(`Import inesperado: ${name}`);
      return dependencies[name];
    },
    setTimeout: (callback, delay) => { const key = {}; timers.set(key, { callback, delay }); return key; },
    clearTimeout: key => timers.delete(key), setInterval: (callback, delay) => { intervals.push({ callback, delay, active: true }); return intervals.length; },
    clearInterval: key => { if (intervals[key - 1]) intervals[key - 1].active = false; },
    Date: ClockDate,
    console, fetch: () => { throw new Error('Este teste não pode acessar rede'); },
  };
  vm.runInNewContext(code, context, { filename });
  const render = () => {
    stateIndex = refIndex = effectIndex = callbackIndex = 0;
    const controller = context.exports.useEsp32Monitor();
    effects.forEach(effect => { if (effect.pending) { effect.pending = false; effect.cleanup = effect.fn(); } });
    return controller;
  };
  const processScope = options.persistent
    ? new (loadUtility('monitorScope').MonitorScope)(hooks => context.exports.runEsp32Monitor(
      hooks, dependencies['../context/AppPreferencesContext'].useAppPreferences().preferences))
    : null;
  if (processScope) processScope.start();
  const controller = processScope ? processScope.getSnapshot() : render();
  const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
  await flush();
  return {
    calls, controller, timers, flush, render: () => processScope ? processScope.getSnapshot() : render(),
    snapshot: () => processScope ? processScope.getSnapshot() : states[0],
    attachView: listener => processScope.subscribe(listener),
    disposeScope: () => processScope.dispose(),
    activeNativeTicks: () => nativeTicks.filter(t => t.active).length,
    moveClock: ms => { clock += ms; },
    appState: value => { appState.currentState = value; appStateListeners.forEach(fn => fn(value)); },
    tickNative: () => nativeTicks.filter(t => t.active).forEach(t => t.fn()),
    tickReconnect: () => intervals.filter(i => i.active && i.delay === 8000).forEach(i => i.callback()),
    advance: ms => { clock += ms; intervals.filter(i => i.active && i.delay === 1000).forEach(i => i.callback()); },
    emit: (overrides = {}) => onStatus({ ...safeStatus, ...overrides }),
    connection: value => { connected = value; onConnection(value); },
  };
}

function loadUtility(name) {
  const context = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, `../src/utils/${name}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return context.exports;
}

function loadEmailService(fetch) {
  const context={exports:{},fetch,AbortController,setTimeout:()=>1,clearTimeout:()=>{},
    require:name=>{assert.equal(name,'../utils/authValidation');return loadUtility('authValidation');}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/services/emergencyEmail.ts'),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
  }).outputText,context);
  return context.exports;
}

test('AUDITORIA: desativar notificações não deve silenciar sirene crítica', async () => {
  const m = await createMonitor({ preferences: { notificationsEnabled: false } });
  m.emit({ estado: 'panico', panico_ativo: true });
  await m.flush();
  const nativeAlarmRequested = m.calls.arms.some(args => args[1] === 0);
  assert.ok(nativeAlarmRequested || m.calls.audio > 0, 'Nem áudio local nem sirene nativa foram solicitados');
  // A preferência continua falsa para notificações, mas o Kotlin inicia áudio fora do if.
  const native = fs.readFileSync(path.join(__dirname, '../modules/escolta-sentinela/android/src/main/java/expo/modules/escoltasentinela/EscoltaSentinelaService.kt'), 'utf8');
  assert.match(native, /alarmPlaying = startNativeAlarm\(vibrationEnabled\)/);
  assert.equal(m.calls.arms[0][2], false);
});

test('uso normal recusa sirene de teste sem silenciar a emergência real', async () => {
  const m = await createMonitor();
  await assert.rejects(m.controller.testarAlertaLocal(), /interna indisponível/);
  assert.equal(m.calls.audio, 0); assert.equal(m.calls.vibration, 0);
  m.emit({ estado: 'panico', panico_ativo: true }); await m.flush();
  assert.ok(m.calls.arms.some(args => args[1] === 0));
});

test('reconectar sem telemetria válida não cancela a tolerância de perda', async () => {
  const m = await createMonitor({ nativeAvailable: false });
  m.connection(true); m.emit(); m.connection(false); m.connection(true);
  const grace = [...m.timers.values()].find(t => t.delay === 5000);
  assert.ok(grace);
  await grace.callback(); await m.flush();
  assert.equal(m.snapshot().modoPanico, true);
});

test('dados antigos retiram prontidão e forçam recuperação sem inventar metros', async () => {
  const m = await createMonitor();
  m.connection(true); m.emit();
  assert.equal(m.snapshot().dadosValidos, true);
  m.advance(3500);
  assert.equal(m.snapshot().dadosValidos, false);
  assert.equal(m.snapshot().distanciaEstimada, null);
  assert.ok(m.snapshot().falhaTecnica);
  m.advance(3000); await m.flush();
  assert.equal(m.calls.disconnects, 1);
});

test('conexão sem primeira leitura também tem recuperação por timeout', async () => {
  const m = await createMonitor();
  m.connection(true); m.advance(6500); await m.flush();
  assert.equal(m.calls.disconnects, 1);
  assert.equal(m.snapshot().dadosValidos, false);
});

test('injeção W1 adia só recuperação RSSI, conserva invalidade e recebe pânico da placa', async () => {
  const m = await createMonitor({ rssiExperiment: true });
  m.connection(true); m.emit();
  m.moveClock(8000);
  m.emit({ rssiFresh: false, panico_ativo: true, estado: 'panico' });
  m.advance(0); await m.flush();
  assert.equal(m.calls.disconnects, 0);
  assert.equal(m.snapshot().dadosValidos, false);
  assert.equal(m.snapshot().modoPanico, true);
  assert.ok(m.calls.arms.some(args => args[1] === 0));
});

test('injeção W1 não adia recuperação quando a telemetria também para', async () => {
  const m = await createMonitor({ rssiExperiment: true });
  m.connection(true); m.emit();
  m.advance(6500); await m.flush();
  assert.equal(m.calls.disconnects, 1);
});

test('falha nativa tardia não reativa sirene depois da confirmação humana', async () => {
  let resolveNative;
  const m = await createMonitor({ nativePending: new Promise(resolve => { resolveNative = resolve; }) });
  m.emit({ estado: 'panico', panico_ativo: true });
  await m.controller.confirmarSeguranca();
  resolveNative(false); await m.flush();
  assert.equal(m.calls.audio, 0);
  assert.equal(m.snapshot().modoPanico, false);
});

test('reset não confirmado mantém emergência e não registra segurança concluída', async () => {
  const m = await createMonitor({ resetFails: true });
  m.emit({ estado: 'panico', panico_ativo: true }); await m.flush();
  await assert.rejects(m.controller.confirmarSeguranca(), /não confirmou/);
  assert.equal(m.snapshot().modoPanico, true);
  assert.equal(m.calls.cancel, 0);
  assert.equal(m.snapshot().alertas.filter(a => a.title === 'Segurança confirmada').length, 0);
});

test('limpar histórico durante carregamento não restaura registros antigos atrasados', async () => {
  let finishHistory;
  const m = await createMonitor({ historyPending: new Promise(resolve => { finishHistory = resolve; }) });
  await m.controller.limparAlertas();
  finishHistory(JSON.stringify([{ id: 'old', type: 'info', title: 'Antigo', desc: 'Registro anterior', time: '01/10/2026 10:00' }]));
  await m.flush();
  assert.equal(m.snapshot().alertas.length, 0);
});

test('oficial padrão mantém confirmação presencial sem vínculo, sem promoção automática', async () => {
  const m = await createMonitor({ testBuild: false });
  m.emit({ estado: 'panico', panico_ativo: true }); await m.flush();
  m.connection(false);
  await m.controller.confirmarSeguranca();
  assert.equal(m.calls.resets, 0);
  assert.equal(m.snapshot().modoPanico, false);
  assert.equal(m.snapshot().nivelSinal, 'desconectado');
  assert.equal(m.snapshot().segurancaConfirmadaSemVinculo, true);
});

test('AUDITORIA: perda de enlace deve ter áudio quando módulo nativo não inicia', async () => {
  const m = await createMonitor({ nativeAvailable: false });
  m.connection(true);
  m.emit();
  m.connection(false);
  const grace = [...m.timers.values()].find(timer => timer.delay === 5000);
  assert.ok(grace);
  grace.callback();
  await m.flush();
  assert.ok(m.calls.audio > 0, 'Fallback de áudio não foi acionado');
});

test('AUDITORIA: telemetria incompleta não deve ser interpretada como pânico', async () => {
  const m = await createMonitor();
  m.emit({ rssi: undefined, estado: undefined, panico_ativo: undefined });
  await m.flush();
  assert.equal(m.snapshot().modoPanico, false, 'RSSI ausente caiu no fallback de pânico');
  assert.equal(m.snapshot().dadosValidos, false);
});

test('amarelo confirmado mantém vibração breve uma vez, sem sirene de emergência', async () => {
  const m = await createMonitor();
  m.emit({ fw: 'xiao-p1' });
  m.emit({ estado: 'atencao', rssi: -81, fw: 'xiao-p1' });
  m.emit({ estado: 'atencao', rssi: -82, fw: 'xiao-p1' });
  await m.flush();
  assert.equal(m.snapshot().nivelSinal, 'aviso');
  assert.equal(m.snapshot().versaoFirmware, 'xiao-p1');
  assert.equal(m.snapshot().alertas.filter(a => a.title === 'Alcance reduzido').length, 1);
  assert.equal(m.calls.vibration, 1);
  assert.equal(m.calls.audio, 0);
  assert.equal(m.calls.arms.length, 0);
});

test('pânico/botão continua imediato e retido até confirmação humana', async () => {
  const m = await createMonitor();
  m.emit();
  m.emit({ estado: 'panico', panico_ativo: true });
  await m.flush();
  assert.equal(m.snapshot().modoPanico, true);
  assert.equal(m.calls.arms.length, 1);
  assert.equal(m.calls.arms[0][1], 0);
  assert.equal(m.calls.arms[0][3], true); // Vibração crítica mantida.
  m.emit({ estado: 'atencao' });
  m.emit();
  assert.equal(m.snapshot().modoPanico, true);
  assert.equal(m.snapshot().nivelSinal, 'panico');
  assert.equal(m.snapshot().alertas.filter(a => a.title === 'Alcance reduzido').length, 0);
  await m.controller.confirmarSeguranca();
  assert.equal(m.calls.resets, 1);
  assert.equal(m.snapshot().modoPanico, false);
});

test('perigo declarado pela placa também aciona emergência', async () => {
  const m = await createMonitor();
  m.emit({ estado: 'perigo', rssi: -92 });
  await m.flush();
  assert.equal(m.snapshot().modoPanico, true);
  assert.equal(m.calls.arms[0][1], 0);
});

test('perda de vínculo mantém tolerância de 5 s e alerta crítico', async () => {
  const m = await createMonitor();
  m.connection(true);
  m.emit();
  m.connection(false);
  assert.equal(m.calls.arms[0][1], 5000);
  assert.equal(m.snapshot().modoPanico, false);
  const grace = [...m.timers.values()].find(timer => timer.delay === 5000);
  assert.ok(grace);
  grace.callback();
  await m.flush();
  assert.equal(m.snapshot().modoPanico, true);
  assert.equal(m.snapshot().distanciaEstimada, null);
});

test('espera intencional não vira aviso de proximidade nem emergência', async () => {
  const m = await createMonitor();
  m.emit();
  m.emit({ estado: 'atencao', monitoramento_ativo: false });
  await m.flush();
  assert.equal(m.snapshot().alertas.filter(a => a.title === 'Alcance reduzido').length, 0);
  assert.equal(m.calls.arms.length, 0);
  assert.equal(m.calls.vibration, 0);
});

test('não inventa firmware quando a placa não informa uma versão', async () => {
  const m = await createMonitor();
  m.emit({ fw: 'xiao-p1' });
  assert.equal(m.snapshot().versaoFirmware, 'xiao-p1');
  m.emit({ fw: undefined });
  assert.equal(m.snapshot().versaoFirmware, null);
  m.emit({ fw: 'xiao-p1' });
  m.connection(false);
  assert.equal(m.snapshot().versaoFirmware, null);
});

test('estimativa não é recalculada pelo app e valores inválidos não viram distância', async () => {
  const m = await createMonitor();
  m.emit({ distancia_m: 3.8, fw: 'xiao-p2' });
  assert.equal(m.snapshot().distanciaEstimada, 3.8);
  assert.equal(m.snapshot().versaoFirmware, 'xiao-p2');
  for (const invalid of [null, undefined, NaN, Infinity, -1, 0]) {
    m.emit({ distancia_m: invalid });
    assert.equal(m.snapshot().distanciaEstimada, null);
  }
  assert.equal(m.calls.arms.length, 0);
});

test('primeiro acesso verifica autorização antes do serviço e da conexão', async () => {
  const m = await createMonitor();
  m.connection(false);
  await m.controller.conectar();
  assert.deepEqual(m.calls.sequence, ['permissions', 'sentinel', 'connect']);
});

test('recusa BLE mantém app aberto com erro e sem iniciar serviço ou conexão', async () => {
  const m = await createMonitor({ bleDenied: true });
  m.connection(false);
  await m.controller.conectar();
  assert.deepEqual(m.calls.sequence, ['permissions']);
  assert.equal(m.snapshot().isScanning, false);
  assert.match(m.snapshot().scanError, /Bluetooth/);
  assert.equal(m.calls.audio, 0);
});

test('teste: sem vínculo não encerra sirene, notificação nem emergência retida', async () => {
  const m = await createMonitor();
  m.emit({ estado: 'panico', panico_ativo: true }); await m.flush();
  m.connection(false);
  await assert.rejects(m.controller.confirmarSeguranca(), /reconecte a placa/);
  assert.equal(m.calls.resets, 0);
  assert.equal(m.calls.cancel, 0);
  assert.equal(m.snapshot().modoPanico, true);
  assert.equal(m.snapshot().segurancaConfirmadaSemVinculo, false);
  assert.equal(m.snapshot().alertas.filter(a => a.title === 'Segurança confirmada').length, 0);
});

test('oficial opt-in: confirmar sem vínculo preserva emergência como no teste validado', async () => {
  const m = await createMonitor({ testBuild: false, validatedMonitor: true });
  m.emit({ estado: 'panico', panico_ativo: true }); await m.flush();
  m.connection(false);
  await assert.rejects(m.controller.confirmarSeguranca(), /reconecte a placa/);
  assert.equal(m.calls.resets, 0);
  assert.equal(m.calls.cancel, 0);
  assert.equal(m.snapshot().modoPanico, true);
  assert.equal(m.snapshot().segurancaConfirmadaSemVinculo, false);
});

test('teste: desconexão em emergência tenta reconectar sem apagar o alerta', async () => {
  const m = await createMonitor({ preferences: { autoConnect: true } });
  m.connection(true); m.emit({ estado: 'panico', panico_ativo: true }); await m.flush();
  m.calls.sequence.length = 0;
  m.connection(false); await m.flush();
  assert.ok(m.calls.sequence.includes('connect'));
  assert.equal(m.snapshot().modoPanico, true);
  assert.equal(m.calls.cancel, 0);
});

test('teste: abrir em espera e retomar instala novamente a busca periódica', async () => {
  const m = await createMonitor({ initialStandby: true, preferences: { autoConnect: true } });
  m.render(); await m.flush();
  assert.equal(m.snapshot().emEspera, true);
  await m.controller.retomarProtecao(); m.render(); await m.flush();
  m.connection(false); await m.flush();
  m.calls.sequence.length = 0;
  m.moveClock(8000); m.tickReconnect(); await m.flush();
  assert.ok(m.calls.sequence.includes('connect'), 'Retomar não reativou a busca automática');
});

test('oficial: rotina anterior de retomada não é alterada pelo experimento', async () => {
  const m = await createMonitor({ testBuild: false, initialStandby: true, preferences: { autoConnect: true } });
  m.render(); await m.flush();
  await m.controller.retomarProtecao(); m.render(); await m.flush();
  m.connection(false); await m.flush();
  m.calls.sequence.length = 0;
  m.moveClock(8000); m.tickReconnect(); await m.flush();
  assert.equal(m.calls.sequence.includes('connect'), false);
});

test('teste: ao desbloquear oculta metros antigos e aguarda leituras antes de desconectar', async () => {
  const m = await createMonitor();
  m.connection(true); m.emit();
  m.appState('background'); m.moveClock(64000); m.appState('active');
  await m.flush(); m.advance(1000);
  assert.equal(m.calls.disconnects, 0);
  assert.equal(m.snapshot().dadosValidos, false);
  assert.equal(m.snapshot().distanciaEstimada, null);
  m.emit(); m.advance(1000);
  assert.equal(m.calls.disconnects, 0);
  assert.equal(m.snapshot().dadosValidos, true);
});

test('teste: tolerância de retorno é limitada e não aprova um vínculo sem leituras', async () => {
  const m = await createMonitor();
  m.connection(true); m.emit();
  m.appState('background'); m.moveClock(64000); m.appState('active');
  m.advance(6500); await m.flush();
  assert.equal(m.calls.disconnects, 1);
  assert.equal(m.snapshot().dadosValidos, false);
});

test('teste: pulso nativo mantém vigilância mesmo sem executar intervalos JS', async () => {
  const m = await createMonitor({ nativeTicks: true });
  m.connection(true); m.emit(); m.moveClock(6500);
  m.tickNative(); await m.flush();
  assert.equal(m.calls.disconnects, 1);
});

test('teste: confirmar ainda distante nao escreve reset nem cancela emergencia', async () => {
  const m = await createMonitor();
  m.emit({ rssi: -94, rssi_raw: -94, estado: 'panico', panico_ativo: true }); await m.flush();
  await assert.rejects(m.controller.confirmarSeguranca(), /Aproxime a placa/);
  assert.equal(m.calls.resets, 0); assert.equal(m.calls.cancel, 0);
  assert.equal(m.snapshot().modoPanico, true);
});

test('teste radio4: confirma perto somente com ACK real e mantem recusa distante', async () => {
  const m = await createMonitor({resetResponse:{fw:'xiao-p5-r4'}});
  m.emit({fw:'xiao-p5-r4',rssi:-94,rssi_raw:-94,estado:'panico',panico_ativo:true});
  await m.flush();
  await assert.rejects(m.controller.confirmarSeguranca(), /Aproxime a placa/);
  assert.equal(m.calls.resets,0); assert.equal(m.calls.cancel,0);
  m.emit({fw:'xiao-p5-r4'}); await m.flush();
  assert.equal(m.snapshot().modoPanico,true);
  await m.controller.confirmarSeguranca();
  assert.equal(m.calls.resets,1); assert.equal(m.snapshot().modoPanico,false);
});

for (const fw of ['xiao-p5-r4-d1-k1', 'xiao-p5-r4-d1-k2']) {
test(`teste ${fw}: sinal -78 nao confirma; perto exige ACK da variante exata`, async () => {
  const m = await createMonitor({resetResponse:{fw}});
  m.emit({fw,rssi:-78,rssi_raw:-78,estado:'panico',panico_ativo:true});
  await m.flush();
  await assert.rejects(m.controller.confirmarSeguranca(), /Aproxime a placa/);
  assert.equal(m.calls.resets,0); assert.equal(m.calls.cancel,0);
  m.emit({fw,rssi:-70,rssi_raw:-70}); await m.flush();
  assert.equal(m.snapshot().modoPanico,true);
  await m.controller.confirmarSeguranca();
  assert.equal(m.calls.resets,1); assert.equal(m.snapshot().modoPanico,false);
});
}

test('teste: reset com resposta seguro mas RSSI fraco nao aprova verde', async () => {
  const m = await createMonitor({ resetResponse: { rssi: -94, rssi_raw: -94 } });
  m.emit({ estado: 'panico', panico_ativo: true }); await m.flush();
  await assert.rejects(m.controller.confirmarSeguranca(), /leituras válidas/);
  assert.equal(m.calls.cancel, 0); assert.equal(m.snapshot().modoPanico, true);
});

test('teste: sinal que enfraquece durante cancelamento mantem emergencia, sem forcar verde', async () => {
  const m = await createMonitor({ signalChangesDuringCancel: true });
  m.emit({ estado: 'panico', panico_ativo: true }); await m.flush();
  await assert.rejects(m.controller.confirmarSeguranca(), /condição segura mudou/);
  assert.equal(m.snapshot().modoPanico, true);
  assert.equal(m.calls.audio, 1);
});

test('teste: firmware antigo que fabrica seguro nao permite confirmar', async () => {
  const m = await createMonitor();
  m.emit({ fw: 'xiao-p4-teste', estado: 'panico', panico_ativo: true }); await m.flush();
  await assert.rejects(m.controller.confirmarSeguranca(), /Atualize a placa/);
  assert.equal(m.calls.resets, 0); assert.equal(m.snapshot().modoPanico, true);
});

test('teste: leitura antiga forte nao permite confirmar enquanto faltam dados atuais', async () => {
  const m = await createMonitor();
  m.emit({ estado: 'panico', panico_ativo: true }); await m.flush();
  m.moveClock(3000);
  await assert.rejects(m.controller.confirmarSeguranca(), /leituras recentes/);
  assert.equal(m.calls.cancel, 0); assert.equal(m.snapshot().modoPanico, true);
});

test('monitor persistente: remover tela nao desconecta e telemetria continua sem assinante', async () => {
  const m = await createMonitor({ persistent: true, nativeTicks: true });
  const detach = m.attachView(() => {});
  m.connection(true); m.emit(); await m.flush();
  detach();
  const ticks = m.activeNativeTicks();
  m.moveClock(500); m.emit({ rssi: -73, rssi_raw: -73, distancia_m: 1.5 }); await m.flush();
  assert.equal(m.calls.disconnects, 0);
  assert.equal(m.snapshot().conectado, true);
  assert.equal(m.snapshot().rssiAtual, -73);
  assert.ok(ticks > 0);
  assert.equal(m.activeNativeTicks(), ticks);
  const reconnects = m.calls.sequence.filter(v => v === 'connect').length;
  m.attachView(() => {}); await m.flush();
  assert.equal(m.calls.sequence.filter(v => v === 'connect').length, reconnects);
  m.disposeScope();
});

test('monitor persistente: botao/emergencia e confirmacao continuam depois de remover tela', async () => {
  const m = await createMonitor({ persistent: true });
  const detach = m.attachView(() => {});
  m.connection(true); m.emit(); await m.flush(); detach();
  m.emit({ estado: 'panico', panico_ativo: true }); await m.flush();
  assert.equal(m.snapshot().modoPanico, true);
  assert.equal(m.calls.arms.length, 1);
  assert.equal(m.calls.disconnects, 0);
  // Reattached screen observes the same latched emergency and can acknowledge it.
  m.attachView(() => {});
  await m.render().confirmarSeguranca(); await m.flush();
  assert.equal(m.calls.resets, 1);
  assert.equal(m.snapshot().modoPanico, false);
  m.disposeScope();
});

test('monitor persistente: pausa explicita desconecta e liberacao de sessao e idempotente', async () => {
  const m = await createMonitor({ persistent: true, nativeTicks: true });
  m.connection(true); m.emit(); await m.flush();
  await m.render().colocarEmEspera(); await m.flush();
  assert.equal(m.snapshot().emEspera, true);
  assert.equal(m.calls.disconnects, 1);
  const first = m.render().liberarRecursosDoMonitor();
  const second = m.render().liberarRecursosDoMonitor();
  assert.equal(first, second);
  await first; m.disposeScope(); await m.flush();
  assert.equal(m.calls.disconnects, 2);
  assert.equal(m.activeNativeTicks(), 0);
});

test('monitor persistente: descarte da sessao nao confirma nem cancela emergencia retida', async () => {
  const m = await createMonitor({ persistent: true, nativeTicks: true });
  m.connection(true); m.emit({ estado: 'panico', panico_ativo: true }); await m.flush();
  const cancels = m.calls.cancel;
  await m.render().liberarRecursosDoMonitor(); m.disposeScope(); await m.flush();
  assert.equal(m.calls.cancel, cancels);
  assert.equal(m.calls.resets, 0);
  assert.equal(m.activeNativeTicks(), 0);
});

test('monitor persistente: perda e alerta sao processados mesmo sem tela', async () => {
  const m = await createMonitor({ persistent: true, nativeTicks: true });
  const detach = m.attachView(() => {});
  m.connection(true); m.emit(); await m.flush(); detach();
  m.connection(false); await m.flush();
  const grace = [...m.timers.values()].find(t => t.delay === 5000);
  assert.ok(grace);
  m.moveClock(5000); await grace.callback(); await m.flush();
  assert.equal(m.snapshot().modoPanico, true);
  assert.ok(m.calls.arms.length > 0);
  m.disposeScope();
});

test('oficial A1: percurso completo de uma placa simulada mantém alerta retido e exporta estados reais', async () => {
  const fw='xiao-p5-r4-d1-k2-w1';
  const m=await createMonitor({testBuild:false,validatedMonitor:true,persistent:true,nativeTicks:true,resetResponse:{fw}});
  const {AutonomySession,buildAutonomyCsv}=loadUtility('autonomyStudy');
  const epoch=100000;
  let elapsed=0,packet=null,telemetryAt=null;
  const clock=()=>({wall:epoch+elapsed,mono:elapsed});
  const study=new AutonomySession(clock(),{app:'1.0.2 / autonomia-a1',phone:'simulado',platform:'android simulado'},'integracao');
  const observe=()=>{
    const s=m.snapshot();
    study.observe({connected:s.conectado,standby:s.emEspera,panic:s.modoPanico,signal:s.nivelSinal,
      telemetryAt,firmware:packet?.fw??null,voltage:packet?.bateria_v??null,percent:packet?.bateria_pct??null,
      usb:packet?.usb_conectado??null,charging:packet?.carregando??null,soundEnabled:packet?.som_on??null,
      boardState:packet?.estado??null,boardPanic:packet?.panico_ativo??null,
      boardActive:packet?.monitoramento_ativo??null,vibration:true,notifications:true},clock());
  };
  const detach=m.attachView(observe);
  const advance=()=>{elapsed+=1000;m.moveClock(1000);};
  const emit=async (overrides={})=>{
    packet={fw,estado:'seguro',panico_ativo:false,monitoramento_ativo:true,som_on:true,
      bateria_v:4.03,bateria_pct:90,usb_conectado:false,carregando:false,...overrides};
    telemetryAt=clock().wall;m.emit(packet);await m.flush();
  };
  try {
    m.connection(true);await emit({usb_conectado:true,carregando:true});
    advance();await emit();
    advance();await emit({estado:'atencao',rssi:-79,rssi_raw:-79});
    assert.equal(m.snapshot().modoPanico,false);
    advance();await emit({estado:'panico',panico_ativo:true});
    assert.equal(m.snapshot().modoPanico,true);
    assert.equal(m.calls.arms.length,1);
    advance();packet=null;telemetryAt=null;m.connection(false);await m.flush();
    await assert.rejects(m.render().confirmarSeguranca());
    assert.equal(m.calls.resets,0);
    assert.equal(m.snapshot().modoPanico,true);
    advance();m.connection(true);await emit({estado:'panico',panico_ativo:true});
    await m.render().confirmarSeguranca();await m.flush();
    advance();await emit();
    assert.equal(m.calls.resets,1);assert.equal(m.snapshot().modoPanico,false);
    study.finish('fim_do_ensaio',clock());
    const csv=buildAutonomyCsv([study.run]);
    for(const state of ['protegido','atencao','emergencia','emergencia_sem_vinculo']) assert.ok(study.run.rows.some(row=>row.state===state),state);
    assert.ok(study.run.rows.some(row=>!row.connected&&row.appEmergency&&row.voltage===null));
    assert.equal(study.run.rows.at(-1).state,'protegido');
    assert.match(csv,/"1\.0\.2 \/ autonomia-a1"/);
  } finally {detach();m.disposeScope();}
});

test('oficial A1: pânico repetido dispara uma solicitação de e-mail simulada, sem localização não autorizada',async()=>{
  const m=await createMonitor({testBuild:false,validatedMonitor:true,persistent:true,
    profile:{emailAlertsEnabled:true,emailEmergencia:' CONTATO@EXAMPLE.INVALID '},
    emailTransport:async()=>({ok:true})});
  try {
    m.connection(true);m.emit();await m.flush();assert.equal(m.calls.email.length,0);
    m.emit({estado:'atencao'});await m.flush();assert.equal(m.calls.email.length,0);
    for(let i=0;i<4;i++){m.emit({estado:'panico',panico_ativo:true});await m.flush();}
    assert.equal(m.calls.email.length,1);assert.equal(m.snapshot().modoPanico,true);
    const request=m.calls.email[0];
    assert.equal(request.method,'POST');
    assert.equal(request.payload.template_params.to_email,'contato@example.invalid');
    assert.match(request.payload.template_params.message,/Compartilhamento de localização desativado/);
    assert.doesNotMatch(request.payload.template_params.message,/https?:\/\//);
    assert.equal(m.calls.arms.length,1);
  }finally{m.disposeScope();}
});

test('oficial A1: e-mail desativado, serviço recusado e rede ausente não alteram o alarme local',async()=>{
  for(const [enabled,transport,expectedRequests] of [
    [false,async()=>{throw Error('Não deveria chamar');},0],
    [true,async()=>({ok:false}),1],
    [true,async()=>{throw Error('Sem rede simulada');},1],
  ]){
    const m=await createMonitor({testBuild:false,validatedMonitor:true,persistent:true,
      profile:{emailAlertsEnabled:enabled,emailEmergencia:'contato@example.invalid'},emailTransport:transport});
    try{
      m.connection(true);m.emit({estado:'panico',panico_ativo:true});await m.flush();
      assert.equal(m.calls.email.length,expectedRequests);
      assert.equal(m.calls.arms.length,1);assert.equal(m.calls.cancel,0);
      assert.equal(m.snapshot().modoPanico,true);
      assert.equal(m.snapshot().alertas.some(item=>item.title==='Aviso externo não confirmado'),enabled);
    }finally{m.disposeScope();}
  }
});

test('oficial A1: e-mail simulado inclui só a localização fictícia do celular quando autorizada',async()=>{
  for(const permission of ['denied','granted','unavailable']){
    let reads=0;
    const m=await createMonitor({testBuild:false,validatedMonitor:true,persistent:true,
      preferences:{shareLocation:true},
      profile:{emailAlertsEnabled:true,emailEmergencia:'contato@example.invalid'},
      emailTransport:async()=>({ok:true}),
      location:{Accuracy:{High:1},requestForegroundPermissionsAsync:async()=>({status:permission==='denied'?'denied':'granted'}),
        getCurrentPositionAsync:async()=>{reads++;if(permission==='unavailable')throw Error('GPS simulado indisponível');
          return {coords:{latitude:12.34,longitude:56.78}};}},
    });
    try{
      m.connection(true);m.emit({estado:'panico',panico_ativo:true});await m.flush();
      assert.equal(m.calls.email.length,1);
      const text=m.calls.email[0].payload.template_params.message;
      if(permission==='granted')assert.match(text,/Localização do celular responsável.+q=12\.34,56\.78/);
      else {
        assert.doesNotMatch(text,/maps\.google/);
        assert.match(text,permission==='denied'?/não autorizada/:/indisponível/);
      }
      assert.equal(reads,permission==='denied'?0:1);
      assert.equal(m.snapshot().modoPanico,true);
    }finally{m.disposeScope();}
  }
});
