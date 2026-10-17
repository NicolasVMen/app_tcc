# Retorno ao primeiro plano — diagnóstico somente leitura

## Escopo

Responsável autorizou investigar após aprovar 4/5 m com K2. Não autorizou novas regras de rádio; K2 (-77/-90, Kalman Q1/R4, 4 s) preservado. Esta etapa **não alterou código, abriu/fechou apps, trocou instalação, limpou dados/logs, reiniciou Bluetooth ou gravou firmware**. Somente código/registros e metadados lidos; relatório/status locais atualizados.

## Evidências do Samsung

ADB `RXCXA07DTXF` autorizado. Consulta em 17/10, aproximadamente 15:45 (America/Sao_Paulo, relógio consultado no aparelho):

- Pacote ativo com processo PID **15668**: `com.nicolasvmen.escoltaunitau` (**Escolta UNITAU**).
- Pacote `com.nicolasvmen.escoltaunitau.teste` instalado, mas **sem processo** naquela consulta. Não presumir desde quando o usuário mudou de app, nem invalidar todos os testes passados com base no estado atual.
- Oficial ativo: versionName 1.0.0, DEBUGGABLE, lastUpdateTime 2026-07-31 23:33:32, serviço `EscoltaSentinelaService` em foreground. Um serviço foreground sozinho não comprova as correções posteriores de polling/controlador.
- Teste instalado: versionName 1.0.0-teste, lastUpdateTime 2026-10-15 23:12:50.
- SHA-256 do APK oficial **instalado**, obtido por `adb shell sha256sum` em seu caminho `pm path`: `EC9810B0CB8B1F6B8F177AFB80215F968BDC3A00A351CB33DC6369DAA75D3D35`. Igual ao backup `.expo/escolta-instalado-antes.apk`. Nenhum novo APK precisou ser copiado do aparelho.
- Manifesto desse backup inspecionado com aapt: esquema `exp+escolta-unitau`, label Escolta UNITAU; **sem** metadata `escolta.validated_monitor`. O perfil de código atual depende do marcador nativo de teste ou dessa metadata para ativar o controlador/correções novas. `nativeIdentity.ts` não presume essa ativação em APK antigo.
- Registros BluetoothGatt do PID 15668 mostraram leitura RSSI ~500 ms, inclusive 15:45:20–15:45:32. Há ciclos de notificação desligada/desconexão/reconexão em 15:36–15:37 e nova conexão às 15:42:12. Sem marcação do ato de minimizar nem motivo JS nesses eventos; **não atribuir esses ciclos à falha relatada**, pois também houve espera/recargas/gravações nesta sessão. Status GATT 0 não demonstra por si só perda de rádio ou motivo do cancelamento.

## Interpretação

Há diferença de instalação/configuração comprovada no momento da inspeção: o APK de teste com os recursos nativos novos não está sendo executado. O servidor Metro pode fornecer JS atualizado ao dev-client antigo, mas não substitui módulos nativos do APK. Isso é uma explicação concreta para comportamentos não equivalentes entre as duas instalações; **não é diagnóstico final da sequência visual**.

O caminho de código existente permite:

1. Ao receber AppState ativo, perfil validado invalida a leitura antiga e exige uma nova. Conectado sem dados válidos aparece Sincronizando. Não declarar isso uma queda por si só.
2. Procurando/Reconectando representa busca ou estado local sem conexão. O watchdog encerra sessão sem telemetria/RSSI recente >6 s; tolerância de 6 s no retorno depende do perfil validado. Timeout de leitura/escrita RSSI também pode encerrar sessão. Não foi identificado qual ramo ocorreu no relato.
3. O controlador persistente, epoch que ignora resposta antiga ao retomar e heartbeat dependem da variante/configuração nativa. No serviço atual salvo, heartbeat é restrito ao pacote `.teste`. Não promover o APK oficial ou fingir que o pacote antigo já contém essas alterações.
4. O QR/atalho pode encaminhar para o esquema da oficial, mas o modo exato como essa sessão foi aberta **não foi observado**. Não afirmar que o usuário escolheu errado ou que o QR foi a causa sem confirmar.

