# Não grava na placa. Verifica todos os static_assert com o compilador instalado.
$ErrorActionPreference = 'Stop'
$signalCompiler = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Arduino15\packages\Seeeduino\tools\arm-none-eabi-gcc\7-2017q4\bin\arm-none-eabi-g++.exe'
if (-not (Test-Path -LiteralPath $signalCompiler)) {
    throw 'Compilador da placa não encontrado. Instale/configure o core Seeed mbed antes de executar estes testes.'
}
$signalTest = Join-Path $PSScriptRoot 'test-proximity-signal.cpp'
& $signalCompiler -std=c++14 -Wall -Wextra -pedantic -fsyntax-only $signalTest
if ($LASTEXITCODE -ne 0) { throw 'Falha nos testes C++ do sinal.' }
$signalCheckCount = (Select-String -LiteralPath $signalTest -Pattern '^static_assert\(').Count
Write-Output "$signalCheckCount verificações C++ de sinal, escala, temporização, buzzer e replay aprovadas."
$distanceTest = Join-Path $PSScriptRoot 'test-distance-radio4-d1.cpp'
& $signalCompiler -std=c++14 -Wall -Wextra -pedantic -fsyntax-only $distanceTest
if ($LASTEXITCODE -ne 0) { throw 'Falha nos testes C++ da distancia D1.' }
$distanceCheckCount = (Select-String -LiteralPath $distanceTest -Pattern '^static_assert\(').Count
Write-Output "$distanceCheckCount verificações C++ adicionais da variante D1 aprovadas."
foreach ($profileTestName in @('test-proximity-signal-p3-teste.cpp', 'test-proximity-signal-p4-teste.cpp', 'test-safety-confirmation.cpp', 'test-proximity-kalman-k1.cpp', 'test-proximity-kalman-k2.cpp', 'test-communication-watchdog.cpp')) {
    $profileTestPath = Join-Path $PSScriptRoot $profileTestName
    & $signalCompiler -std=c++14 -Wall -Wextra -pedantic -fsyntax-only $profileTestPath
    if ($LASTEXITCODE -ne 0) { throw "Falha nos testes C++: $profileTestName" }
    $profileCheckCount = (Select-String -LiteralPath $profileTestPath -Pattern '^static_assert\(').Count
    Write-Output "$profileTestName : $profileCheckCount verificações aprovadas."
}
