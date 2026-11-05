const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const plugin = require('./plugins/with-test-build.cjs');
const { inspectManifest, inspectBuild, validGoogleClient } = require('./auditoria/verificar_candidato_android.cjs');

function fixture() {
  const permissions = ['INTERNET','BLUETOOTH_SCAN','BLUETOOTH_CONNECT','POST_NOTIFICATIONS',
    'FOREGROUND_SERVICE','FOREGROUND_SERVICE_CONNECTED_DEVICE','FOREGROUND_SERVICE_MEDIA_PLAYBACK','WAKE_LOCK'];
  return `<manifest package="com.nicolasvmen.escoltaunitau.teste">
    ${permissions.map(p => `<uses-permission android:name="android.permission.${p}"/>`).join('\n')}
    <application android:label="Escolta Teste" android:debuggable="false">
      <meta-data android:name="escolta.validated_monitor" android:value="true"/>
      <service android:name="expo.modules.escoltasentinela.EscoltaSentinelaService" android:exported="false"
        android:stopWithTask="false" android:foregroundServiceType="connectedDevice|mediaPlayback"/>
      <activity><intent-filter><data android:scheme="escolta-teste"/></intent-filter></activity>
    </application></manifest>`;
}

test('standalone: opt-in duplo, identidade de teste na release e bloqueio antes das tarefas', () => {
  const gradle = plugin.configureGradle('android {}\n');
  assert.equal(plugin.configureGradle(gradle), gradle);
  assert.match(gradle, /escoltaStandaloneTestBuild && !escoltaTestBuild/);
  assert.match(gradle, /android\.buildTypes\.release\.applicationIdSuffix = '\.teste'/);
  assert.match(gradle, /gradle\.taskGraph\.whenReady/);
  assert.match(gradle, /!escoltaStandaloneTestBuild && graph\.allTasks\.any/);
  assert.match(gradle, /it\.name\.contains\('Release'\)/);
  assert.match(gradle, /android\.buildTypes\.release\.debuggable = false/);
});

test('oficial validada: perfil explicito e bloqueio de assinatura debug sem alterar production antigo', () => {
  const profiles = JSON.parse(fs.readFileSync('eas.json', 'utf8')).build;
  assert.equal(profiles['oficial-validada'].extends, 'production');
  assert.equal(profiles['oficial-validada'].env.ORG_GRADLE_PROJECT_escoltaValidatedMonitor, 'true');
  assert.equal(profiles['oficial-validada'].android.buildType, 'apk');
  assert.equal(profiles.production.env?.ORG_GRADLE_PROJECT_escoltaValidatedMonitor, undefined);
  const gradle = plugin.configureGradle('');
  assert.match(gradle, /if \(!escoltaTestBuild && escoltaValidatedMonitor\)/);
  assert.match(gradle, /signing\.name == 'debug'/);
  assert.match(gradle, /signing\.storeFile\?\.name == 'debug\.keystore'/);
  assert.match(gradle, /Oficial validada exige assinatura/);
});

