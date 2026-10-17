param(
    [string]$Port = 'COM8',
    [ValidateRange(5,900)][int]$Seconds = 60,
    [switch]$RequirePowerVerification,
    [switch]$WatchWholePeriod
)
$ErrorActionPreference = 'Stop'
$radioSerial = [System.IO.Ports.SerialPort]::new($Port, 115200)
$radioSerial.ReadTimeout = 250
$radioSerial.DtrEnable = $true
$radioSerial.RtsEnable = $false
$radioClock = [System.Diagnostics.Stopwatch]::StartNew()
$radioPending = ''
$radioFound = $false
$radioSamples = 0
$radioCheckpoints = 0
$radioPowerFailed = $false
$radioLastSampleOutput = -5000
try {
    $radioSerial.Open()
    Write-Output "USB aberto em $Port. Apenas leitura; sem comandos, reset a 1200 baud ou alteracao de potencia."
    while ($radioClock.Elapsed.TotalSeconds -lt $Seconds) {
        $radioPending += $radioSerial.ReadExisting()
        $radioLines = $radioPending -split "`n"
        $radioPending = $radioLines[-1]
        for ($radioIndex = 0; $radioIndex -lt $radioLines.Length - 1; $radioIndex++) {
            $radioLine = $radioLines[$radioIndex].TrimEnd("`r")
            if ($WatchWholePeriod) {
                $radioPrefix = "[$([DateTimeOffset]::UtcNow.ToString('o'))] "
            } else { $radioPrefix = '' }
            if ($radioLine.Contains('[RADIO_POWER_VERIFY]')) {
                Write-Output "$radioPrefix$radioLine"
                $radioCheckpoints++
            } elseif ($radioLine.Contains('[RADIO_POWER]')) {
                Write-Output "$radioPrefix$radioLine"
                if ($radioLine.Contains(' applied=false')) { $radioPowerFailed = $true }
            } elseif ($radioLine.Contains('[RADIO_DIAG]')) {
                Write-Output "$radioPrefix$radioLine"
                $radioFound = $true
            } elseif ($radioLine.Contains('[BATTERY_ADC]')) {
                Write-Output "$radioPrefix$radioLine"
            } elseif ($radioLine.StartsWith('[FIRMWARE]') -or $radioLine.StartsWith('[DISTANCE_CAL]') -or $radioLine.StartsWith('[SIGNAL_FILTER]')) {
                Write-Output "$radioPrefix$radioLine"
            } elseif ($radioLine.StartsWith('RSSI App:') -and
                ($radioSamples -lt 5 -or ($WatchWholePeriod -and
                    $radioClock.Elapsed.TotalMilliseconds - $radioLastSampleOutput -ge 5000))) {
                Write-Output "$radioPrefix$radioLine"
                $radioSamples++
                $radioLastSampleOutput = $radioClock.Elapsed.TotalMilliseconds
            } elseif ($WatchWholePeriod -and ($radioLine.StartsWith('[BLE]') -or $radioLine.StartsWith('[SISTEMA]'))) {
                Write-Output "$radioPrefix$radioLine"
            }
        }
        if ($radioPending.Length -gt 2048) { $radioPending = ''; Write-Warning 'Linha USB excedeu limite; ignorada.' }
        if (-not $WatchWholePeriod -and $radioFound -and $radioSamples -ge 5 -and
            (-not $RequirePowerVerification -or $radioCheckpoints -ge 2 -or $radioPowerFailed)) { break }
        Start-Sleep -Milliseconds 100
    }
    if (-not $radioFound) { Write-Output 'Diagnostico de radio ainda nao recebido. Nao inferir potencia/PHY.' }
    if ($RequirePowerVerification -and $radioCheckpoints -lt 2) { Write-Output 'Duas verificacoes de potencia ainda nao recebidas; nao declarar ajuste persistente.' }
} finally {
    if ($radioSerial.IsOpen) { $radioSerial.Close() }
    $radioSerial.Dispose()
}
