# K2 — emergência -90 dBm, sem teste físico nesta etapa

## Pedido e limites

Após K1, responsável aprovou 1 m e 3 m por relato, mas relatou emergência indevida a 4 m **depois de ambos parados**, mantendo conexão normal. Não há CSV/log do evento para identificar sua trajetória exata. O relato favorece hipótese de sinal fraco, mas não demonstra a causa física de sua variação. Responsável pediu voltar ao limiar vermelho -90 dBm e depois autorizou alterar. Confirmou Sentinela em espera; Arduino identificou a XIAO esperada `8BDE14575D4B412E` na COM8.

Também pediu **não testar ainda** a sequência sincronizando/procurando ao retornar do segundo plano. Nenhum teste físico, retomada de proteção, manuseio de UI, instalação de APK ou alteração desse fluxo foi feito nesta tarefa. Compilação e testes automatizados locais não substituem validação no aparelho.

## Alteração

K2 é um opt-in adicional `ESCOLTA_TESTE_KALMAN_K2=1`, que exige K1=1 e todos os requisitos p5/radio4/D1. Preserva K1 sem K2 e o perfil oficial/padrão.

| Parâmetro | K1 | K2 |
|---|---:|---:|
| Amarelo entra/sai | -77/-72 dBm | Igual |
| Vermelho entra/sai | -85/-81 dBm | **-90/-86 dBm** |
| Confirmação de entrada | 4 s | Igual |
| Retorno do filtro | 2 s | Igual |
| Kalman | Q=1 dB²/s; R=4 dB² | Igual |

Tag nova exata `xiao-p5-r4-d1-k2`, inclusive no CSV; marcador `[SIGNAL_FILTER] profile=k2 q_per_s=1 r=4 yellow=-77 red=-90 hold_ms=4000`. O app aceita explicitamente a tag, com **mesmas** exigências K1 de cru/filtrado >-77, leitura recente, monitor ativo e ACK seguro/sem pânico. Não afrouxa confirmação de segurança. Nenhum prefixo genérico é aceito.

Mantidos: fórmula D1, potência solicitada +4, PHY/advertising, bateria ADC40/topo visual4100, corrente de carga, botão, UUIDs, comunicação e emergência retida. Alterar o limiar pode evitar alguns vermelhos antecipados, mas **pode atrasar o alerta a 5 m**; não declarar requisito 3/5 m resolvido. Não aumentar o tempo ou alterar a fórmula em conjunto.

## Preservação e verificação

Saída separada `.expo/proximity-radio4-d1-k2`; mesmas nove flags K1 mais `-DESCOLTA_TESTE_KALMAN_K2=1`. FQBN `Seeeduino:mbed:xiaonRF52840Sense`.

Rollback K1 `.expo/proximity-radio4-d1-k1/xiao_escolta_ble.ino.zip`, SHA-256 `6E20650F7400448FF776C135598C8F28AA1C072BE672D3E591C4117578659EE9`. D1 anterior SHA-256 `5C0FE4F16226242BF012FB89EA8C98BC49D433C83EB5534BD2480C352CEA3F28`. Ambos confirmados íntegros antes da nova compilação. Não sobrescrever.

**172 testes JS aprovados**, zero falha/skip/TODO, e TypeScript aprovado. C++: K1 preservado e K2 aprovado; K2 reaplica verificações de filtro/tempo/confirmar/frescor/overflow e acrescenta -85/-89 sustentados amarelos e -90 confirmado vermelho, sem mudar 4 s. Testes são de código, não medição de distância real.

**Compilação e gravação concluídas.** Programa 335.312 bytes (41%), globais 70.056 bytes (29%). Pacote `.expo/proximity-radio4-d1-k2/xiao_escolta_ble.ino.zip`, SHA-256 `F44745314A822F232C76B489C20F6FE33EAC9C2FF8FD75D3B9DB1D01FEEE321E`. FQBN, flag K2, tag e marcador -90 conferidos no binário antes da gravação. Identidade XIAO confirmada novamente imediatamente antes do upload, serial esperado/COM8.

Após confirmação de espera e aviso prévio de gravação, Arduino upload COM8 entrou em DFU COM9 e terminou com `Activating new firmware`, `Device programmed`, retorno COM8. K2 instalado; nenhuma retomada de proteção, teste físico, leitura serial de diagnóstico ou interação com o celular foi iniciada nesta tarefa. Não houve geração/instalação de APK ou promoção da oficial. App preparado para reconhecer a tag nova; confirmação de telemetria BLE e resultados físicos continuam pendentes para quando o responsável autorizar retomar. Perfis C++ legado, D1, p4 e confirmação antiga também recompilados sem falha.

## Segundo plano — resposta baseada no código, sem testar nem corrigir

Este ajuste não alterou `useEsp32Monitor.ts`, `bleApi.ts`, `DashboardScreen.tsx` nem controlador persistente. O fluxo já existente ao receber AppState ativo:

- invalida distância antiga e exige leitura atual; Dashboard conectado sem dado válido mostra **Sincronizando**;
- chama conexão se o objeto de conexão BLE local estiver ausente e conexão automática estiver habilitada;
- o watchdog pode encerrar a sessão sem telemetria/RSSI recente por >6 s; há tolerância de recuperação de 6 s ao voltar ao primeiro plano;
- falha/timeout na leitura ou envio RSSI também pode encerrar a sessão; callbacks de desconexão acionam reconexão;
- **Procurando** não é sinônimo de aguardar leitura nova: o Dashboard representa ali ausência de conexão local e/ou busca. Isso não prova em qual instante o enlace físico caiu nem qual ramo disparou no relato. `isBleConnected()` consulta a referência local `connectedDevice`, não mede independentemente o rádio.

Logo, breve Sincronizando tem explicação prevista; Sincronizando → Procurando recorrente não está certificado como normal nem corrigido. LED verde isolado não exclui transição rápida/estado atrasado. Investigar depois, com autorização e registros, sem culpar Kalman ou supor queda física como fato. Pendência mantida aberta, respeitando o pedido de não testar agora.

## Validação posterior por relato — 4 e 5 m

Depois, o responsável decidiu testar as distâncias. No roteiro de 4 m (mesma disposição, 30 s parado, alvo amarelo sem emergência), respondeu que melhorou e funcionou como queria: aprovado por relato. No roteiro seguinte de 5 m, informou que foi até 5 m e apitou, aprovando esse ponto por relato. Não houve nova gravação/alteração de parâmetros entre esses testes.

Manter K2: amarelo -77, emergência -90 dBm, Kalman Q1/R4 e 4 s. Os pontos 1/3 m anteriores foram aprovados com K1; não apresentá-los como novas repetições feitas com K2. Não há CSV, RSSI ou cronometração dos novos disparos; continuidade BLE em 5 m e retenção/confirmar segurança após retorno não foram detalhadas nessa resposta. Não inferir metros exatos em todos os ambientes nem aprovação do APK/segundo plano a partir dessa rodada. A pendência Sincronizando → Procurando permanece aberta, sem teste ou correção nesta tarefa.
