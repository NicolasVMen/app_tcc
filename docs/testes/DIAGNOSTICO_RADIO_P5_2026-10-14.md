# Diagnóstico de rádio — XIAO p5

Instrumentação opt-in `ESCOLTA_TESTE_DIAGNOSTICO_RADIO`, sem configuração de potência, PHY, filtros, limiares ou estado de proteção.

## Preparação e evidências

- Responsável confirmou Sentinela em espera; Arduino CLI identificou XIAO Sense, serial 8BDE14575D4B412E, porta COM8.
- Variante usa núcleo Mbed Seeeduino 2.9.3, ArduinoBLE 2.1.0 e ambos os macros p4/p5 preservados.
- `LlGetTxPowerLevel`, `LlReadPhy` e `LlGetAdvTxPower` foram encontrados nos headers e símbolos do ELF p5 existente. São APIs internas deste núcleo, não uma função pública genérica do ArduinoBLE.
- A instrumentação resolve o endereço do peer conectado via ATT, sem assumir handle zero; lê o controlador em seção crítica curta, sem Serial, HCI poll ou espera dentro da seção. Não chama funções `LlSet*` nem acessa diretamente registradores de rádio.
- Registro único `[RADIO_DIAG]` por conexão com monitor USB aberto. Campos só são apresentados como valores quando o retorno da consulta é zero; falha imprime `unavailable`, sem inventar valor padrão.
- A versão de contrato BLE continua `xiao-p5-teste`: o algoritmo e a confirmação não mudam. Variante instrumentada distinguida por macro, pacote/hash e marcador Serial `build=p5-readonly`, não por telemetria expandida.
- 120 testes JavaScript aprovados, incluindo três contratos de instrumentação somente leitura; 16 static_assert C++ do parser de endereço aprovados; testes C++ de confirmação p5 aprovados. Não representam validação física do rádio.
- Pacote DFU p5 original preservado: `.expo/proximity-p5-teste/xiao_escolta_ble.ino.zip`, SHA256 `F3715E869A2A2BFACC944F1D7ED61081FF671612F6824F975D47928422FEBA98`, conferido antes da instrumentação.

Compilação final aprovada: 333352 bytes de programa (41%) e 70032 bytes globais (29%). Pacote diagnóstico SHA256 `D4C33465A7E6040D9BE5EF2EA04054E945986F724EFC6E48C90653C1C4F626B5`. Gravado após confirmação de espera e reidentificação USB: Arduino CLI realizou DFU em COM9 e retornou `Device programmed`, aplicação novamente em COM8. Arquivos de build separados em `.expo/radio-p5-diagnostico`. Nenhuma melhora do rádio alegada.

## Leitura efetiva após retomada pelo responsável

O responsável confirmou “conectado”. O leitor USB recebeu:

```text
[RADIO_DIAG] build=p5-readonly handle=0 tx_status=0 tx_dbm=0 max_status=0 max_dbm=20 phy_status=0 tx_phy=1 rx_phy=1 adv_status=0 adv_dbm=0
RSSI App: -68 | Filt: -68.0 dBm | ~1.0 m | seguro
RSSI App: -66 | Filt: -67.7 dBm | ~0.9 m | seguro
RSSI App: -66 | Filt: -67.2 dBm | ~0.9 m | seguro
RSSI App: -67 | Filt: -67.0 dBm | ~0.9 m | seguro
RSSI App: -67 | Filt: -67.0 dBm | ~0.9 m | seguro
```

Consulta bem-sucedida da conexão: handle 0 resolvido via ATT, potência atual 0 dBm e PHY TX/RX 1 (LE 1M). Advertising consultado em 0 dBm. São valores reportados pelo controlador, não medição externa de potência irradiada. Essas cinco amostras estão seguras, mas não provam estabilidade prolongada, distância física ou ausência de falso amarelo com braço. A distância real desta execução não foi medida/informada; os metros acima são somente a fórmula do aplicativo.

### Máximo genérico retornado: não usar como capacidade física

`LlGetTxPowerLevel(handle, 1)` retornou 20 com status zero. O header local `ll_defs.h` define `LL_MAX_TX_PWR_LVL=20`. O disassembly do ELF instrumentado (`LlGetTxPowerLevel` em 0x49f48, tamanho 0x50) mostra o ramo de tipo 1 carregando literalmente `movs r0, #20` em 0x49f8e; já o ramo de tipo 0 consulta `LctrGetTxPowerLevel`. Portanto o campo máximo desta implementação é constante genérica do stack, não identificação do limite de potência do hardware. O nRF52840 sem amplificador externo tem limite +8 dBm, conforme [Nordic, especificação do produto](https://docs.nordicsemi.com/r/bundle/ps_nrf52840/page/keyfeatures_html5.html). Não tentar +20 dBm.

A biblioteca binária `libmbed.a` do núcleo instalado contém símbolos `LlSetAllPhyTxPowerLevel` e `LlSetPhyTxPowerLevel`; disponibilidade do símbolo não comprova que qualquer ajuste será aceito/aplicado. Nenhum setter foi chamado nesta variante.

Próximo ensaio proposto: +4 dBm de potência fixa, em variante separada, verificando retorno e leitura posterior. Não gravado nem implementado nesta etapa. Requer nova confirmação de espera. Manter sem alterações os limiares para isolar inicialmente a variável, mas não aprovar os pontos de alerta/metros anteriores como calibrados para a nova potência. Comparar cenário de bloqueio já descrito e depois reavaliar escala e transições; sem repetir toda a campanha de trena.

## Procedimento

Com Sentinela em espera, gravar somente a variante de teste validada. Abrir USB a 115200 sem reset por 1200 baud; responsável retoma proteção com aparelhos próximos. Capturar consulta e primeiras leituras pelo script `tools/diagnostico-radio.ps1`. Consulta de advertising é distinta da potência de conexão; nenhuma consulta comprova alcance ou distância precisa. Confirmar retorno zero e PHY TX/RX antes de decidir se existe ensaio de potência justificado. Falta de diagnóstico não autoriza presumir 0 dBm ou 1M.

Retorno ao p5 preservado é possível pelo pacote DFU original. Alterações futuras de potência precisam ser ensaio separado, com identificação própria e comparação de RSSI/alertas/autonomia. Não deslocar a antena nem reimprimir a caixa nesta etapa.

Referência dos tipos de leitura de potência (atual/máxima): [Bluetooth SIG, HCI Read Transmit Power Level](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/Core-60/out/en/host-controller-interface/host-controller-interface-functional-specification.html). Suporte efetivo é apurado no controlador instalado, não inferido da especificação.