## Próximo passo seguro

Pedir para colocar **o app atualmente conectado** em espera e confirmar silêncio. Só depois abrir especificamente Escolta Teste e verificar seu processo/versão. Não rodar os dois monitores ao mesmo tempo, não forçar parada enquanto houver emergência e não reinstalar/desinstalar nenhum pacote. Não copiar contas/dados entre pacotes para contornar diferenças de Firebase.

Depois confirmar proteção próxima e fazer reprodução curta minimizar → aguardar → voltar, marcando horários e eventos de conexão do pacote correto. Nenhuma reprodução física foi iniciada nesta etapa. Somente se a falha também existir no teste coletar motivo e propor patch específico; não mascarar Procurando nem declarar seguro com leitura antiga. Os 4/5 m aprovados por relato com firmware K2 continuam registrados como observações da placa; a variante do app desta inspeção não certifica regressão completa do candidato.

## Abertura posterior do pacote correto

Responsável confirmou que colocou o app anterior em espera. Consulta dos serviços da oficial não mostrou Sentinela ativa naquele momento. Resolvida e aberta explicitamente a atividade `com.nicolasvmen.escoltaunitau.teste/com.nicolasvmen.escoltaunitau.MainActivity`; novo processo Teste PID 8046. Inicialmente o Android mostrava `DevLauncherActivity`, não o projeto carregado.

Servidor local 8081 confirmado ativo e processo Node correspondente ao Expo em `Desktop/app_tcc`; não havia encaminhamento USB. Criado somente `adb -s RXCXA07DTXF reverse tcp:8081 tcp:8081` e aberto, com pacote explicitamente restrito a `.teste`, o link `exp+escolta-teste://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`. Não usado QR genérico nem substituído/reinstalado APK; nenhum comando BLE de retomada enviado. Isso abre o projeto na variante correta, mas o estado da tela/sessão/espera ainda precisa de confirmação do responsável antes da reprodução. Não afirmar que intents salvas são iguais entre pacotes nem que o teste de minimizar passou por abrir a variante.

Responsável confirmou **Em espera** no Teste; solicitado retomar próximo (~1 m) mantendo USB do celular, e depois confirmou **verde**. Baseline ADB em **17/10 15:52:47 -03:00**: PID Teste 8046, Sentinela do pacote `.teste` em foreground e leituras GATT a cada ~500 ms na janela 15:52:17–15:52:47, sem desconexão nessa janela exibida. Isso não certifica toda a sessão nem entrega de cada notificação. Próxima reprodução será Home/minimizar 30 s, sem remover de Recentes/bloquear tela, retornar especificamente ao Teste e observar busca/sincronização. Resultado ainda não recebido; nenhuma correção aplicada.

## Resultado do roteiro Home/retorno no Teste

Responsável respondeu que apareceu somente **Retomando proteção** e voltou ao **verde**, sem relatar Procurando. Cenário Home/minimizar/retornar aprovado por relato nesta rodada, não aprovação de bloqueio prolongado/morte do processo ou correção da oficial antiga.

Leitura ADB às **15:56:27 -03:00** confirmou mesmo PID 8046. Entre **15:52:47.181 e 15:56:27.261**, logcat BluetoothGatt do PID continha **440 chamadas readRssi**, maior intervalo **623 ms**, e **zero eventos** dos filtros `onClientConnectionState`, connect/cancelOpen/close, unregisterApp ou erros de monitoramento/parse. Isso sustenta continuidade das solicitações de leitura e ausência de desconexão registrada na janela; não mede todas as respostas de rádio ou prova entrega de cada telemetria. Tempo exato de Home/retorno não cronometrado separadamente pelo responsável.

