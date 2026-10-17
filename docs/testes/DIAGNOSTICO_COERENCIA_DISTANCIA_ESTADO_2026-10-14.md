# Coerência entre RSSI, distância estimada, estado e saídas

## Relato atual

Responsável aprovou 10 minutos somente na bateria, sem alarme indevido. Início 95%/4,09 V, fim 90%/4,07 V. Não extrapolar 5 pontos percentuais arredondados em 10 minutos para capacidade/autonomia. Dois fios do botão soltaram durante manuseio; reparo será feito na faculdade. Teste final de emergência foi por afastamento, com transição direta para vermelho ao andar mais rápido. Não há CSV/telemetria dessa caminhada para identificar o instante ou a causa individual da transição. Botão físico fica pendente após reparo, não aprovado por esse substituto.

Requisito esclarecido: verde até aproximadamente 2 m, amarelo entre aproximadamente 2 e 5 m, vermelho a partir de aproximadamente 5 m, com metros/RSSI/cores/saídas coerentes. Fronteiras exatas devem ser convencionadas na implementação (por exemplo, verde abaixo de 2, amarelo de 2 a menos de 5, vermelho a partir de 5), com confirmação temporal e margens explícitas, não promessa de medição física exata.

## Código efetivamente conferido, sem alteração funcional

- `ProximitySignal.h`, perfil de teste ativo: atenção em RSSI filtrado <= −82 dBm por 4 s; perigo <= −90 dBm por 4 s. Mediana de 5, EMA 0,30, leituras aproximadamente a cada 500 ms. Esses tempos são posteriores à filtragem; não prometer latência total de 4 s. Retorno em 2 s e margens de histerese −77/−86 dBm.
- `ProximityDistance.h`: distância = 10^((−68,44 − RSSI filtrado)/(10 × 2,65)), derivada da campanha anterior, ainda não validada como calibração da nova potência.
- Pela fórmula: entrada de atenção −82 = 3,248614 m; perigo −90 = 6,510059 m; retorno amarelo/verde −77 = 2,103870 m; retorno do estado de sinal perigo −86 = 4,598768 m. Logo os limiares de estado não implementam faixas estimadas de 2/5 m.
- Inversão apenas matemática da fórmula atual: 2 m = −76,417295 dBm; 5 m = −86,962705 dBm. Não aplicar esses valores automaticamente como calibração física; ensaios atuais a 1 m já exibiram filtrado até −80 dBm e ampla variação entre posições/manuseios. Só tornar o amarelo mais sensível poderia reintroduzir falsos avisos próximos.
- `alvoHisterese(SEGURO, ...)` pode escolher PERIGO diretamente; não obriga amarelo antes do vermelho. Se atravessar amarelo antes da confirmação, o candidato muda e o vermelho passa a ter sua própria contagem. Essa é uma explicação permitida pelo código, não uma reconstrução comprovada da caminhada relatada. Perda real do vínculo também pode acionar emergência independente de metros.
- Firmware usa `estadoAtual` para o bipe lento (toggle 600 ms) e `modoPanico` para rápido (toggle 150 ms). Ativo/seguro e sem pânico não emite bipe de proximidade. Atenção respeita preferência de som; pânico não depende dela. Espera é silenciosa.
- `nomeEstado()` transmite pânico enquanto retido. App usa estado transmitido para cor/alerta e distância transmitida somente como número; não decide a cor pela metragem. A tela arredonda metros ao inteiro, além da serialização da placa em uma casa decimal.
- App tem fallback legado em −70/−85 dBm quando o estado está ausente/desconhecido; não se aplica à telemetria válida atual da XIAO, mas deve ser tratado ao unificar o contrato. `safetyConfirmation.ts` também tem limite explícito −82; revisão de limiares exige manter confirmação próxima consistente entre app e placa, sem relaxá-la inadvertidamente.
- Emergência pelo botão/perda do vínculo e retenção até confirmação próxima são exceções deliberadas à cor baseada na estimativa instantânea. Não cancelar emergência automaticamente porque os metros voltaram para menos de 2.

## Direção da próxima alteração, não implementada nesta auditoria

Unificar conversão/limiares/contrato sem apenas mudar o número exibido para coincidir com uma cor. Preservar mediana/EMA, confirmação temporal, margens de retorno e emergência retida. Corrigir ou explicitar a apresentação durante uma transição em confirmação, sem esconder a leitura real. Usar a campanha existente; se não houver referência suficiente para potência atual, pedir somente pontos essenciais de 2 e 5 m, não toda a campanha. Não prometer verde fisicamente exato até 2 m em qualquer ambiente com RSSI.

Não houve modificação de filtros, potência, distância, limiares, firmware ou pacote oficial nesta inspeção. Priorizar reparo/isolamento seguro dos fios antes de novos testes físicos; testes de botão somente após reparo.

Referência primária sobre variabilidade ambiental/plataforma e uso de tendência em RSSI: https://www.bluetooth.com/blog/proximity-and-rssi/ .
