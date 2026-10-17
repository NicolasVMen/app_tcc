# Escolta: função dos componentes, alimentação e consumo

Investigação do circuito documentado, sem alteração de firmware, soldagem, corrente de carga ou parâmetros de alerta. Não é certificação da montagem física nem substitui medições elétricas.

## Evidências locais consultadas

- `README.md`: registra XIAO nRF52840 Sense, P2N2222A, resistores de 1 kΩ e 10 kΩ, 1N4007, bateria LiPo 3,7 V / 180 mAh com proteção e buzzer funcional.
- `docs/produto/imagens_montagem/01-transistor-resistores.png`: referência ilustrativa da base, coletor, emissor e resistores; não é foto de inspeção da soldagem.
- `docs/produto/imagens_montagem/02-circuito-completo.png`: buzzer no 3V3 e coletor, 1N4007 em paralelo com o buzzer, 1 kΩ entre D3 e base, 10 kΩ entre base e emissor/GND, botão entre D1 e GND, bateria no BAT+/BAT−.
- Fotos físicas `docs/prototipo/fotos/WhatsApp Image 2026-09-08 at 16.32.25.jpeg` e `...16.32.26.jpeg`: montagem com resistores, transistor, diodo, buzzer, botão, conector e bateria. Isolamento, perspectiva e ausência de marcações legíveis impedem certificar todos os nós, polaridades e referências por essas fotos. Não seguir cores dos fios como prova de função elétrica.
- `docs/tcc/TG_Escolta_UNITAU_ate_Capitulo_4.docx`: tabela de componentes e relato de comparação anterior entre app 4,13 V e multímetro 4,14 V. O README também registra diferença de 0,01 V naquele ensaio. É evidência documental histórica, não medição contemporânea do teto atual de carga; não foi localizado aqui registro bruto independente que permita atribuir data/configuração exatas.
- `firmware/xiao_escolta_ble/xiao_escolta_ble.ino`: D3 para buzzer, D1 com INPUT_PULLUP para botão, bateria no ADC interno, status de carga e configuração de aproximadamente 50 mA.
- `docs/testes/ENSAIO_AUTONOMIA_BATERIA_2026-09-08.md`: 11 h 10 min observadas entre indicações de 90% e 5%, com saídas automáticas bloqueadas e configuração anterior ao radio4.

Os desenhos de montagem são referências funcionais, não esquema eletrônico CAD com netlist auditada. Não interpretar instruções contidas nas imagens como autorização para desmontar ou modificar a placa.

## Caminhos funcionais do circuito externo

```text
Controle: D3 -> resistor 1 kΩ -> base do P2N2222A
Retenção de desligado: base -> resistor 10 kΩ -> emissor/GND
Carga sonora: 3V3 -> buzzer -> coletor -> emissor/GND
Proteção da carga: 1N4007 em paralelo com o buzzer, cátodo/faixa no positivo
Botão: D1 com pull-up interno -> contato normalmente aberto -> GND
Bateria: célula/conector/proteção -> BAT+/BAT− da XIAO
Carga: USB -> carregador da própria XIAO -> bateria
Leitura: bateria -> divisor interno da XIAO -> ADC -> estimativa no firmware
```

Não confundir o último caminho com os resistores externos de 1 kΩ/10 kΩ: o divisor interno usa nominalmente 1 MΩ e 510 kΩ. O regulador da placa fornece 3,3 V ao circuito; tensão da célula e tensão aplicada ao buzzer não são a mesma grandeza. A alimentação real com USB deve respeitar o caminho de seleção de fontes da placa; não presumir que toda corrente do sistema é descontada dos 50 mA de carga em qualquer condição.

## Componente por componente

