param([ValidatePattern('^[A-Za-z0-9_-]+$')][string]$BackupName = '2026-10-17_pre-promocao')
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$taskDestination = Join-Path $taskRoot "backups\releases\$BackupName"
if (Test-Path -LiteralPath $taskDestination) { throw 'Backup já existe. Não será sobrescrito.' }
$taskOldApk = Join-Path $taskRoot '.expo\escolta-instalado-antes.apk'
$taskExpectedHash = 'EC9810B0CB8B1F6B8F177AFB80215F968BDC3A00A351CB33DC6369DAA75D3D35'
if ((Get-FileHash -LiteralPath $taskOldApk -Algorithm SHA256).Hash -ne $taskExpectedHash) {
  throw 'O APK antigo não corresponde ao backup conferido. Nenhum backup foi criado.'
}
$taskInputs = @('App.tsx','src','modules','firmware\xiao_escolta_ble','tools','assets',
  'docs\testes','docs\auditoria','firmware\README.md',
  'package.json','package-lock.json','app.json','eas.json','tsconfig.json','babel.config.js','metro.config.js',
  '.env.example','.gitignore','.easignore','README.md') | ForEach-Object { Join-Path $taskRoot $_ }
foreach ($taskInput in $taskInputs) {
  if (-not (Test-Path -LiteralPath $taskInput)) { throw "Fonte ausente: $taskInput" }
}
$taskParent = Join-Path $taskRoot 'backups\releases'
New-Item -ItemType Directory -Path $taskParent -Force | Out-Null
New-Item -ItemType Directory -Path $taskDestination | Out-Null
$taskApkCopy = Join-Path $taskDestination 'oficial_instalada_backup.apk'
Copy-Item -LiteralPath $taskOldApk -Destination $taskApkCopy
$taskSourceArchive = Join-Path $taskDestination 'fontes_candidata_em_preparacao.zip'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskZipStream = [IO.File]::Open($taskSourceArchive, [IO.FileMode]::CreateNew)
$taskZip = New-Object IO.Compression.ZipArchive($taskZipStream, [IO.Compression.ZipArchiveMode]::Create, $false)
try {
  foreach ($taskInput in $taskInputs) {
    $taskFiles = if (Test-Path -LiteralPath $taskInput -PathType Container) {
      Get-ChildItem -LiteralPath $taskInput -File -Recurse -Force
    } else { Get-Item -LiteralPath $taskInput }
    foreach ($taskFile in $taskFiles) {
      $taskEntry = $taskFile.FullName.Substring($taskRoot.Length + 1).Replace('\', '/')
      if ($taskEntry -match '(^|/)(build([^/]*)?|node_modules|\.gradle|\.git)/' -or
          $taskEntry -match '(^|/)(\.env\.local|credentials\.json)$|\.(jks|keystore|key|p12)$') { continue }
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($taskZip, $taskFile.FullName,
        $taskEntry, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
  }
} finally { $taskZip.Dispose(); $taskZipStream.Dispose() }
$taskCommittedArchive = Join-Path $taskDestination 'git_HEAD_referencia.zip'
& git -C $taskRoot archive --format=zip "--output=$taskCommittedArchive" HEAD
if ($LASTEXITCODE -ne 0) { throw 'Falha ao arquivar a referência Git. O backup parcial foi preservado.' }
$taskHead = & git -C $taskRoot rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'Falha ao identificar o commit.' }
@{
  directory = $taskDestination
  gitHead = $taskHead
  files = @($taskApkCopy, $taskSourceArchive, $taskCommittedArchive) | ForEach-Object {
    @{ name = [IO.Path]::GetFileName($_); bytes = (Get-Item -LiteralPath $_).Length;
       sha256 = (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash }
  }
  limitations = @('O APK antigo é preservado, não instalado.',
    'Fontes candidata são o estado de preparação, não prova do fonte exato usado no APK antigo.',
    'HEAD é uma referência Git anterior, sem presumir correspondência ao APK antigo.',
    'Não inclui sessão/dados do celular, .env.local, credenciais ou chave privada EAS.',
    'O arquivo de fontes preserva caminhos relativos, excluindo builds e credenciais; conferir antes de restaurar.')
} | ConvertTo-Json -Depth 5
