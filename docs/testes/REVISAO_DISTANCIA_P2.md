# Estimativa experimental de distância — XIAO p2

## O que mudou

O firmware mantém o filtro mediana/EMA, limites, tempos, bipe amarelo, botão e
perda de conexão da [revisão p1](REVISAO_PROXIMIDADE_P1.md). A escala em metros
agora é calculada em `ProximityDistance.h`, separadamente da decisão dos alertas:

```text
antes: d = 10 ^ ((-71 - RSSI) / (10 × 2,5))
agora: d = 10 ^ ((-68,44 - RSSI) / (10 × 2,65))
```

A referência e o expoente são parâmetros efetivos ajustados por regressão
linear de `log10(distância real)` em função do RSSI filtrado exportado. O ajuste
usa as 120 amostras originais (30 em cada uma das últimas coletas de 1/3/5/7 m).
Resultado antes do arredondamento: referência −68,43965367; expoente 2,64735480.
Não são parâmetros universais nem obtidos de uma especificação da placa.

As coletas no chão não foram misturadas às elevadas. As condições têm respostas
muito diferentes: a 1 m no chão, o RSSI médio foi aproximadamente −84,33 dBm,
enquanto elevado ficou em −69,33 dBm. Esta escala não corrige ambas as condições
simultaneamente. Também não se redefiniu a referência automaticamente ao conectar.

## Evidência e alcance da melhoria

Os dados usados estão preservados em
[`dados/proximidade-elevada-2026-10-06.json`](dados/proximidade-elevada-2026-10-06.json).
Contêm RSSI bruto, RSSI filtrado original, estimativas originais, horários relativos
e identificadores dos ensaios. A elevação foi confirmada pelo usuário a 1 m; as
coletas seguintes seguiram o procedimento combinado, mas a nota exportada não
documentou individualmente a altura de cada ensaio.

Para avaliar a combinação com o filtro p1, reproduziram-se somente os 30
instantâneos disponíveis de cada coleta, reiniciando o filtro em cada ensaio.
Não foram inventadas as leituras intermediárias de 500 ms nem o aquecimento
não exportado. As médias do replay JavaScript foram comparadas com o mesmo
filtro C++ usado no firmware, por verificações do compilador.

| Distância real | Média original registrada | Média do replay p2 | Faixa do replay p2 |
| --- | --- | --- | --- |
| 1 m | 0,86 m | 1,05 m | 0,96–1,14 m |
| 3 m | 3,17 m | 3,87 m | 2,87–4,60 m |
| 5 m | 3,35 m | 3,80 m | 3,54–4,20 m |
| 7 m | 6,36 m | 6,90 m | 4,51–8,96 m |

Erro absoluto médio por amostra: original **0,978 m**, replay p2 **0,934 m**,
redução de aproximadamente **4,6% neste conjunto**. O replay p1 com a fórmula
antiga fica em aproximadamente 0,974 m. Portanto, a melhora é modesta, não uma
correção completa da distância; o resultado a 3 m ficou pior. Com a nova fórmula
sobre o RSSI filtrado originalmente exportado, sem o novo filtro, o erro fica
em aproximadamente 0,974 m. Não atribuir toda a diferença à calibração sozinha.

Os sinais de 3 e 5 m praticamente coincidiram. Não há como a mesma leitura gerar
simultaneamente 3 e 5 m sem informações adicionais. Não se criou uma tabela que
force os resultados medidos, nem um teto artificial em 7 ou 15 m.

Estas amostras também foram usadas para ajustar os parâmetros e são correlacionadas
no tempo. **Não há validação independente nem garantia de precisão em movimento,
outros celulares, junto ao corpo, com obstáculos ou no chão.** Retirar uma distância
por vez do ajuste evidencia instabilidade (por exemplo, a referência de 1 m passa
a ser prevista em cerca de 1,75 m quando não participa do ajuste). A revisão é
uma calibração experimental inicial, não comprovação de melhoria generalizável.

## Apresentação e dados antigos

- A Central mantém metros arredondados com `~`, sem falsa precisão decimal,
  e identifica a aproximação pelo sinal Bluetooth.
- Antes do primeiro RSSI e depois de 2,5 s sem nova leitura na placa, a distância
  enviada é `null`. Não se mostra o valor inicial fictício −50 como distância.
- A Central deixa o campo sem valor quando o contador de atualização ultrapassa
  3 s sem notificação recebida,
  sem vínculo, em espera ou durante sincronização. Isso não redefine o estado
  de alerta nem transforma ausência de leitura em proximidade segura.
- O CSV preserva as estimativas originais: coletas antigas não são recalculadas
  nem sobrescritas. A análise de replay permanece separada dos resultados físicos.
- Valores além dos 7 m ensaiados continuam sendo extrapolações, não distância
  validada. A cor do alerta não é calculada pelo número arredondado na tela.

## Verificação e aplicação

```powershell
.\tools\test-proximity-signal.ps1
node --test tools/test-proximity-distance.cjs tools/test-monitor-alerts.cjs tools/test-proximity-trial.cjs tools/test-proximity-ble.cjs
node tools/test-proximity-distance.cjs --report
node node_modules/typescript/bin/tsc --noEmit
```

33 verificações C++ e 21 testes JavaScript aprovados; TypeScript sem erros.
A exportação Android/Hermes foi concluída. O firmware compilou para
`Seeeduino:mbed:xiaonRF52840Sense`: 332.320 bytes de programa (40%) e
70.024 bytes de variáveis globais (29%), sem gravação na placa.
A verificação C++ cobre o filtro real, a transformação do expoente e o frescor
da leitura; a análise numérica completa utiliza `Math.pow` no Node, enquanto
o firmware usa `powf` da biblioteca matemática compilada para a placa.

Para aplicar: recarregar o app e **gravar o firmware XIAO pela USB**, mantendo
os dois arquivos `.h` junto do `.ino`. O identificador recebido passa a `xiao-p2`.
Recarregar apenas o Expo não modifica o cálculo executado na placa.

### Gravação realizada em 07/10/2026

Após o usuário conectar a placa, foi identificada a XIAO USB na COM8. O pacote
compilado de `xiao-p2` foi gravado pelo Arduino CLI/nrfutil; a porta de bootloader
foi COM9 e a porta de aplicação voltou à COM8. A ferramenta terminou com código
0 e as mensagens `Activating new firmware` e `Device programmed`.

Uma leitura serial breve não recebeu mensagens; o loop só imprime RSSI quando
há cliente conectado e leitura disponível. Isso não confirma sozinho a execução
BLE. Ainda falta confirmar `xiao-p2` na telemetria do aplicativo e verificar
fisicamente o comportamento após a gravação. Não confundir sucesso do upload
com validação da precisão da distância ou dos alertas.