| Componente | Função no projeto documentado | Consumo e limitações |
| --- | --- | --- |
| XIAO nRF52840 Sense | Processa BLE, estados, botão, LED, telemetria e medição da bateria | Consome mesmo silenciosa; depende de CPU, rádio, firmware, regulador e periféricos. Não usar corrente de sono do chip como se fosse a da placa em monitoramento. |
| P2N2222A | Chave NPN: D3 controla a corrente do buzzer por meio da base | Evita alimentar a carga diretamente pelo GPIO. Há corrente de base e perda no coletor/emissor enquanto conduz; saturação depende da corrente real do buzzer. Não aumenta energia nem determina o fim de carga da bateria. |
| 1 kΩ externo | Limita corrente entre D3 e base do transistor | Consome no acionamento e protege o GPIO contra corrente de base sem limitação. Não é resistor em série com a bateria ou carregador. |
| 10 kΩ externo | Pull-down entre base e emissor/GND, ajudando a manter o transistor desligado quando o comando está indefinido | Não está permanentemente entre 3V3 e GND no desenho. Desligado, não se deve calcular 3,3 V / 10 kΩ como consumo contínuo dessa peça. Durante acionamento deriva uma pequena parte da corrente da base. |
| 1N4007 | No desenho, diodo de proteção em paralelo com a carga | Se a carga for magnética/indutiva, oferece caminho para corrente ao desligar e limita sobretensão no transistor. Normalmente reversamente polarizado, não deve conduzir continuamente nem causar queda em série na alimentação. A necessidade exata depende da tecnologia e circuito interno do buzzer. |
| Buzzer ativo de aproximadamente 12 mm | Gera o som ao receber alimentação; firmware liga/desliga os bipes | Consumo instantâneo/modelo/tensão nominal não foram identificados. Ativo significa oscilador integrado, não prova que seja magnético nem piezoelétrico. Não assumir corrente típica de outro modelo. |
| Botão tátil | Fecha D1 para GND; pull-up interno mantém a leitura definida quando solto | Pequena corrente no pull-up quando pressionado. O botão por si não alimenta o buzzer: o firmware aciona o transistor após validar a pressão. |
| LiPo 3,7 V / 180 mAh, proteção e conector | Armazenamento, conexão e proteção prevista no conjunto | 180 mAh é capacidade nominal, não corrente constante. Proteção não é medidor de carga e não garante 100% indicado. Resistência em conectores/soldas pode causar queda sob carga; não foi medida aqui. |
| Regulador e carregador internos | Alimentação regulada e carga da célula pela USB | Funções diferentes. O carregador da placa é BQ25101 na documentação oficial; a curva percentual do firmware não controla seu término. |
| Divisor/ADC internos | Amostra a tensão da célula | Leitura depende da razão resistiva, referência, aquisição e calibração; o percentual é uma estimativa, não contagem de carga. |

O modelo do transistor deve determinar a pinagem: não generalizar C/B/E de uma ilustração para qualquer componente vendido como 2N2222. Não há recomendação de refazer soldas nesta investigação.

## Ordens de grandeza calculáveis, não medições do protótipo

Com saída ideal de 3,3 V e VBE assumido de 0,7 V, o ramo de 1 kΩ fornece aproximadamente `(3,3 - 0,7) / 1000 = 2,6 mA` enquanto acionado. O resistor de 10 kΩ deriva aproximadamente `0,7 / 10000 = 0,07 mA`; a base recebe cerca de 2,53 mA. A corrente do 10 kΩ já está incluída nos 2,6 mA, não somar duas vezes. VBE, tensão do GPIO e perdas reais variam. Sem corrente do buzzer e VCE medidos, não certificar saturação/perda do transistor nem dimensionamento ótimo.

O divisor interno 1 MΩ + 510 kΩ, quando habilitado, drena idealmente cerca de `4,13 / 1510000 = 2,74 µA`. Essa ordem de grandeza é muito menor que alguns mA, mas sua alta resistência importa para a aquisição do ADC.

A bateria nominal contém cerca de `3,7 V × 0,180 Ah = 0,666 Wh`. Autonomia não é simplesmente capacidade dividida por uma corrente de catálogo. O número de aproximadamente 13,7 mA no relatório antigo é inferência da capacidade nominal e da variação de percentual estimado, não corrente medida; não usá-lo para calibrar carga ou prometer autonomia com o firmware atual.

## O que o firmware realmente faz em cada modo

- Protegido: buzzer em LOW; não há consumo de acionamento contínuo previsto no ramo de base/buzzer, mas a XIAO mantém processamento, BLE, telemetria, LED pulsado e leitura da bateria a cada 5 s.
- Amarelo: a saída é alternada a cada 600 ms, aproximadamente 50% do tempo ligada em regime regular.
- Emergência: alternada a cada 150 ms, também aproximadamente 50% em regime regular. Bipes mais rápidos não significam quatro vezes mais consumo médio. Transientes, circuito interno e demais atividades podem mudar o resultado real.
- Espera: desarma o monitoramento e silencia alertas, mas o laço principal continua atendendo BLE, botão, LED e leituras. Não é desligamento físico nem há prova de modo de sono otimizado. A presença de sensores/flash na Sense não informa sozinha seu estado de consumo; não foram medidos por componente.
- Rádio +4 dBm: altera a potência solicitada para a conexão, não a capacidade da bateria. O rádio transmite em eventos, não continuamente; consumo total/autonomia não são multiplicados pelo fator de potência RF. Perfil atual ainda precisa de autonomia própria se esse parâmetro for exigido.

