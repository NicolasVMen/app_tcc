# Perfil experimental p3: limites 6 dB menos sensíveis

Solicitado pelo responsável em 13/10/2026, após alerta amarelo com os dois dispositivos parados a aproximadamente 1 m, nas extremidades de um mousepad. Não se pediu nova campanha de medição. O teste 12 permanece parcial: houve retorno ao protegido ao aproximar, mas o alerta amarelo perto não foi considerado aprovado.

## Valores

| Parâmetro | Padrão p2 preservado | Perfil experimental p3 |
| --- | --- | --- |
| Entrada em amarelo | −78 dBm | −84 dBm |
| Retorno de amarelo a verde | maior que −73 dBm | maior que −79 dBm |
| Entrada em perigo/vermelho | −86 dBm | −92 dBm |
| Saída da faixa de perigo no filtro | maior que −82 dBm | maior que −88 dBm |
| Confirmação do amarelo | 4 s | 5 s |
| Confirmação do perigo | 8 s | 5 s |

“6 dB menos sensível” foi interpretado como exigir um sinal 6 dB **mais fraco**, não somar 6 aos números negativos. As larguras das margens de retorno foram preservadas.
O vermelho fica com limite mais fraco, mas confirmação temporal mais curta que antes, conforme solicitado.

Os 5 s contam após o sinal filtrado cruzar o limite, com leituras contínuas válidas. A janela inicial, a mediana, a EMA e a cadência BLE acrescentam atraso: não se promete acionamento exatamente 5 s depois de um afastamento físico.

Botão físico (1,5 s), alerta por perda de vínculo, retenção de emergência até confirmação, modo de espera, cadências do buzzer e fórmula de distância não foram alterados.
RSSI não comprova uma distância real nem presença da criança. Este perfil permite atrasar ou deixar de sinalizar um afastamento que o p2 sinalizaria. Validar somente com adultos, no contexto do protótipo acadêmico.

## Separação do perfil

O perfil somente é compilado quando a macro `ESCOLTA_TESTE_PROXIMIDADE_6DB` está definida.
Sem a macro, o mesmo sketch mantém os valores p2 e informa `fw: xiao-p2`.
Com ela, informa `fw: xiao-p3-teste`.

Comando utilizado, após configurar no processo os caminhos locais já instalados do Arduino:

```powershell
arduino-cli compile --fqbn Seeeduino:mbed:xiaonRF52840Sense --build-path .expo/proximity-p3-teste --build-property compiler.cpp.extra_flags=-DESCOLTA_TESTE_PROXIMIDADE_6DB=1 firmware/xiao_escolta_ble
```

Abrir o sketch e gravar pelo Arduino IDE **sem definir a macro** recompila o p2, não esse experimento.
A aplicação precisa identificar a XIAO USB e gravar o pacote correspondente. Recarregar o Expo não muda esses limites.
O APK oficial não foi alterado. A placa física é compartilhada: depois de gravada, suas decisões também afetariam qualquer aplicativo conectado a ela, inclusive o oficial. O firmware de teste não é isolado pelo pacote Android.

## Verificações

33 verificações C++ do padrão p2 e 12 do perfil experimental passaram no compilador real instalado, sem gravação.
Foram verificados limites, 5 s contínuos, lacunas que reiniciam confirmação, silêncio em espera, prioridade do pânico e preservação da fórmula de distância.
95 testes do aplicativo continuaram aprovados.
A comprovação em hardware e o teste breve de perto ainda estão pendentes.

## Compilação e gravação realizadas

Em 13/10/2026, a compilação integral para `Seeeduino:mbed:xiaonRF52840Sense` terminou com código 0: 332.328 bytes de programa (40%) e 70.024 bytes de variáveis globais (29%). O ELF contém `xiao-p3-teste`, e `build.options.json` registra `compiler.cpp.extra_flags=-DESCOLTA_TESTE_PROXIMIDADE_6DB=1`.

O responsável conectou a XIAO e confirmou o modo de espera antes da gravação. A porta foi identificada como COM8, USB VID_2886/PID_8045, separada do Samsung na COM5.
O pacote experimental foi gravado pelo Arduino CLI/nrfutil: bootloader COM9, retorno da aplicação à COM8, saída `Activating new firmware`, `Device programmed` e código 0.
SHA256 do pacote DFU: `087EE79DB198AA400A2515F28C3DCFEA3C1D1BD6A87C1CD6FD64ACF606EF99E8`.

Ainda falta conferir `fw: xiao-p3-teste` na telemetria recebida pelo aplicativo e observar o teste físico; sucesso do upload não aprova os limites de proximidade.

Os dados anteriores permanecem preservados em `dados/proximidade-elevada-2026-10-06.json`; não se recalibrou a fórmula nem se inventou uma nova medida para o mousepad.
