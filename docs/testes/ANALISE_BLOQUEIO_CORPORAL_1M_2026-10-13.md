# Comparação a 1 m com e sem bloqueio corporal

Análise das duas coletas compartilhadas pelo responsável em 13/10/2026, horário local. Os registros UTC são de 14/10/2026. Firmware informado nos pacotes: `xiao-p5-teste`; celular SM-S928B, Android 36.

Fonte integral preservada no anexo original:
`C:/Users/Nicolas Venciguerra/.codex/attachments/96cca770-6836-4505-a5b0-23fe35ff77b2/Texto colado.txt`.

O CSV mantém a descrição genérica “Sem obstáculos; caixa fechada; mesma altura e orientação” nas duas coletas. O responsável esclareceu na mensagem que a segunda envolveu movimento e colocação do braço entre celular e placa. Esta informação acompanha a análise, sem reescrever os dados originais. A altura numérica não foi preenchida. Não há marcação temporal precisa da colocação/retirada do braço.

## Resultados calculados

| Medida | Primeira coleta | Segunda coleta, braço relatado |
| --- | --- | --- |
| Ensaio | 1791943453970-yp27pa | 1791943708815-mb191x |
| Distância real informada | 1 m | 1 m |
| Amostras | 30 | 30 |
| RSSI bruto médio | -69,93 dBm | -83,17 dBm |
| Faixa do RSSI bruto | -73 a -68 dBm | -87 a -75 dBm |
| RSSI filtrado médio exportado | -69,47 dBm | -83,53 dBm |
| Faixa filtrada exportada | -73 a -68 dBm | -87 a -76 dBm |
| Distância estimada média | 1,14 m | 3,77 m |
| Faixa da estimativa | 1,0–1,5 m | 2,0–4,8 m |
| Estado nas amostras | 30 seguro | 30 atenção |
| Pânico nas amostras | 30 falso | 30 falso |

A segunda coleta começa já em atenção, após os 10 s de estabilização do ensaio; não registra o instante de entrada nem permite medir a latência de disparo. As primeiras 27 amostras mostram RSSI filtrado exportado menor ou igual a -82 dBm. Nas últimas amostras, o bruto melhora de -79 para -75/-76, com recuperação gradual do filtro. A última amostra ainda é atenção, com filtrado exportado -76; sem as leituras seguintes não se determina o momento de retorno. O filtro interno usa ponto flutuante, mas o campo comparado no CSV está arredondado.

O responsável relatou bipes durante a situação com o braço e ausência de desconexão. Os pacotes da segunda coleta atualizam identificadores e horários, com bruto do celular igual ao bruto exportado pela placa em todas as amostras. O CSV não substitui logs completos do enlace e não comprova todos os intervalos entre notificações.

## Interpretação e limite do diagnóstico

A diferença entre as médias brutas das duas coletas é de 13,23 dB. O relato e os dados são consistentes com atenuação/alteração da propagação associada ao braço e à orientação; não isolam cada causa nem demonstram defeito físico da antena.

Na campanha anterior preservada em `dados/proximidade-elevada-2026-10-06.json`, as médias brutas foram -83,20 dBm a 3 m e -83,93 dBm a 5 m. A média da nova coleta a 1 m com braço coincide aproximadamente com essas médias. Isso demonstra sobreposição observada das condições de proximidade no sinal disponível, não uma calibração universal entre esses cenários.

A cadeia atual mede RSSI no celular, transmite a leitura à placa e aplica mediana de cinco leituras, EMA, histerese e confirmação temporal na placa. A atenção persistente é compatível com as regras p4 preservadas pelo p5: entrada -82 dBm, saída maior que -77 dBm e confirmação temporal. Neste ensaio, o som não depende de uma distância física medida: responde ao estado de sinal fraco.

Aumentar o tempo de confirmação reduz disparos por bloqueios breves, mas não elimina um bloqueio sustentado como o observado. Reduzir a sensibilidade dos limites também pode ocultar afastamentos reais presentes na campanha antiga. Não se recomenda recalibrar automaticamente a referência de perto a partir desse sinal enfraquecido nem forçar o verde por conexão existente.

Antes de nova regulagem, avaliar posicionamento da antena no conjunto montado, orientação dos dois dispositivos e configuração efetiva da potência de transmissão. Melhorias de rádio não equivalem a um medidor confiável de distância; alterar potência exige reavaliar a escala de RSSI, limites e autonomia. Não se presume que potência maior resolva bloqueio corporal.

Fontes primárias consultadas:

- [Leith e Farrell: medições BLE, orientação e absorção pelo corpo](https://arxiv.org/abs/2006.06822).
- [Bluetooth SIG: potência, antena e obstáculos na propagação](https://www.bluetooth.com/learn-about-bluetooth/key-attributes/range/).

Nenhum código, limite, potência, APK ou firmware foi alterado nesta análise. A estabilidade silenciosa de perto permanece não aprovada.
