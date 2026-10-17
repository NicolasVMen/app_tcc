// Inspeção somente leitura dos intermediários de release; não instala APK.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const attribute = (tag, name) => tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
function validGoogleClient(client, projectNumber) {
  return typeof client === 'string' && typeof projectNumber === 'string'
    && /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(client)
    && client.startsWith(`${projectNumber}-`);
}

function inspectConfiguration(root) {
  const { parseProjectEnv } = require('@expo/env');
  const parsed = parseProjectEnv(root, { mode: 'production', silent: true });
  const client = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? parsed.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
  const config = fs.readFileSync(path.join(root, 'src/services/firebaseEnvironment.ts'), 'utf8');
  const project = config.match(/projectId:\s*'([^']+)'/)?.[1];
  const projectNumber = config.match(/messagingSenderId:\s*'(\d+)'/)?.[1];
  const issues = [];
  if (project !== 'escolta-unitau') issues.push('Projeto Firebase diferente do selecionado.');
  if (!validGoogleClient(client, projectNumber)) issues.push('Cliente WEB Google ausente ou de outro projeto no ambiente de produção.');
  // O identificador é público, mas evitamos imprimi-lo e não lemos senhas/tokens.
  return { ok: issues.length === 0, issues, project, client };
}
function inspectManifest(xml) {
  const issues = [];
  const manifest = xml.match(/<manifest\b[^>]*>/)?.[0] || '';
  const application = xml.match(/<application\b[^>]*>/)?.[0] || '';
  if (attribute(manifest, 'package') !== 'com.nicolasvmen.escoltaunitau.teste') issues.push('Pacote não é .teste.');
  if (attribute(application, 'android:label') !== 'Escolta Teste') issues.push('Nome de teste ausente.');
  if (attribute(application, 'android:debuggable') === 'true') issues.push('Release continua depurável.');
  if (attribute(application, 'android:usesCleartextTraffic') === 'true') issues.push('HTTP aberto globalmente na release.');
  if (/\$\{/.test(xml)) issues.push('Placeholder não resolvido no manifesto.');
  const validatedFlag = [...xml.matchAll(/<meta-data\b[^>]*>/g)].map(m => m[0])
    .find(tag => attribute(tag, 'android:name') === 'escolta.validated_monitor') || '';
  if (attribute(validatedFlag, 'android:value') !== 'true') issues.push('Candidato sem o monitoramento validado ativado.');
  const permissionTags = [...xml.matchAll(/<uses-permission(?:-sdk-23)?\b[^>]*>/g)].map(m => m[0]);
  const permissions = permissionTags.filter(tag => attribute(tag, 'tools:node') !== 'remove')
    .map(tag => attribute(tag, 'android:name'));
  for (const permission of ['SYSTEM_ALERT_WINDOW', 'RECORD_AUDIO', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']) {
    if (permissions.includes(`android.permission.${permission}`)) issues.push(`Permissão desnecessária: ${permission}.`);
  }
  for (const permission of ['INTERNET', 'BLUETOOTH_SCAN', 'BLUETOOTH_CONNECT', 'POST_NOTIFICATIONS',
    'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_CONNECTED_DEVICE', 'FOREGROUND_SERVICE_MEDIA_PLAYBACK', 'WAKE_LOCK']) {
    if (!permissions.includes(`android.permission.${permission}`)) issues.push(`Permissão necessária ausente: ${permission}.`);
  }
  const service = [...xml.matchAll(/<service\b[^>]*>/g)].map(m => m[0])
    .find(tag => attribute(tag, 'android:name') === 'expo.modules.escoltasentinela.EscoltaSentinelaService') || '';
  if (attribute(service, 'android:exported') !== 'false') issues.push('Serviço Sentinela ausente ou exportado.');
  if (attribute(service, 'android:stopWithTask') !== 'false') issues.push('Serviço não preserva remoção de Recentes.');
  const types = (attribute(service, 'android:foregroundServiceType') || '').split('|');
  if (!types.includes('connectedDevice') || !types.includes('mediaPlayback')) issues.push('Tipos do serviço incompletos.');
  const schemes = [...xml.matchAll(/<data\b[^>]*>/g)].map(m => attribute(m[0], 'android:scheme'));
  if (!schemes.includes('escolta-teste') || schemes.includes('escolta') || schemes.includes('exp+escolta-unitau')) {
    issues.push('Links não estão isolados para o teste.');
  }
  return { ok: issues.length === 0, issues, permissions: [...new Set(permissions)].filter(Boolean).sort() };
}

function inspectBuild(root) {
  const manifestFile = path.join(root, 'android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml');
  const bundleFile = path.join(root, 'android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle');
  const issues = [];
  const manifest = fs.existsSync(manifestFile) ? inspectManifest(fs.readFileSync(manifestFile, 'utf8')) : null;
  if (!manifest) issues.push('Manifesto release não encontrado.');
  else issues.push(...manifest.issues);
  const bundle = fs.existsSync(bundleFile) ? fs.readFileSync(bundleFile) : null;
  if (!bundle || bundle.length < 1024) issues.push('Bundle incorporado ausente ou vazio.');
  let configuration = null;
  try { configuration = inspectConfiguration(root); issues.push(...configuration.issues); }
  catch { issues.push('Não foi possível conferir a configuração pública Firebase/Google.'); }
  const googleClientEmbedded = Boolean(configuration?.ok && bundle?.includes(Buffer.from(configuration.client)));
  if (configuration?.ok && bundle && !googleClientEmbedded) issues.push('Cliente Google não encontrado no bundle incorporado.');
  return { ok: issues.length === 0, issues, manifest: manifestFile, permissions: manifest?.permissions || [],
    bundle: bundleFile, bundleBytes: bundle?.length || 0,
    bundleSha256: bundle ? crypto.createHash('sha256').update(bundle).digest('hex') : null,
    firebaseProject: configuration?.project || null, googleClientEmbedded,
    scope: 'Somente intermediários: assinatura, APK final, Firebase remoto e execução no aparelho não aprovados.' };
}

module.exports = { inspectManifest, inspectBuild, inspectConfiguration, validGoogleClient };
if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  let report;
  if (process.argv.includes('--configuration-only')) {
    const { client, ...safeReport } = inspectConfiguration(root);
    report = safeReport;
  } else report = inspectBuild(root);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.ok ? 0 : 1;
}