test('standalone: overlay condicionado, sem mudar permissões de desenvolvimento', () => {
  const model = { manifest: { 'uses-permission': [{ $: { 'android:name': 'android.permission.SYSTEM_ALERT_WINDOW' } }], application: [{ $: {} }] } };
  plugin.configureManifest(model);
  assert.equal(model.manifest['uses-permission'][0].$['tools:node'], undefined);
  const gradle = plugin.configureGradle('');
  assert.match(gradle, /if \(escoltaStandaloneTestBuild \|\| \(!escoltaTestBuild && escoltaValidatedMonitor\)\) \{[\s\S]*android\.sourceSets\.release\.manifest\.srcFile candidateManifest/);
  assert.match(gradle, /existingManifest\.exists\(\) && existingManifest\.canonicalFile != candidateManifest\.canonicalFile/);
  const overlay = fs.readFileSync(path.join(__dirname, 'android/standalone-test/AndroidManifest.xml'), 'utf8');
  assert.match(overlay, /SYSTEM_ALERT_WINDOW" tools:node="remove"/);
  assert.match(overlay, /android:usesCleartextTraffic="false"/);
  model.manifest['uses-permission'][0].$['tools:node'] = '${escoltaOverlayPermission}';
  plugin.configureManifest(model);
  assert.equal(model.manifest['uses-permission'][0].$['tools:node'], undefined);
});

test('oficial validada: overlay é idêntico ao candidato, sem promover desenvolvimento ou oficial padrão', () => {
  const gradle = plugin.configureGradle('');
  assert.equal((gradle.match(/android\.sourceSets\.release\.manifest\.srcFile candidateManifest/g) || []).length, 1);
  assert.match(gradle, /if \(escoltaStandaloneTestBuild \|\| \(!escoltaTestBuild && escoltaValidatedMonitor\)\)/);
  assert.match(gradle, /if \(!escoltaTestBuild && escoltaValidatedMonitor\)[\s\S]*signing\.name == 'debug'/);
  assert.match(gradle, /escoltaStandaloneTestBuild && !escoltaTestBuild/);
  assert.equal(plugin.configureGradle(gradle), gradle);
});

test('oficial validada: versão de atualização, assinatura remota e cliente público Google explícitos', () => {
  const config = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo;
  const profile = JSON.parse(fs.readFileSync('eas.json', 'utf8')).build['oficial-validada'];
  assert.equal(config.android.package, 'com.nicolasvmen.escoltaunitau');
  assert.ok(config.android.versionCode > 2);
  assert.equal(config.version, '1.0.2');
  assert.equal(profile.environment, 'production');
  assert.equal(profile.credentialsSource, 'remote');
  assert.equal(profile.env.EXPO_PUBLIC_ENABLE_INTERNAL_TOOLS, 'false');
  assert.equal(validGoogleClient(profile.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, '247729429884'), true);
});

test('envio EAS: inclui fontes necessárias e não inclui documentos, amostras, backups ou credenciais', () => {
  const rules = require('ignore')().add(fs.readFileSync('.easignore', 'utf8'));
  // fs.cp no EAS também consulta diretórios sem barra final antes de percorrê-los.
  for (const required of ['src','assets','modules','tools','tools/plugins','tools/android',
    'App.tsx','src/services/bleApi.ts','assets/google-g.png',
    'modules/escolta-auth/android/build.gradle',
    'modules/escolta-sentinela/android/src/main/res/raw/escolta_alerta.wav',
    'tools/plugins/with-test-build.cjs','tools/android/standalone-test/AndroidManifest.xml',
    'package.json','package-lock.json','eas.json','app.json','metro.config.js']) {
    assert.equal(rules.ignores(required), false, required);
  }
  for (const excluded of ['CICTED/documento.docx','Fotos_Placa/foto.jpeg','docs/testes/dados/coleta.csv',
    'backups/releases/oficial.apk','dist/android/app.apk','android/app/build.gradle',
    '.env.local','credentials.json','tools/test-auth-email.cjs',
    'modules/escolta-auth/android/build/outputs/artefato.jar','assets/privada.key',
    'modules/escolta-auth/credentials.json','src/.env.local','assets/assinatura.jks']) {
    assert.equal(rules.ignores(excluded), true, excluded);
  }
});

test('envio EAS: verificador exige arquivo real e bloqueia dados externos às fontes de compilação', () => {
  const { allowed, inspectArchive } = require('./auditoria/verificar_envio_eas.cjs');
  for (const file of ['src/App.tsx','assets/icon.png','modules/escolta-auth/android/build.gradle']) assert.equal(allowed(file), true);
  for (const file of ['docs/relatorio.md','src/.env.local','assets/senha.key','modules/x/android/build/output.jar','CICTED/banner.png']) assert.equal(allowed(file), false);
  const missing = inspectArchive(path.join(__dirname,'__arquivo_eas_inexistente__'));
  assert.equal(missing.ok,false);
  assert.equal(missing.files,0);
});

test('standalone: script exige teste e separa validação sem APK da geração futura', () => {
  const script = fs.readFileSync(path.join(__dirname, 'build-android.ps1'), 'utf8');
  assert.ok(script.indexOf('$standaloneCandidate -and -not $TestApp') < script.indexOf('New-Item'));
  assert.match(script, /'ValidateStandalone' \{ @\(':app:createBundleReleaseJsAndAssets', ':app:processReleaseMainManifest'/);
  assert.match(script, /'StandaloneApk' \{ @\(':app:assembleRelease'\)/);
  assert.match(script, /-PescoltaStandaloneTestBuild=true/);
  assert.match(script, /\$env:NODE_ENV = if \(\$standaloneCandidate\) \{ 'production' \}/);
  assert.doesNotMatch(script, /adb\s+install|uninstall|setx\s/i);
});

test('standalone: aceita manifesto isolado e rejeita pacote oficial, debug e HTTP aberto', () => {
  assert.equal(inspectManifest(fixture()).ok, true);
  for (const invalid of [fixture().replace('escoltaunitau.teste', 'escoltaunitau'),
    fixture().replace('android:debuggable="false"', 'android:debuggable="true"'),
    fixture().replace('<application ', '<application android:usesCleartextTraffic="true" '),
    fixture().replace('escolta-teste', 'escolta'),
    fixture().replace('android:label="Escolta Teste"', 'android:label="${escoltaAppLabel}"')]) {
    assert.equal(inspectManifest(invalid).ok, false);
  }
});

test('standalone: rejeita permissões extras, serviço exportado/parável e permissão ausente', () => {
  for (const permission of ['SYSTEM_ALERT_WINDOW','RECORD_AUDIO','READ_EXTERNAL_STORAGE','WRITE_EXTERNAL_STORAGE']) {
    assert.equal(inspectManifest(fixture().replace('</manifest>', `<uses-permission android:name="android.permission.${permission}"/></manifest>`)).ok, false);
  }
  for (const invalid of [fixture().replace('android:exported="false"', 'android:exported="true"'),
    fixture().replace('android:stopWithTask="false"', 'android:stopWithTask="true"'),
    fixture().replace('|mediaPlayback', ''), fixture().replace('android.permission.WAKE_LOCK', 'not-a-permission')]) {
    assert.equal(inspectManifest(invalid).ok, false);
  }
});

test('standalone: ausência de artefatos falha, não aprova configuração sem bundle', () => {
  const report = inspectBuild(path.join(__dirname, '__missing_candidate__'));
  assert.equal(report.ok, false);
  assert.equal(report.bundleBytes, 0);
  assert.equal(report.bundleSha256, null);
});

test('standalone: Google exige cliente WEB válido do projeto, sem expor o identificador', () => {
  assert.equal(validGoogleClient('247729429884-example.apps.googleusercontent.com', '247729429884'), true);
  for (const invalid of ['', null, '999-example.apps.googleusercontent.com',
    '247729429884-example.apps.googleusercontent.com/extra', ' 247729429884-example.apps.googleusercontent.com']) {
    assert.equal(validGoogleClient(invalid, '247729429884'), false);
  }
  const script = fs.readFileSync(path.join(__dirname, 'build-android.ps1'), 'utf8');
  assert.ok(script.indexOf('--configuration-only') < script.indexOf('& .\\gradlew.bat'));
  const check = fs.readFileSync(path.join(__dirname, 'auditoria/verificar_candidato_android.cjs'), 'utf8');
  assert.match(check, /googleClientEmbedded = Boolean\(configuration\?\.ok && bundle\?\.includes/);
  assert.match(check, /const \{ client, \.\.\.safeReport \} = inspectConfiguration/);
});
