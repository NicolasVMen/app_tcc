const { withAppBuildGradle, withAndroidManifest } = require('expo/config-plugins');

const block = `
// escolta-test-build:begin
def escoltaTestBuild = project.findProperty('escoltaTestBuild') == 'true'
def escoltaStandaloneTestBuild = project.findProperty('escoltaStandaloneTestBuild') == 'true'
def escoltaValidatedMonitor = escoltaTestBuild || project.findProperty('escoltaValidatedMonitor') == 'true'
if (escoltaStandaloneTestBuild && !escoltaTestBuild) {
    throw new GradleException('O candidato sem servidor exige o pacote separado de teste.')
}
android.defaultConfig.manifestPlaceholders += [
    escoltaAppLabel: escoltaTestBuild ? 'Escolta Teste' : '@string/app_name',
    escoltaAppScheme: escoltaTestBuild ? 'escolta-teste' : 'escolta',
    escoltaDevScheme: escoltaTestBuild ? 'exp+escolta-teste' : 'exp+escolta-unitau',
    escoltaValidatedMonitor: escoltaValidatedMonitor.toString()
]
if (!escoltaTestBuild && escoltaValidatedMonitor) {
    gradle.taskGraph.whenReady { graph ->
        if (graph.allTasks.any { it.project.path == project.path && it.name.contains('Release') }) {
            def signing = android.buildTypes.release.signingConfig
            if (signing == null || signing.name == 'debug' || signing.storeFile?.name == 'debug.keystore') {
                throw new GradleException('Oficial validada exige assinatura de distribuicao original; a chave de debug nao pode substituir a oficial instalada.')
            }
        }
    }
}
if (escoltaTestBuild) {
    android.buildTypes.debug.applicationIdSuffix = '.teste'
    android.buildTypes.debug.versionNameSuffix = '-teste'
    android.buildTypes.release.applicationIdSuffix = '.teste'
    android.buildTypes.release.versionNameSuffix = '-teste-sem-servidor'
    // Falha ANTES das tarefas de release, inclusive se solicitadas indiretamente.
    gradle.taskGraph.whenReady { graph ->
        if (!escoltaStandaloneTestBuild && graph.allTasks.any {
            it.project.path == project.path && it.name.contains('Release')
        }) {
            throw new GradleException('Release de teste exige escoltaStandaloneTestBuild=true.')
        }
    }
}
// A oficial promovida recebe as mesmas restrições de rede/permissões do candidato aprovado.
// Desenvolvimento e oficial sem opt-in permanecem inalterados.
if (escoltaStandaloneTestBuild || (!escoltaTestBuild && escoltaValidatedMonitor)) {
    android.buildTypes.release.debuggable = false
    def candidateManifest = new File(rootProject.projectDir, '../tools/android/standalone-test/AndroidManifest.xml')
    def existingManifest = android.sourceSets.release.manifest.srcFile
    if (existingManifest.exists() && existingManifest.canonicalFile != candidateManifest.canonicalFile) {
        throw new GradleException('Há um manifesto release próprio; integrar as regras do candidato sem sobrescrevê-lo.')
    }
    android.sourceSets.release.manifest.srcFile candidateManifest
}
// escolta-test-build:end
`;

function configureGradle(contents) {
  return contents.replace(/\n\/\/ escolta-test-build:begin[\s\S]*?\/\/ escolta-test-build:end\n?/g, '\n').trimEnd() + '\n' + block;
}
function configureManifest(manifest) {
  manifest.manifest.$ ||= {};
  manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  for (const permission of manifest.manifest['uses-permission'] || []) {
    if (permission.$['android:name'] === 'android.permission.SYSTEM_ALERT_WINDOW') {
      // Limpa a tentativa antiga de placeholder: tools:node é validado antes
      // da substituição de placeholders pelo manifest merger do Android.
      if (permission.$['tools:node'] === '${escoltaOverlayPermission}') delete permission.$['tools:node'];
    }
  }
  const application = manifest.manifest.application[0];
  application.$['android:label'] = '${escoltaAppLabel}';
  const metadata = application['meta-data'] ||= [];
  let monitorFlag = metadata.find(item => item.$['android:name'] === 'escolta.validated_monitor');
  if (!monitorFlag) { monitorFlag = { $: { 'android:name': 'escolta.validated_monitor' } }; metadata.push(monitorFlag); }
  monitorFlag.$['android:value'] = '${escoltaValidatedMonitor}';
  for (const activity of application.activity || []) {
    for (const filter of activity['intent-filter'] || []) {
      for (const data of filter.data || []) {
        if (data.$['android:scheme'] === 'escolta') data.$['android:scheme'] = '${escoltaAppScheme}';
        if (data.$['android:scheme'] === 'exp+escolta-unitau') data.$['android:scheme'] = '${escoltaDevScheme}';
      }
    }
  }
  return manifest;
}

module.exports = config => {
  config = withAppBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') throw new Error('O plugin Escolta requer Gradle Groovy.');
    mod.modResults.contents = configureGradle(mod.modResults.contents);
    return mod;
  });
  return withAndroidManifest(config, mod => {
    mod.modResults = configureManifest(mod.modResults);
    return mod;
  });
};
module.exports.configureGradle = configureGradle;
module.exports.configureManifest = configureManifest;