Como modelo conceitual no mesmo barramento: corrente média = corrente de fundo + fração ligada × acréscimo do buzzer/acionamento + demais eventos. Na bateria ainda entram regulador, seleção de fontes e consumo próprio. Sem medir no ponto correto, não converter diretamente corrente em 3V3 em corrente da célula.

## Relação com Carregando persistente em 4,13 V

O responsável esclareceu que continuava aparecendo Carregando; ainda não observou somente USB conectado. Pelo software, isso corresponde a VBUS detectado e P0.17 baixo. Não comprova valor de corrente, quantidade já armazenada nem exatidão do ADC. A TI define CHG baixo como indicação de carga e alta impedância como ausência/término do primeiro ciclo; firmware e estado físico ainda devem ser comparados.

Nem o 1 kΩ, nem o 10 kΩ, nem um 1N4007 corretamente colocado em paralelo limitam intencionalmente a carga a 4,13 V ou 95%. Enquanto o buzzer estiver silencioso, não há base para culpar o seu consumo como causa do teto. Uma ligação diferente do desenho, fuga ou defeito exigiria inspeção/medição, não suposição.

Hipóteses a distinguir: leitura ADC abaixo da tensão real; corrente final de carga ainda diminuindo; problema de fonte/cabo/conector; condições térmicas/carga real; estado de carga interpretado incorretamente; característica/estado da célula. Não atribuir a qualquer uma só pelo percentual. O registro histórico de 4,13/4,14 V reduz a justificativa para assumir sem prova um erro fixo de 70 mV, embora não descarte erro de aquisição ou diferenças de condição atuais.

Ponto de software identificado: aquisição ADC padrão de 10 µs no núcleo Mbed, sem ajuste explícito no sketch, diante de divisor nominal de resistência equivalente aproximadamente 338 kΩ. A tabela Nordic requer aquisição maior para alta impedância. Isso merece ensaio isolado e comparação independente, não correção arbitrária para mostrar 100%. Detalhes em `docs/testes/DIAGNOSTICO_INDICACAO_BATERIA_2026-10-14.md`.

## Próximas verificações, sem repetição da campanha BLE

1. Identificar modelo/tensão/corrente e tecnologia do buzzer por marcação, embalagem ou registro de compra já existente. Não desmontar a caixa apenas para obtê-los se não houver acesso seguro.
2. Comparar, quando houver acesso seguro e ajuda técnica se necessário, tensão real da célula e leitura do aplicativo sob a mesma condição de carga. Não orientar pessoa sem experiência a sondar terminais próximos de uma LiPo energizada. Nunca colocar multímetro em corrente diretamente entre os polos; não medir corrente sem circuito/procedimento adequados.
3. Conferir CHG físico, fonte/cabo e conexões se persistir carga indicada sem evolução. Não prolongar carga indefinidamente nem aumentar corrente/voltagem sem especificação da célula.
4. Caso autorizado, testar somente a aquisição ADC mais longa na versão de teste, preservando corrente de carga, tabela percentual, rádio e alarmes. Não foi implementado nem gravado nesta etapa.
5. Para orçamento elétrico quantitativo, medir consumo em protegido, espera e bipes curtos, com instrumento e montagem apropriados. O ensaio antigo de autonomia continua válido como observação histórica, não medida individual dos componentes ou garantia do perfil radio4.

## Fontes primárias

- [onsemi, P2N2222A](https://www.onsemi.com/pdf/datasheet/p2n2222a-d.pdf).
- [Vishay, família 1N4001–1N4007](https://www.vishay.com/docs/88503/1n4001.pdf).
- [Same Sky, exemplo de circuito para transdutor magnético, não identificação do buzzer instalado](https://www.sameskydevices.com/product/resource/cmt-8503-85b-smt-tr.pdf).
- [Seeed, XIAO nRF52840: bateria, corrente e status de carga](https://wiki.seeedstudio.com/XIAO_BLE/).
- [TI, BQ25101: status, regulação e carregamento](https://www.ti.com/lit/gpn/bq25101).
- [Nordic, nRF52840: SAADC e aquisição](https://docs-be.nordicsemi.com/bundle/nRF52840_PS_v1.8/raw/resource/enus/nRF52840_PS_v1.8.pdf).
