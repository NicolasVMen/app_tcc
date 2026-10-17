const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function load(file, dependencies = {}, globals = {}) {
  const context = { exports: {}, setTimeout, clearTimeout, AbortController, Date,
    require: name => { if (!(name in dependencies)) throw new Error(`Import inesperado: ${name}`); return dependencies[name]; }, ...globals };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, context);
  return context.exports;
}
const validation = load('src/utils/authValidation.ts');
const environments = load('src/services/firebaseEnvironment.ts');
const valid = { mode: 'register', name: 'Nicolas', email: ' RESPONSAVEL@EXEMPLO.COM ', password: 'senha-teste', confirmation: 'senha-teste' };

test('cadastro normaliza e-mail e exige nome, senha e confirmação', () => {
  assert.equal(validation.normalizeEmail(valid.email), 'responsavel@exemplo.com');
  assert.equal(validation.validateAuthInput(valid), null);
  for (const changes of [{ name: ' ' }, { email: 'inválido' }, { password: '123456' }, { confirmation: 'outra' }]) {
    assert.ok(validation.validateAuthInput({ ...valid, ...changes }));
  }
});
test('login mantém compatibilidade com senhas antigas', () => {
  assert.equal(validation.validateAuthInput({ ...valid, mode: 'login', password: '123456', confirmation: '' }), null);
});
test('e-mail rejeita espaços, quebra de linha e endereço sem domínio', () => {
  for (const value of ['', 'a@b', 'a@b.com\r\n', 'a b@c.com', null, 12]) assert.equal(validation.isValidEmail(value), false);
});
test('erro de credencial não distingue conta ausente de senha errada', () => {
  assert.equal(validation.authErrorMessage({ code: 'auth/user-not-found' }), validation.authErrorMessage({ code: 'auth/wrong-password' }));
  assert.match(validation.authErrorMessage({ code: 'google/not-configured' }), /indisponível/);
});

function google({ result = { status: 'success', idToken: 'token-de-teste' }, configured = true, native = true,
  testBuild = true, wrongProject = false } = {}) {
  const calls = [];
  const api = load('src/services/googleAuth.ts', {
    'react-native': { Platform: { OS: 'android' } },
    'firebase/auth': {
      GoogleAuthProvider: { credential: token => ({ token }) },
      signInWithCredential: async (_, credential) => calls.push(credential),
    },
    './firebaseConfig': { auth: {}, firebaseEnvironment: environments.getFirebaseEnvironment(testBuild) },
    './nativeIdentity': { nativeAuth: native ? { signInGoogleAsync: async () => result } : null },
    './firebaseEnvironment': environments,
  }, { process: { env: { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: configured
    ? `${wrongProject ? '123' : '247729429884'}-teste.apps.googleusercontent.com` : '' } } });
  return { api, calls };
}
test('Google só acessa Firebase após credencial recebida', async () => {
  const g = google();
  assert.equal(await g.api.signInWithGoogle(), true);
  assert.equal(g.calls[0].token, 'token-de-teste');
});
test('cancelar seletor Google não cria conta nem gera acesso', async () => {
  const g = google({ result: { status: 'cancelled' } });
  assert.equal(await g.api.signInWithGoogle(), false);
  assert.equal(g.calls.length, 0);
});
test('Google sem configuração ou módulo nativo não tenta autenticar', async () => {
  for (const options of [{ configured: false }, { native: false }]) {
    const g = google(options);
    assert.equal(g.api.googleAuthAvailable, false);
    await assert.rejects(g.api.signInWithGoogle());
    assert.equal(g.calls.length, 0);
  }
});
test('Google não aceita token vazio ou erro do seletor', async () => {
  for (const result of [{ status: 'success', idToken: '' }, { status: 'error', code: 'google/no-credential' }]) {
    const g = google({ result });
    await assert.rejects(g.api.signInWithGoogle());
    assert.equal(g.calls.length, 0);
  }
});

test('Google recusa cliente de outro projeto em teste e oficial', async () => {
  for (const options of [{ wrongProject: true }, { testBuild: false, wrongProject: true }]) {
    const g = google(options);
    assert.equal(g.api.googleAuthAvailable, false);
    await assert.rejects(g.api.signInWithGoogle());
    assert.equal(g.calls.length, 0);
  }
});

test('oficial e teste usam o Firebase correto com sessões locais separadas', () => {
  const official = environments.getFirebaseEnvironment(false);
  const next = environments.getFirebaseEnvironment(true);
  assert.equal(official.appName, 'escolta-oficial-escolta-unitau');
  assert.equal(official.config.projectId, 'escolta-unitau');
  assert.equal(official.config.apiKey, 'AIzaSyBvJFXn5rqtZ2lhO6_1VI6qi3ighI0_ZTo');
  assert.equal(official.config.appId, '1:247729429884:web:c725e5c41ecc67a83358f9');
  assert.equal(next.config.projectId, 'escolta-unitau');
  assert.equal(next.config.appId, '1:247729429884:web:c725e5c41ecc67a83358f9');
  assert.notEqual(official.appName, next.appName);
});

test('Google também fica habilitado na oficial quando módulo e cliente correspondem', async () => {
  const g = google({ testBuild: false });
  assert.equal(g.api.googleAuthAvailable, true);
  assert.equal(await g.api.signInWithGoogle(), true);
});

