param(
  [Parameter(Mandatory = $true)][string]$Apk,
  [ValidateSet('Teste','Oficial')][string]$Variant = 'Teste',
  [string]$SdkRoot = 'D:\Android\SDK'
)
$ErrorActionPreference = 'Stop'
$taskApk = (Resolve-Path -LiteralPath $Apk).Path
$taskSigner = Join-Path $SdkRoot 'build-tools\36.0.0\apksigner.bat'
$taskAapt = Join-Path $SdkRoot 'build-tools\36.0.0\aapt.exe'
foreach ($taskTool in @($taskSigner, $taskAapt)) {
  if (-not (Test-Path -LiteralPath $taskTool)) { throw "Ferramenta não encontrada: $taskTool" }
}
if ([IO.Path]::GetExtension($taskApk) -ne '.apk') { throw 'Informe um arquivo APK.' }
$taskSignature = (& $taskSigner verify --verbose --print-certs $taskApk 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Assinatura do APK não é válida segundo apksigner.' }
$taskBadging = (& $taskAapt dump badging $taskApk 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível inspecionar o pacote.' }
$taskManifest = (& $taskAapt dump xmltree $taskApk AndroidManifest.xml 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível inspecionar o manifesto final.' }
$taskResources = (& $taskAapt dump --values resources $taskApk 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível inspecionar a tabela de recursos final.' }
$taskAssetMap = $taskResources | & node (Join-Path $PSScriptRoot 'apk-resources.cjs') | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $taskAssetMap) { throw 'Não foi possível resolver os recursos otimizados.' }
$taskPackage = [regex]::Match($taskBadging, "package: name='([^']+)'").Groups[1].Value
$taskCode = [long]([regex]::Match($taskBadging, "versionCode='(\d+)'").Groups[1].Value)
$taskVersionName = [regex]::Match($taskBadging, "versionName='([^']+)'").Groups[1].Value
$taskDigests = @([regex]::Matches($taskSignature, '(?im)^Signer #\d+ certificate SHA-256 digest: ([a-f0-9]+)\s*$') | ForEach-Object { $_.Groups[1].Value.ToLowerInvariant() })
$taskExpectedPackage = if ($Variant -eq 'Teste') { 'com.nicolasvmen.escoltaunitau.teste' } else { 'com.nicolasvmen.escoltaunitau' }
$taskExpectedDigest = if ($Variant -eq 'Teste') {
  'fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c'
} else { '34f8ddb808fac6d1eba6f3086ab8d86615270467831be74eaedade9a6a70c705' }
$taskIssues = @()
if ($taskPackage -ne $taskExpectedPackage) { $taskIssues += 'Identidade de pacote incorreta.' }
if ($taskDigests.Count -ne 1 -or $taskDigests[0] -ne $taskExpectedDigest) { $taskIssues += 'Certificado diferente do certificado esperado; não instalar sobre o aplicativo existente.' }
if ($taskBadging.Contains('application-debuggable')) { $taskIssues += 'APK é de desenvolvimento; não é o candidato standalone release.' }
if ($Variant -eq 'Oficial' -and $taskCode -le 1) { $taskIssues += 'versionCode precisa superar a referência oficial antiga (1); conferir também a versão instalada.' }
$taskValidated = [regex]::IsMatch($taskManifest, '(?s)"escolta\.validated_monitor"[^\r\n]*\r?\n\s*A: android:value[^\r\n]*\(type 0x12\)0x(?:ffffffff|0*1)\b')
if (-not $taskValidated) { $taskIssues += 'Monitoramento validado não está habilitado no manifesto compilado.' }
$taskPermissions = @([regex]::Matches($taskBadging, "uses-permission(?:-sdk-23)?: name='([^']+)'") | ForEach-Object { $_.Groups[1].Value })
foreach ($taskPermission in @('SYSTEM_ALERT_WINDOW','RECORD_AUDIO','READ_EXTERNAL_STORAGE','WRITE_EXTERNAL_STORAGE')) {
  if ($taskPermissions -contains "android.permission.$taskPermission") { $taskIssues += "Permissão desnecessária no APK: $taskPermission." }
}
foreach ($taskPermission in @('INTERNET','BLUETOOTH_SCAN','BLUETOOTH_CONNECT','POST_NOTIFICATIONS','FOREGROUND_SERVICE','FOREGROUND_SERVICE_CONNECTED_DEVICE','FOREGROUND_SERVICE_MEDIA_PLAYBACK','WAKE_LOCK','VIBRATE')) {
  if ($taskPermissions -notcontains "android.permission.$taskPermission") { $taskIssues += "Permissão necessária ausente no APK: $taskPermission." }
}
$taskCleartextBlocked = [regex]::IsMatch($taskManifest, 'android:usesCleartextTraffic[^\r\n]*\(type 0x12\)0x0\b')
$taskBackupBlocked = [regex]::IsMatch($taskManifest, 'android:allowBackup[^\r\n]*\(type 0x12\)0x0\b')
if (-not $taskCleartextBlocked) { $taskIssues += 'HTTP global não está explicitamente bloqueado.' }
if (-not $taskBackupBlocked) { $taskIssues += 'Backup Android não está explicitamente bloqueado.' }
$taskSchemes = @([regex]::Matches($taskManifest, 'A: android:scheme\([^)]*\)="([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
$taskExpectedScheme = if ($Variant -eq 'Teste') { 'escolta-teste' } else { 'escolta' }
$taskOtherScheme = if ($Variant -eq 'Teste') { 'escolta' } else { 'escolta-teste' }
if ($taskSchemes -notcontains $taskExpectedScheme -or $taskSchemes -contains $taskOtherScheme) { $taskIssues += 'Deep links não correspondem à identidade do APK.' }
$taskServices = @([regex]::Matches($taskManifest, '(?m)^(\s*)E: service\b[^\r\n]*(?:\r?\n\1  [^\r\n]*)*') | Where-Object { $_.Value.Contains('"expo.modules.escoltasentinela.EscoltaSentinelaService"') })
$taskServiceSafe = $false
if ($taskServices.Count -eq 1) {
  $taskService = $taskServices[0].Value
  $taskTypeMatch = [regex]::Match($taskService, 'android:foregroundServiceType[^\r\n]*\(type 0x11\)0x([a-fA-F0-9]+)')
  $taskServiceTypes = if ($taskTypeMatch.Success) { [Convert]::ToInt32($taskTypeMatch.Groups[1].Value,16) } else { 0 }
  $taskServiceSafe = [regex]::IsMatch($taskService, 'android:exported[^\r\n]*\(type 0x12\)0x0\b') -and
    [regex]::IsMatch($taskService, 'android:stopWithTask[^\r\n]*\(type 0x12\)0x0\b') -and (($taskServiceTypes -band 0x12) -eq 0x12)
}
if (-not $taskServiceSafe) { $taskIssues += 'Serviço Sentinela ausente/duplicado/exportado/parável ou com tipos incompletos.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskZip = [IO.Compression.ZipFile]::OpenRead($taskApk)
$taskResourceChecks = @()
try {
  $taskBundle = $taskZip.GetEntry('assets/index.android.bundle')
  if (-not $taskBundle -or $taskBundle.Length -lt 1024) { $taskIssues += 'Bundle JavaScript não está incorporado ou é inválido.' }
  $taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
  $taskRequired = @(
    @{ name='nativeAlarm'; source='modules\escolta-sentinela\android\src\main\res\raw\escolta_alerta.wav' },
    @{ name='fallbackAlarm'; source='assets\alert_tone.wav' },
    @{ name='ionicons'; source='node_modules\@expo\vector-icons\build\vendor\react-native-vector-icons\Fonts\Ionicons.ttf' },
    @{ name='googleIcon'; source=$null }
  )
  foreach ($taskRequiredResource in $taskRequired) {
    $taskName = $taskRequiredResource.name
    $taskPaths = @($taskAssetMap.$taskName)
    if (-not $taskPaths.Count) { $taskIssues += "Recurso lógico Android ausente: $taskName."; continue }
    $taskExpectedHash = if ($taskRequiredResource.source) {
      (Get-FileHash -LiteralPath (Join-Path $taskRoot $taskRequiredResource.source) -Algorithm SHA256).Hash
    } else { $null }
    foreach ($taskResourcePath in $taskPaths) {
      $taskEntry = $taskZip.GetEntry($taskResourcePath)
      if (-not $taskEntry -or $taskEntry.Length -eq 0) {
        $taskIssues += "Recurso físico ausente/vazio: $taskName."; continue
      }
      $taskResourceStream = $taskEntry.Open()
      $taskResourceHasher = [Security.Cryptography.SHA256]::Create()
      try { $taskResourceHash = [BitConverter]::ToString($taskResourceHasher.ComputeHash($taskResourceStream)).Replace('-', '') }
      finally { $taskResourceStream.Dispose(); $taskResourceHasher.Dispose() }
      if ($taskExpectedHash -and $taskResourceHash -ne $taskExpectedHash) {
        $taskIssues += "Conteúdo diferente do recurso fonte esperado: $taskName."
      }
      $taskResourceChecks += @{ name=$taskName; path=$taskResourcePath; bytes=$taskEntry.Length;
        sha256=$taskResourceHash; matchesSource=if ($taskExpectedHash) { $taskResourceHash -eq $taskExpectedHash } else { $null } }
    }
  }
} finally { $taskZip.Dispose() }
@{
  ok = $taskIssues.Count -eq 0; issues = $taskIssues; package = $taskPackage;
  versionCode = $taskCode; versionName = $taskVersionName; signerSha256 = $taskDigests;
  apkSha256 = (Get-FileHash -LiteralPath $taskApk -Algorithm SHA256).Hash;
  validatedMonitor = $taskValidated;
  cleartextBlocked = $taskCleartextBlocked; backupBlocked = $taskBackupBlocked;
  sentinelServiceSafe = $taskServiceSafe; schemes = $taskSchemes; permissions = $taskPermissions;
  resources = $taskResourceChecks;
  scope = 'Somente arquivo final. Não instala, não consulta Firebase e não aprova testes físicos.'
} | ConvertTo-Json -Depth 4
if ($taskIssues.Count) { exit 1 }
