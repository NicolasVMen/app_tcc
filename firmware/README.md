# Firmwares

- `xiao_escolta_ble/`: firmware atual da Seeed Studio XIAO nRF52840 Sense.
- `esp32_escolta_ble/`: implementação anterior, preservada como referência.

Artefatos gerados pela compilação ficam em diretórios `build*` e não são
versionados. Cada sketch mantém o mesmo nome da sua pasta para continuar
compatível com a Arduino IDE.

O perfil padrão do sketch é identificado como `xiao-p2` na telemetria: mantém os
filtros/alertas p1 e ajusta a escala experimental de distância. O sketch depende
de `ProximitySignal.h` e `ProximityDistance.h`, na mesma pasta. Não basta
recarregar o Expo: é necessário gravar o firmware para aplicar filtro e escala.
Política de alertas: [revisão p1](../docs/testes/REVISAO_PROXIMIDADE_P1.md).
Calibração e limites: [revisão p2](../docs/testes/REVISAO_DISTANCIA_P2.md).

Variante experimental D1: `ESCOLTA_TESTE_DISTANCIA_RADIO4=1`, somente com perfil
p4, confirmação p5 e rádio solicitado +4 dBm. Identifica-se `xiao-p5-r4-d1`;
altera apenas a escala de distância e sua identificação, preservando filtros,
limiares e temporização. Não é promoção do perfil padrão nem validação física
concluída. Derivação, rollback e testes:
[radio4 D1](../docs/testes/CALIBRACAO_DISTANCIA_RADIO4_D1_2026-10-15.md).

Candidato K1 opt-in: `ESCOLTA_TESTE_KALMAN_K1=1` junto dos requisitos D1;
tag `xiao-p5-r4-d1-k1`, Kalman Q1/R4 e limites -77/-85 dBm/4 s.
Não altera o perfil padrão; não comprova distâncias físicas de 3/5 m.
Situação de compilação/gravação, reversão e roteiro:
[candidato K1](../docs/testes/CANDIDATO_KALMAN_K1_2026-10-17.md).

K2 acrescenta `ESCOLTA_TESTE_KALMAN_K2=1` junto de K1, somente para voltar
o vermelho a -90/-86 dBm; amarelo, filtro e tempo permanecem. Tag exata
`xiao-p5-r4-d1-k2`. Sem promoção nem teste físico implícito:
[candidato K2](../docs/testes/CANDIDATO_KALMAN_K2_2026-10-17.md).
# Variante de auditoria K2-W1 (17/10/2026)

Compilar com `tools/compilar-firmware-k2-w1.ps1`. É um opt-in separado, com identificação `xiao-p5-r4-d1-k2-w1`: preserva K2/D1/+4 dBm e acrescenta watchdog de comunicação de 8 s. O script não grava nem abre porta serial. A placa instalada não muda por uma compilação.

Antes de qualquer gravação, exigir confirmação da Sentinela em espera e USB de dados. Detalhes históricos em `../docs/auditoria/CORRECOES_REAUDITORIA_2026-10-17.md`; não confundir falta de RSSI com medição de distância.

## Estado ensaiado em 17/10/2026

A XIAO do projeto já recebeu **xiao-p5-r4-d1-k2-w1** e passou pela injeção
controlada do watchdog e regressões relatadas. A oficial Android **1.0.1** usa
essa placa, sem nova gravação na promoção do APK. O perfil padrão do sketch
não foi trocado implicitamente: para reproduzir a variante gravada, usar o
script K2-W1 e seus opt-ins, não simplesmente compilar o padrão na Arduino IDE.

[Registro da W1](../docs/testes/ENSAIO_WATCHDOG_W1_2026-10-17.md) e
[aceite da oficial](../docs/auditoria/PREPARACAO_OFICIAL_VALIDADA_2026-10-17.md).
Botão físico aguarda reparo/reteste diretamente na oficial; autonomia completa
e bateria baixa real ainda não aprovadas. Nenhuma mudança de firmware é
necessária apenas para publicar o estado atual no GitHub.
