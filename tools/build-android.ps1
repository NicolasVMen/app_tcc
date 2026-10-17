param(
  [ValidateSet('Validate', 'Apk', 'ValidateStandalone', 'StandaloneApk')][string]$Target = 'Validate',
  [switch]$Online,
  [switch]$TestApp
)
$ErrorActionPreference = 'Stop'
$standaloneCandidate = $Target -in @('ValidateStandalone', 'StandaloneApk')
if ($standaloneCandidate -and -not $TestApp) {
  throw 'Use -TestApp: esta rotina prepara somente o candidato paralelo, não o pacote oficial.'
}
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$temporaryRoot = Join-Path $projectRoot '.expo\jtmp'
New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null

# Somente o processo atual e seus filhos. Não usa setx, registro ou Java global.
$savedEnvironment = @{}
foreach ($name in @('JAVA_HOME', 'ANDROID_HOME', 'JAVA_TOOL_OPTIONS', 'TEMP', 'TMP', 'NODE_ENV', 'EXPO_PUBLIC_ENABLE_INTERNAL_TOOLS')) {
  $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
Push-Location (Join-Path $projectRoot 'android')
try {
  if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    $env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
  }
  if (-not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    throw 'Java não encontrado. Defina JAVA_HOME para o Java do Android Studio.'
  }
  if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = 'D:\Android\SDK' }
  if (-not (Test-Path -LiteralPath $env:ANDROID_HOME)) {
    throw 'SDK Android não encontrado. Defina ANDROID_HOME.'
  }
  $env:TEMP = $temporaryRoot
  $env:TMP = $temporaryRoot
  $env:NODE_ENV = if ($standaloneCandidate) { 'production' } else { 'development' }
  if ($standaloneCandidate) { $env:EXPO_PUBLIC_ENABLE_INTERNAL_TOOLS = 'false' }
  $env:JAVA_TOOL_OPTIONS = (($savedEnvironment['JAVA_TOOL_OPTIONS'] + ' "-Djdk.net.unixdomain.tmpdir=' + $temporaryRoot + '"').Trim())
  if ($standaloneCandidate) {
    & node (Join-Path $projectRoot 'tools\auditoria\verificar_candidato_android.cjs') --configuration-only
    if ($LASTEXITCODE -ne 0) { throw 'Corrija a configuração Firebase/Google antes de compilar.' }
  }
  $tasks = switch ($Target) {
    'Apk' { @(':app:assembleDebug') }
    'StandaloneApk' { @(':app:assembleRelease') }
    'ValidateStandalone' { @(':app:createBundleReleaseJsAndAssets', ':app:processReleaseMainManifest', ':escolta-sentinela:compileReleaseKotlin', ':escolta-auth:compileReleaseKotlin') }
    default { @(':escolta-sentinela:compileDebugKotlin', ':escolta-auth:compileDebugKotlin') }
  }
  $arguments = @($tasks) + @('--no-daemon', '--console=plain', '-PreactNativeArchitectures=arm64-v8a')
  if ($TestApp) { $arguments += '-PescoltaTestBuild=true' }
  if ($standaloneCandidate) { $arguments += '-PescoltaStandaloneTestBuild=true' }
  if (-not $Online) { $arguments += '--offline' }
  & .\gradlew.bat @arguments
  if ($LASTEXITCODE -ne 0) { throw "Compilação falhou (código $LASTEXITCODE)." }
  if ($Target -eq 'Apk') {
    if ($TestApp) { Write-Output 'Escolta Teste: aplicativo paralelo; não substitui o instalado.' }
    Write-Output "APK de desenvolvimento: $(Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk')"
    Write-Output 'Não foi instalado no telefone. Esta build ainda usa o servidor Metro.'
  }
  if ($standaloneCandidate) {
    & node (Join-Path $projectRoot 'tools\auditoria\verificar_candidato_android.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Verificação estrutural do candidato sem servidor falhou.' }
    Write-Output 'Candidato de teste ARM64: bundle incorporado, pacote .teste, assinatura de teste; não é a versão oficial.'
    if ($Target -eq 'StandaloneApk') {
      Write-Output "APK candidato: $(Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk')"
      Write-Output 'Não foi instalado. Validar certificado, conteúdo final e operação sem Metro antes de adotar.'
    } else {
      Write-Output 'Validados bundle, manifesto e módulos Kotlin; nenhum APK foi solicitado.'
    }
  }
} finally {
  Pop-Location
  foreach ($name in $savedEnvironment.Keys) {
    [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
  }
}