function firebaseInitialization({ testBuild = true, existing = [], authError = null } = {}) {
  const calls = [];
  const deps = {
    'firebase/app': { getApps: () => existing, initializeApp: (options, name) => {
      const app = { name, options }; calls.push(['initializeApp', app]); return app;
    } },
    'firebase/auth': {
      getReactNativePersistence: storage => ({ storage }),
      initializeAuth: (app, options) => { calls.push(['initializeAuth', app, options]);
        if (authError) throw authError; return { app };
      },
      getAuth: app => { calls.push(['getAuth', app]); return { app }; },
    },
    '@react-native-async-storage/async-storage': {},
    './nativeIdentity': { IS_TEST_BUILD: testBuild },
    './firebaseEnvironment': environments,
  };
  return { run: () => load('src/services/firebaseConfig.ts', deps), calls };
}

test('nenhuma build reutiliza Firebase default antigo ou autenticação de outro projeto', () => {
  for (const testBuild of [false, true]) {
    const f = firebaseInitialization({ testBuild,
      existing: [{ name: '[DEFAULT]', options: { projectId: 'escolta-unitau-tcc' } }] });
    const result = f.run();
    assert.equal(result.auth.app.options.projectId, 'escolta-unitau');
    assert.equal(result.auth.languageCode, 'pt-BR');
    assert.equal(f.calls[0][0], 'initializeApp');
    assert.notEqual(result.auth.app.name, '[DEFAULT]');
  }
});

test('recarga reutiliza apenas o app correto e o Auth já inicializado', () => {
  const e = environments.getFirebaseEnvironment(true);
  const app = { name: e.appName, options: e.config };
  const f = firebaseInitialization({ existing: [app], authError: { code: 'auth/already-initialized' } });
  assert.equal(f.run().auth.app, app);
  assert.equal(f.calls.some(call => call[0] === 'initializeApp'), false);
  assert.equal(f.calls.at(-1)[0], 'getAuth');
});

test('inicialização recusa app com configuração errada e não esconde erro de persistência', () => {
  const e = environments.getFirebaseEnvironment(true);
  const wrong = firebaseInitialization({ existing: [{ name: e.appName,
    options: { ...e.config, projectId: 'outro' } }] });
  assert.throws(wrong.run, /configuração do Firebase mudou/);
  assert.equal(wrong.calls.length, 0);
  const failure = firebaseInitialization({ authError: { code: 'auth/invalid-persistence' } });
  assert.throws(failure.run);
  assert.equal(failure.calls.some(call => call[0] === 'getAuth'), false);
});

function email(fetchImplementation) {
  let cleared = 0;
  const api = load('src/services/emergencyEmail.ts', { '../utils/authValidation': validation }, {
    fetch: fetchImplementation,
    setTimeout: () => 1, clearTimeout: () => { cleared++; },
  });
  return { api, cleared: () => cleared };
}
test('e-mail legado sem ativação explícita não envia alerta', () => {
  const e = email(() => { throw new Error('Sem rede no teste'); });
  assert.equal(e.api.canSendEmergencyEmail({ emailEmergencia: 'a@b.com' }), false);
  assert.equal(e.api.canSendEmergencyEmail({ emailEmergencia: 'a@b.com', emailAlertsEnabled: true }), true);
  assert.equal(e.api.canSendEmergencyEmail({ emailEmergencia: 'inválido', emailAlertsEnabled: true }), false);
});
test('serviço de e-mail normaliza destinatário e reporta aceitação, não entrega', async () => {
  let body;
  const e = email(async (_, options) => { body = JSON.parse(options.body); return { ok: true }; });
  const result = await e.api.sendExperimentalEmail({ recipient: ' A@B.COM ', message: 'TESTE', childName: 'Teste' });
  assert.equal(body.template_params.to_email, 'a@b.com');
  assert.ok(result.acceptedAt);
  assert.equal(result.delivered, undefined);
  assert.equal(e.cleared(), 1);
});
test('HTTP recusado e falha de rede não são tratados como sucesso', async () => {
  for (const operation of [async () => ({ ok: false }), async () => { throw new Error('Rede indisponível'); }]) {
    const e = email(operation);
    await assert.rejects(e.api.sendExperimentalEmail({ recipient: 'a@b.com', message: 'TESTE', childName: 'Teste' }));
    assert.equal(e.cleared(), 1);
  }
});
test('destinatário inválido é rejeitado antes de acessar a rede', async () => {
  let calls = 0;
  const e = email(async () => { calls++; return { ok: true }; });
  await assert.rejects(e.api.sendExperimentalEmail({ recipient: 'inválido', message: 'TESTE', childName: 'Teste' }));
  assert.equal(calls, 0);
});

test('plugin Android é idempotente e separa pacote, nome e links de teste', () => {
  const plugin = require('./plugins/with-test-build.cjs');
  const first = plugin.configureGradle('android {}\n');
  assert.equal(plugin.configureGradle(first), first);
  assert.match(first, /applicationIdSuffix = '\.teste'/);
  assert.match(first, /Escolta Teste/);
  const manifest = { manifest: { application: [{ $: {}, activity: [{ 'intent-filter': [{ data: [{ $: { 'android:scheme': 'escolta' } }] }] }] }] } };
  plugin.configureManifest(manifest);
  assert.equal(manifest.manifest.application[0].$['android:label'], '${escoltaAppLabel}');
  assert.equal(manifest.manifest.application[0].activity[0]['intent-filter'][0].data[0].$['android:scheme'], '${escoltaAppScheme}');
});
