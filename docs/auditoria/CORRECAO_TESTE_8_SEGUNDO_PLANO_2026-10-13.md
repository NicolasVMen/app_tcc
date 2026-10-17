# Correção experimental: tela bloqueada e confirmação da placa

## Evidências do teste físico

Aplicativo instalado: `com.nicolasvmen.escoltaunitau.teste`, Samsung SM_S928B.
O responsável relatou funcionamento de buzzer, sirene, vibração, notificação e e-mail.
Ao abrir a notificação, a distância desapareceu e foi necessário procurar manualmente a placa.
A confirmação sem conexão encerrou somente o alerta do telefone.

Registros Android de 13/10/2026 (horário do telefone, UTC−03):

- Última chamada `readRssi()` antes da pausa: 20:37:09.224.
- Chamada seguinte: 20:38:13.043, aproximadamente 63,8 segundos depois.
- Às 20:38:13.052 o aplicativo removeu a assinatura de notificações BLE.
- Às 20:38:13.069 chamou `cancelOpen()`, seguido de desconexão com status 0.
- Busca manual às 20:39:31; conexão às 20:39:31.973; notificações reativadas às 20:39:32.694.
- Após voltar a receber dados, o responsável confirmou a segurança e os dois alarmes pararam.

Esses registros comprovam a interrupção das chamadas de leitura e o encerramento local do vínculo.
O watchdog por leitura antiga é consistente com a sequência; a versão anterior não registrava qual rotina chamou `disconnectBle()`.

## Mudanças restritas ao teste

Identificação por `IS_TEST_BUILD` no JavaScript e sufixo `.teste` no serviço Android.
O firmware e o aplicativo oficial instalado não foram modificados nesta correção.

1. Serviço Android emite um pulso de 500 ms para as leituras RSSI, vigilância de dados e reconexão. Um único leitor evita operações RSSI sobrepostas. Eventos atrasados não produzem uma rajada de leituras antigas.
2. CPU mantida ativa durante o serviço de proteção de teste, com lease de 60 s renovada a cada 45 s. Ao parar o serviço, perder observadores ou destruir o serviço, a retenção é liberada. Não mantém a tela ligada nem altera configurações globais do telefone.
3. Ao voltar ao aplicativo, a leitura antiga não é apresentada como atual. Há uma janela limitada de 6 s para recuperar leituras antes da desconexão pelo watchdog. Rejeições de operações iniciadas antes do retorno não encerram a conexão atual.
4. Retomar depois de abrir em espera reativa a busca periódica. Uma desconexão durante uma emergência também solicita reconexão, sem apagar o alerta.
5. A confirmação sem vínculo é recusada. Com vínculo, o comando `reset` continua exigindo uma resposta posterior à escrita com `panico_ativo=false` e `estado=seguro`. Falha ou perda de vínculo mantém a emergência.
6. O diálogo do teste mostra o motivo pelo qual a confirmação não foi concluída.

O modo oficial conserva o comportamento anterior; os testes incluem a verificação dessa separação.

## Validação e implantação

- 95 testes automatizados passaram, sem falhas ou casos ignorados.
- Verificação TypeScript aprovada.
- Compilação nativa de teste aprovada: `assembleDebug`, 374 tarefas.
- Pacote do APK conferido: `com.nicolasvmen.escoltaunitau.teste`; nome `Escolta Teste`.
- SHA256 do APK: `6CA378CB10C535C38D8CBBD6373E141CF1DA7D9634BAFBCF2707750FA0751225`.
- Oficial instalado antes da implantação: `lastUpdateTime=2026-07-31 23:33:32`.

O responsável confirmou a placa em espera antes da atualização. A instalação por USB com `install -r` retornou `Success`, preservando os dados do aplicativo.
O teste passou a ter `lastUpdateTime=2026-10-13 20:51:27`. As permissões Bluetooth, notificações e retenção de CPU estão concedidas.
Após a instalação, o oficial continuou com `lastUpdateTime=2026-07-31 23:33:32`, sem atualização.
Colocar a placa em espera antes de atualizar evita que o encerramento do processo durante a instalação produza um alerta de teste.
O APK usa o servidor Metro; as alterações JavaScript são fornecidas por ele.

## Repetição física após atualização

O responsável retomou a proteção, bloqueou a tela, acionou o botão físico e abriu a notificação sem procurar manualmente a placa.
Relatou emergência com conexão mantida e apenas a opção de confirmar segurança. Após a confirmação, voltou a protegido e os alertas pararam.
Na captura dessa repetição, houve 405 chamadas RSSI do novo processo (PID 28907); o maior intervalo foi de 0,657 s, sem evento de desconexão desse processo.
O serviço estava em primeiro plano e a retenção parcial de CPU da rotina nova estava ativa.
Teste 8 aprovado nessa execução com USB conectado; isso não comprova outras durações, restrições Android ou funcionamento sem o cabo.

Teste 9: o responsável iniciou uma emergência, desligou o Bluetooth do celular e tentou confirmar segurança sem vínculo. Relatou mensagem exigindo ligar Bluetooth/reconectar, com a emergência mantida. Ao religar Bluetooth, houve reconexão automática. Após confirmar com vínculo, os dois alarmes pararam. Teste 9 aprovado por relato físico; não foi feita nova captura de logs nessa etapa.

Teste 10: partindo de protegido, sem apertar o botão, o responsável desligou o Bluetooth. Relatou tentativa de reconexão seguida de emergência e alertas no celular e na caixinha. Ao religar, reconectou automaticamente e permaneceu em emergência até a confirmação. Ao confirmar, voltou a protegido. Teste 10 aprovado por relato físico com aplicativo aberto; não valida a perda do vínculo com tela bloqueada.

Teste 11: em espera, o responsável pressionou o botão e relatou ausência de alertas no aplicativo e na placa, com LED azul piscando. Na conferência ADB seguinte, não apareceu serviço ativo do aplicativo de teste e havia zero retenções de CPU ativas `ProtectionHeartbeat` desse pacote. Pausa e liberação de CPU aprovadas nessa execução.

## Ainda precisa de comprovação física

- Repetir em etapa posterior sem USB e com bloqueio mais longo, observando vínculo e dados após desbloquear.
- Abrir em espera, retomar e verificar reconexão automática em uma interrupção controlada.
- Verificar também falha de confirmação por timeout com Bluetooth ligado (a recusa sem vínculo e o sucesso após reconectar foram validados no teste 9).
- Verificar novamente a liberação de CPU em encerramento da conta e outras interrupções; a pausa foi validada no teste 11.
- Repetir ensaios de consumo/autonomia no celular e dispositivo. A medição anterior não valida esta nova rotina.

Não se afirma funcionamento sob encerramento forçado, morte do processo, Bluetooth desligado ou restrições extraordinárias do fabricante. O serviço mantém o alarme nativo já armado, mas a comunicação ainda depende do runtime do aplicativo.

Referências técnicas consultadas: [Expo Modules API](https://docs.expo.dev/modules/module-api/) e [retenção de CPU no Android](https://developer.android.com/develop/background-work/background-tasks/awake/wakelock). A documentação Android alerta para o custo energético; a rotina foi limitada ao serviço de proteção de teste e ainda requer medição.
