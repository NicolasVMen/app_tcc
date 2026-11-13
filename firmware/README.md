# Firmware da XIAO

`xiao_escolta_ble/` contém o firmware da Seeed Studio XIAO nRF52840 Sense
usada no protótipo. A placa ensaiada está identificada como
`xiao-p5-r4-d1-k2-w1`: rádio solicitado a +4 dBm, estimativa experimental D1,
filtro Kalman K2 e watchdog de comunicação W1. Os cabeçalhos e o sketch
precisam permanecer juntos na mesma pasta.

O perfil padrão do sketch **não é igual** ao que foi gravado na placa. Para
compilar a variante ensaiada, usar `tools/compilar-firmware-k2-w1.ps1` na raiz
do projeto. O script só compila e confere marcadores do binário; não grava na
XIAO. Antes de qualquer gravação posterior, colocar a Sentinela em espera,
confirmar silêncio e verificar a porta USB de dados.

A oficial Android 1.0.5 foi validada com essa variante, sem nova gravação do
firmware durante a atualização do aplicativo. Os ensaios de proximidade e
watchdog, inclusive suas limitações, estão em `docs/testes/`. RSSI não fornece
uma fronteira garantida em metros.

O sketch antigo da ESP32 foi retirado do versionamento atual porque não é o
hardware do TCC; continua recuperável no histórico do Git e na cópia local.