Nenhum patch de segundo plano foi aplicado. Não tratar troca para o pacote correto como correção implementada do APK oficial. Retomando proteção brevemente é compatível com invalidação de leitura antiga/espera por atualização atual. A discrepância original não foi reproduzida no Teste nesta execução; manter investigação aberta se reaparecer.

Sobre a pergunta de validade das distâncias: medições reais e alertas do buzzer mantêm seu valor como observações do firmware K2, cujos filtro/limiares/fórmula são executados na XIAO. Não repetir toda a campanha por causa do pacote Android. Por outro lado, não apresentar essas observações anteriores como validação do controlador/serviço nativo do pacote Teste, nem como precisão universal de metros. A conta/funções Android precisam de sua própria regressão curta no candidato correto antes da promoção.

## Tela bloqueada — rodada posterior

Solicitado 2 min com tela bloqueada, dispositivos próximos (~1 m) e parados, Bluetooth ativo, sem remover de Recentes. Responsável respondeu "nenhum alerta, só o retomando proteção e conectou, ok". Aprovado por relato nessa condição, com celular ligado ao computador por USB para diagnóstico; não é validação de Doze prolongado, autonomia ou processo morto.

ADB às **16:01:22 -03:00**, mesmo PID Teste 8046. Janela de leituras **15:56:27.261–16:01:23.011**: **591 chamadas readRssi**, maior intervalo **574 ms**, zero eventos selecionados de desconexão/reconexão/erro. Serviço `.teste` continuava foreground. Portanto, o termo "conectou" do relato corresponde a retorno visual compatível com ressincronização, sem reconexão GATT registrada nessa janela. Não afirmar que recebeu cada resposta/notificação apenas por contar chamadas.

Sem alteração de código/firmware. Regressões curtas Home e bloqueio passaram na instalação correta; relato original da oficial não foi reproduzido. Próximo cenário crítico separado: perda real do enlace com tela bloqueada e confirmação após recuperação, sem usar botão físico que ainda precisa de reparo.

## Emergência por perda real com tela bloqueada e recuperação

Roteiro executado depois: Teste protegido próximo, bloquear tela e desligar a caixinha pelo método habitual; não usar botão de emergência cujos fios aguardam reparo. Responsável informou:

1. **Alerta chegou** com a tela bloqueada. Não especificou separadamente sirene/vibração/e-mail; não aprovar esses canais extras por inferência.
2. Com caixinha desligada, tentativa de confirmar foi **recusada**, pedindo reconectar a placa para confirmar encerramento. Ação **Continuar alerta** também preservou a emergência.
3. Ao religar/reconectar próximo, o aplicativo encontrou a placa e voltou a mostrar distância, **mantendo emergência ativa**. Após confirmação pelo responsável, ficou **Protegido**. Resposta positiva ao roteiro sem pedir busca manual; não foi medida latência entre ligar e localizar.

ADB às **16:05:54 -03:00**, PID Teste 8046: `onClientConnectionState status=8 connected=false` às **16:03:21.699** e reconexão `status=0 connected=true` às **16:05:14.902** (tentativa às 16:05:14.609). Leituras RSSI continuavam até 16:05:54.228 e serviço `.teste` foreground. Isso confirma perda/recuperação GATT dentro do cenário; a recusa/retenção/ACK e a apresentação verde são aprovados pelo relato, não por decodificação independente da característica BLE.

**Regressão curta de primeiro/segundo plano, bloqueio, perda, recusa sem vínculo e confirmação após reconectar aprovada nesta rodada do Teste/K2**, sem novo patch de segundo plano nem alteração de rádio. Não é aprovação final de todos os ambientes, processo morto, autonomia ou APK sem Metro. Próxima etapa proposta: candidato APK sem servidor e validação instalada (Google, BLE, alerta/recuperação), com assinatura/pacote preservados; botão físico continua pendente após reparo na segunda-feira. Não gerar/promover a oficial por inferência de que uma rodada passou.
