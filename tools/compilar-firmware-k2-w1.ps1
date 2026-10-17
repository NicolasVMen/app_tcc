# Somente compila. Não contém comando upload, reset ou acesso à porta serial.
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$taskCli = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe'
if (-not (Test-Path -LiteralPath $taskCli)) { throw 'arduino-cli da instalação local não encontrado.' }
$taskBuild = Join-Path $taskRoot '.expo\proximity-radio4-d1-k2-w1'
$taskFlags = @('ESCOLTA_TESTE_PROXIMIDADE_4DB=1', 'ESCOLTA_TESTE_CONFIRMACAO_PROXIMA=1',
  'ESCOLTA_TESTE_DIAGNOSTICO_RADIO=1', 'ESCOLTA_TESTE_RADIO_TX_DBM=4',
  'ESCOLTA_TESTE_RADIO_DIAGNOSTICO_PERIODICO=1', 'ESCOLTA_TESTE_BATERIA_AQUISICAO_40US=1',
  'ESCOLTA_TESTE_BATERIA_TOPO_4100MV=1', 'ESCOLTA_TESTE_DISTANCIA_RADIO4=1',
  'ESCOLTA_TESTE_KALMAN_K1=1', 'ESCOLTA_TESTE_KALMAN_K2=1', 'ESCOLTA_TESTE_WATCHDOG_RSSI=1')
$taskExtra = 'compiler.cpp.extra_flags=' + (($taskFlags | ForEach-Object { '-D' + $_ }) -join ' ')
& $taskCli compile --fqbn Seeeduino:mbed:xiaonRF52840Sense --build-path $taskBuild --build-property $taskExtra (Join-Path $taskRoot 'firmware\xiao_escolta_ble')
if ($LASTEXITCODE -ne 0) { throw 'Compilação W1 falhou. Nenhum firmware foi gravado.' }
$taskBin = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes((Join-Path $taskBuild 'xiao_escolta_ble.ino.bin')))
foreach ($taskMarker in @('xiao-p5-r4-d1-k2-w1', 'profile=k2 q_per_s=1 r=4 yellow=-77 red=-90 hold_ms=4000')) {
  if (-not $taskBin.Contains($taskMarker)) { throw 'Binário não corresponde à variante solicitada.' }
}
Get-FileHash -LiteralPath (Join-Path $taskBuild 'xiao_escolta_ble.ino.zip') -Algorithm SHA256
Write-Output 'W1 compilado e identificado. NÃO foi gravado na placa.'
