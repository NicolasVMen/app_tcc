# Remoção de Recentes — monitor persistente na versão de teste

Data: 14/10/2026. Retenção do vínculo, emergência por botão sem tela e pausa/retomada ao remover/reabrir aprovadas por relato nos roteiros propostos.

## Falha observada

O responsável relatou que remover Escolta dos aplicativos recentes encerrava o vínculo, recuperado ao abrir novamente. Não era apenas bloquear a tela ou minimizar.

Os registros capturados mostraram remoção da tarefa às 00:05:17.935, `BluetoothGatt cancelOpen()` às 00:05:18.004, desconexão às 00:05:18.007 e novo vínculo às 00:05:41.966. O PID 8308 permaneceu; o serviço Android estava em primeiro plano com `stopWithTask=false` e `START_STICKY`. Não foi constatada morte do processo nessa reprodução.

A limpeza do monitor React chamava `disconnectBle()` quando a raiz visual era desmontada. A vida do serviço Android não impedia essa liberação explícita do GATT pela aplicação.

## Alteração implementada

- Apenas `IS_TEST_BUILD` usa o novo controlador observável, com vida vinculada à conta autenticada e não à presença da tela.
- Desmontar a tela remove sua assinatura de estado, sem desconectar, descartar temporizadores ou recriar o controlador na reabertura da mesma conta.
- Pausa continua sendo comando explícito que encerra a proteção; saída da conta mantém o fluxo de pausa confirmado já existente.
- Perda/troca da conta libera recursos uma vez; outra conta aguarda a liberação do GATT antigo antes de iniciar. Descarte inesperado não confirma segurança nem cancela uma emergência retida.
- Preferências persistidas continuam chegando ao controlador sem a tela aberta.
- As regras de sinal, confirmação de segurança e firmware não foram alteradas nesta correção. O ramo oficial continua usando o monitor anterior.

Arquivos principais: `src/utils/monitorScope.ts`, `src/services/persistentMonitor.ts`, `src/hooks/usePersistentEsp32Monitor.ts`, `src/hooks/useEsp32Monitor.ts` e `App.tsx`.

## Verificação local

- TypeScript: `npm run typecheck`, aprovado.
- Suíte completa: `npm test`, 117 aprovados, nenhuma falha ou teste ignorado.
- Inclui testes do monitor real sem assinante visual: telemetria, botão de emergência, perda de vínculo, reabertura e pausa; inclui descarte, troca de conta, barreira de encerramento e atualização de preferências.
- Bundle Android servido pelo Metro local: HTTP 200, contendo `getPersistentMonitor` e o novo escopo. A requisição inicial a `/index.bundle` retornou 404 por não corresponder à entrada deste projeto; a entrada correta é `/node_modules/expo/AppEntry.bundle`.

Testes automatizados usam adaptações/mocks dos recursos Android e BLE; não substituem o teste no aparelho.

## Próxima validação física

Após executar o primeiro roteiro proposto (recarga em espera, retomada, remoção de Recentes por 30 segundos e reabertura com aparelhos próximos), o responsável respondeu “funcionou corretamente”. Cenário aprovado por relato, sem nova captura de logs. Restam alerta pelo botão sem tela e pausa/retomada nesse ciclo de vida; não atribuir aprovação de morte do processo a essa resposta.

Atualização: respondeu “1 - funcionou / 2 - funcionou” aos dois roteiros seguintes: emergência pelo botão com app removido, abertura pela notificação e confirmação; espera, botão ignorado com app removido, reabertura em espera e retomada. Esses cenários estão aprovados por relato, sem nova captura de logs. A pendência física indicada no parágrafo anterior foi concluída para esses roteiros, não para encerramento forçado ou morte do processo.

Com Sentinela em espera e silenciosa, recarregar completamente pelo `r` do Expo. Abrir Escolta Teste, retomar proteção e aguardar Protegido. Manter telefone e caixa próximos; remover o aplicativo de Recentes, esperar 30 segundos e reabrir. Verificar se a remoção por si só não gerou alarme/perda de vínculo e se leituras voltam sem busca manual. Depois testar botão físico com a tela removida, abertura pela notificação e confirmação real de segurança.

Não há promessa de sobrevivência a encerramento forçado, reinício, morte completa do processo ou restrições adicionais do fabricante. Esses cenários são distintos da desmontagem visual observada e requerem validação/solução própria. Não foi instalado novo APK nem gravado firmware nesta etapa; a correção é JavaScript e requer recarga completa para evitar controlador antigo retido pelo Fast Refresh.
