# Correções após a reauditoria — 17/10/2026

## Resultado e limites desta etapa

As quatro lacunas principais foram corrigidas no código. A oficial instalada não foi substituída e nenhum APK novo foi gerado/instalado nesta etapa. Na fase inicial abaixo o W1 foi somente compilado; após confirmação explícita de espera e USB pelo usuário, foi gravado em 17/10/2026, conforme registro ao final. Isso não declara testes físicos ou distribuição aprovados.

| Ponto | Alteração | Evidência | Ainda falta |
| --- | --- | --- | --- |
| A1 — pulso nativo da oficial | `ValidatedMonitorPolicy` consulta pacote Teste **ou** metadata validada; módulo e serviço usam a mesma política. | Testes de contrato/política e Kotlin release compilado. Oficial antiga continua desligada por padrão. | APK candidato/estado final no celular. |
| A2 — RSSI ausente, GATT aberto | Watchdog W1 independente na XIAO, 8 s, com carência inicial/retomada e suspensão em espera/desconexão real. | Sete verificações C++ constexpr, integração do sketch, compilação completa W1 e marcadores no binário. | Gravar com autorização e validar fisicamente, incluindo segundo plano. |
| A3 — gravação cruzando contas | `accountStorageFor(owner)` e `TrialHistoryStore` capturam o proprietário antes de qualquer espera; removida fila externa do modal. | Gravação atrasada de A após login B permanece em A; callback real do modal também verificado. | Regressão curta no app, sem necessidade de expor contas reais a atrasos artificiais. |
| A4 — histórico ilegível | Falha de leitura mantém coleta/sobrescrita bloqueadas, preserva conteúdo e oferece tentar carregar novamente. | JSON inválido, estrutura inválida, falha de leitura e recuperação testados. | Conferência da tela/rolagem no celular. |
| Dependências | Override dirigido do PostCSS 8.4.49 → 8.5.30, sem atualizar Expo/React Native/Firebase. | npm alterou um pacote; bundle Android recompilado e tipagem/testes aprovados. | Triagem residual abaixo; não está com audit zerado. |
| Distribuição | Perfil `oficial-validada`, guarda contra chave debug e verificador do APK final. Backup APK/fontes/HEAD preservado. | Guarda realmente recusou tarefa release oficial com chave debug. Verificador recusou corretamente APK dev antigo. | Conferir EAS/Firebase remoto, gerar e validar APK candidato sem servidor; só depois promover. |

## Comportamento preservado

`ProximitySignal.h` e `ProximityDistance.h` permaneceram idênticos ao inventário anterior. Não foram alterados Kalman Q1/R4, fórmula D1, limiares −77/−90, histerese, confirmação de sinal por 4 s, potência solicitada +4 dBm, política do buzzer, corrente de carga ou topo visual da bateria. Os 8 s do watchdog são um prazo de **falha de comunicação**, não um novo limiar de distância.

Nova variante exata: `xiao-p5-r4-d1-k2-w1`, opt-in `ESCOLTA_TESTE_WATCHDOG_RSSI=1` que exige K2. K2 sem W1 e os perfis antigos continuam disponíveis. Não basta recompilar o `.ino` sem as opções: usar `tools/compilar-firmware-k2-w1.ps1` para reproduzir a variante completa. Esse script só compila, não possui upload/reset/porta serial.

No W1:

- A conexão ativa e a retomada iniciam uma carência de 8 s; leituras válidas recebidas renovam o prazo.
- A primeira amostra pendente é considerada antes de verificar a expiração, evitando um disparo na mesma iteração em que chega dado novo.
- Ausência prolongada ativa pânico retido na placa; receber RSSI novamente ou reconectar **não** apaga esse pânico.
- Confirmação humana continua exigindo leituras fortes/recentes, monitor ativo e ACK seguro; o app aceita somente a nova tag exata, mantendo o mínimo K2 de > −77 dBm bruto e filtrado.
- Em espera o watchdog está desarmado. Uma desconexão real continua pelo caminho anterior de aproximadamente 5 s, sem ser convertida artificialmente em distância.
- `uint32_t` e subtração modular foram testados para rollover de `millis`.

Compilação completa: programa **335.488 bytes (41%)**, globais **70.064 bytes (29%)**. Acréscimo frente ao K2 anterior: 176 bytes de programa e 8 bytes globais. Isso não é uma medição de consumo/autonomia.

Pacote preparado: `.expo/proximity-radio4-d1-k2-w1/xiao_escolta_ble.ino.zip`, SHA-256 após repetir pelo script reproduzível: `8976F4EFEF7A9BC5409FB5770CDA85A16B4736A40CC894A650919F541C107734`. Conferir o hash imediatamente antes da futura gravação; uma nova compactação pode mudar o hash do ZIP mesmo sem mudança de comportamento. A identificação de variante e o marcador K2 foram encontrados no binário. Nenhum upload foi feito.

## Histórico, falhas e recuperação

Cada `TrialHistoryStore` tem dono imutável. Até um callback antigo que só execute depois da troca de conta salva no namespace original; ele não emite atualização para a conta atual diferente. A fila central já serializa as gravações em ordem, sem a fila externa que capturava UID tarde demais.

`load()` só autoriza salvar após ler/validar o conteúdo original. Nulo representa ausência legítima de histórico; texto vazio, JSON inválido, estrutura incorreta ou erro de leitura **não** viram uma lista vazia pronta para sobrescrever. Há botão de nova tentativa, sem limpeza automática. Este mecanismo preserva dados ilegíveis; não promete reconstruí-los automaticamente.

Falha de salvamento é diferente de falha de carregamento: dados novos permanecem em memória, com aviso. A exportação pode resgatá-los mesmo que a última gravação tenha sido rejeitada. Se a gravação ainda estiver pendente, a exportação aguarda com limite de 10 s. O histórico não é apagado para tentar resolver erro.

Testes novos cobrem: proprietário A/B, fila atrasada, ordem de salvamento, JSON ilegível/estrutura inválida, leitura indisponível e recuperação, disco cheio, salvamento sem carga inicial/dono, ligação do componente, watchdog e política nativa. São testes de código/mocks, não ensaios físicos.

## Dependências: correção dirigida e risco residual

Consulta posterior registrada em `dependencias_2026-10-17_apos_correcoes.json`: **43 pacotes sinalizados, 26 altos, 17 moderados, zero críticos**, versus 44/27/17 antes. Não são 43 falhas independentes comprovadamente exploráveis no APK: o npm propaga avisos entre dependentes.

| Origem direta de aviso | Versão instalada / publicada consultada | Tratamento nesta etapa |
| --- | --- | --- |
| PostCSS | 8.4.49 → 8.5.30 | Atualizado explicitamente só sob `@expo/metro-config`; bundle e testes passaram. É fora do `~8.4.32` declarado pelo pai, portanto override documentado e sujeito à regressão de build, não atualização silenciosa. |
| braces | 3.0.3 / 3.0.3 | Registro ainda sinaliza a versão publicada mais recente; não inventar correção por downgrade. Ferramentas/globs de build. |
| node-forge | 1.4.0 / 1.4.0 | Ainda sinalizado na versão publicada consultada; cadeia de certificados/CLI de desenvolvimento/build. Não substituído por versão arbitrária. |
| sprintf-js | 1.0.3 / 1.1.3 | Aviso inclui até 1.1.3; cadeia argparse/js-yaml/ferramentas de teste do React Native. |
| image-size | 1.2.1 / 2.0.4 | Correção publicada é da linha 2; Metro atual importa a função default da linha 1. Não forçar mudança principal sem adaptar/testar seu consumidor; processamento de imagens do build. |
| @grpc/grpc-js | 1.9.16 / 1.14.6 | Firestore fixa `~1.9.0`; linha corrigida requer sair desse intervalo. O app importa Firebase Auth, não Firestore/servidor Node gRPC. Não alterar esse contrato sem validação específica. |
| uuid | 3.4.0 e 7.0.3 / correção ≥ 11.1.1 | Troca principal nas cadeias ngrok/xcode pode romper APIs. Não forçar globalmente. |

Não executar `npm audit fix --force`: as sugestões vistas incluíam trocar Expo 54 por 44 e alterar versões principais de React Native/Firebase. O risco residual permanece registrado, sem alegar que seja zero ou que todos os avisos afetem a execução no celular. Não processar conteúdo de terceiros não confiável no ambiente de build até completar essa triagem.

## Preparação de distribuição e backup

- `eas.json`: perfil novo `oficial-validada` herda `production`, pede APK e habilita a propriedade Gradle `escoltaValidatedMonitor`. Não foi executado build EAS. O perfil `production` antigo não foi promovido automaticamente.
- Plugin e Gradle local: uma tarefa release da **oficial validada** com assinatura ausente/debug é recusada antes de executar a tarefa. Teste paralelo mantém sua assinatura própria. Isso bloqueia um erro conhecido, mas não substitui conferir o certificado final.
- `tools/auditoria/verificar_apk_final.ps1`: verifica assinatura com apksigner, pacote, certificado esperado, versão de referência, metadata validada, bundle e áudio incorporados. Não instala nem consulta Firebase. No APK dev existente, reconheceu pacote/certificado/metadata e recusou corretamente `debuggable` e ausência de bundle.
- O cadastro remoto do certificado oficial no Firebase e o acesso/uso da chave original EAS continuam pendentes; não foram exportadas senhas ou chaves privadas.
- Nenhum APK de desenvolvimento deve ser chamado de candidato sem servidor só porque os módulos Kotlin compilam.

Backup principal conferido: `backups/releases/2026-10-17_pre-promocao_conferido`. Preserva o APK antigo, fonte de trabalho da candidata e árvore Git de referência. O ZIP dos fontes tem **207 entradas**, caminhos corretos, nove arquivos de dados de testes, sem builds e sem arquivos de credenciais detectados pelos filtros. O primeiro checkpoint `2026-10-17_pre-promocao` também foi mantido, incluindo o pacote K2 anterior para retorno autorizado.

Os fontes atuais são da candidata em preparação; **não há comprovação do fonte exato usado para compilar o APK oficial antigo**. O backup não inclui dados/sessão do celular nem chave de assinatura. A cópia local não protege contra perda do disco: preservar cópia externa antes de qualquer limpeza. Nenhum backup foi enviado à internet.

## Verificação executada

- **183 testes Node aprovados**, zero falhas, skips ou TODO.
- TypeScript sem erros.
- Todos os perfis C++ anteriores continuam compilando; sete novos `static_assert` do watchdog aprovados.
- Firmware W1 completo compilado no core/FQBN XIAO do projeto, sem upload.
- Validação Android Teste standalone repetida após os ajustes finais: **BUILD SUCCESSFUL**, Kotlin e bundle incorporado validados como intermediários. Bundle final desta etapa: 2.054.752 bytes, SHA-256 `6719fecc934a8dad608a6270a97df105cd1d3ee456a9becd8a53c1460216bf84`. Nenhum APK foi solicitado.
- Bloqueio real de tarefa release oficial com chave debug aprovado em teste negativo.
- Verificador de APK recusou o APK dev, como esperado; não houve teste positivo de um APK candidato novo inexistente.
- Inventário posterior em `RASTREABILIDADE_APOS_CORRECOES_2026-10-17.json`: 33 fontes, 32 alcançáveis, nenhuma importação local ausente. `PatrolScreen` continua legado não roteado.

## Próxima sequência, guiada e sem repetir toda a calibração

1. Confirmar Teste em espera/silencioso e XIAO no USB de dados; só então autorizar e gravar W1. Conferir a tag recebida, não apenas o nome do arquivo.
2. Regressão curta perto: coleta/exportação, espera/retomada, amarelo/vermelho, retorno e confirmação, minimização/tela bloqueada. Preservar as marcas/ambiente aprovados em vez de prometer metragem exata em todo ambiente.
3. Teste específico do watchdog exige suspender o envio de RSSI mantendo GATT. Desligar Bluetooth/placa testa outro caminho e não comprova W1. Preparar ensaio controlado entre adultos, sem criança, com recuperação disponível.
4. Gerar APK candidato separado, validar arquivo final e testar instalado sem Expo/Metro. Conferir Google, alertas, segundo plano e exportação.
5. Somente após aprovação, conferir assinatura/Firebase da oficial e promover. Não desinstalar a oficial para contornar certificado divergente.
6. Botão físico após reparar fios na segunda-feira; autonomia integral e descarga/bateria baixa continuam pendentes de medição.

## Gravação autorizada W1 — 17/10/2026, aproximadamente 16h50 (−03:00)

- Usuário confirmou: “ambos conectados e app em espera”. Não foi enviado comando de retomada da proteção.
- Descoberta real identificou uma única XIAO, serial `8BDE14575D4B412E`, VID/PID `2886:8045`, porta COM8. O script de upload repetiu essa identificação e verificou o SHA-256 antes da escrita.
- Gravado o pacote `xiao_escolta_ble.ino.zip` W1 de SHA-256 `8976F4EFEF7A9BC5409FB5770CDA85A16B4736A40CC894A650919F541C107734`, FQBN `Seeeduino:mbed:xiaonRF52840Sense`.
- Upload passou pela COM9 DFU, terminou com `Activating new firmware` / `Device programmed.` e indicou retorno à COM8. Nova descoberta confirmou a mesma identidade na COM8.
- A consulta ADB `devices -l` ficou pendente; foi encerrado somente esse cliente, preservando o servidor ADB. Isso não comprova ausência do Samsung nem valida o estado do aplicativo.
- Usuário confirmou a tag `xiao-p5-r4-d1-k2-w1` recebida após conectar. Nenhum APK foi instalado nesta gravação.

### Regressão física relatada após a gravação

- Solicitado: retomar perto de 1 m por 1 minuto em primeiro plano, com estado Protegido, distância atualizando e sem alarme; depois manter posição e bloquear a tela por 2 minutos, sem alarme e com vínculo preservado ao retornar.
- Usuário respondeu aos dois: “deu certinho, ta ok”. Registrados como aprovados por relato, sem captura instrumental de logs/CSV nesta etapa.
- Isso valida o fluxo normal próximo e o intervalo de tela bloqueada ensaiado; não comprova o disparo específico por falta de RSSI com GATT ainda aberto.
- Histórico/exportação: solicitado coletar 30 amostras a 1 m, sair e voltar à tela para conferir persistência/rolagem, abrir o compartilhamento, cancelar e abrir novamente. Usuário respondeu “deu certinho” e enviou `Escolta_2026-10-17_17-04-52-724_ultimo-ensaio_amostras.csv`, SHA-256 `5D95B146F2E5A595DB6BCB095919B664B3104D4C1D53B189E5E2D25B708601F6`.
- CSV conferido: 30 linhas, um ensaio concluído (`1792267396495-7x0nnc`), distância real declarada de 1 m, firmware W1 em todas as amostras, estado `seguro` e `panico_ativo=false` em todas. Coleta ocorreu entre 20:03:16.495Z e 20:03:56.926Z. Isso não substitui a regressão dos alertas nem prova precisão em outras distâncias/ambientes.
- Alertas W1: solicitado afastamento lento até a marca anteriormente aprovada próxima de 3 m, confirmação de amarelo/bipe lento/vibração inicial e retorno automático a Protegido ao aproximar; depois afastamento próximo de 5 m, emergência retida ao retornar e encerramento somente por confirmação aceita pela placa. Usuário respondeu aos dois: “funcionou corretamente”. Aprovados por relato neste ambiente, sem CSV ou cronometragem desse trecho; não representam fronteiras métricas universais do RSSI.
- A regressão normal guiada (primeiro plano, tela bloqueada, coleta/histórico/exportação e alertas por afastamento/retorno) está aprovada por relato/CSV conforme discriminado acima. Permanece pendente a injeção controlada de ausência de RSSI com vínculo GATT preservado para validar fisicamente o disparo específico W1, além da validação do APK standalone e das limitações já registradas.

### Preparação da injeção W1, após nova confirmação de espera

Usuário confirmou “pronto, deixei em espera”. Preparado painel manual em Sistema → Verificar prontidão, habilitado somente por `__DEV__ && IS_TEST_BUILD`. Suspende envio por 15 s e adia só a recuperação de RSSI antigo por até 18 s; ausência de telemetria ainda força recuperação normal. O app normalmente recupera em 6 s e impediria o ensaio do watchdog de 8 s sem essa exceção limitada. A emergência não é limpa ao retomar o envio. Não houve nova gravação da XIAO nem início automático da simulação.

Tipagem aprovada e **192 testes Node passaram**, sem falhas/skips/TODO nesta preparação. Gate antigo contra promoção involuntária da oficial foi mantido; a capacidade de diagnóstico fica separada da capacidade de monitoramento validado. Procedimento, limitações e resultado físico pendente em `docs/testes/ENSAIO_WATCHDOG_W1_2026-10-17.md`.

Validação standalone dos intermediários repetida com sucesso após o painel: 1 min 25 s, bundle 2.063.348 bytes, SHA-256 `bf112e00cbf0ef99ab6409309b3b9c0013e0971adf71f570d0a32b4dee0fd64c`; zero importações locais ausentes no inventário (34 fontes, 33 alcançáveis). Nenhum APK gerado/instalado. Os hashes anteriores deste relatório identificam etapas anteriores, não o bundle mais recente.

### Resultado recebido da injeção W1

Diagnóstico compartilhado pelo usuário, consulta `2026-10-17T20:19:27.948Z`: janela encerrada, 18 notificações válidas, primeiro pânico da placa recebido após **8256 ms**, escrita RSSI retomada na janela e nenhuma interrupção registrada. Usuário também confirmou que placa e celular estavam apitando e avisando emergência. Resultado compatível com disparo do watchdog de 8 s sem desconexão intencional; tempo medido pelo app até notificação recebida, não por instrumento externo no firmware. Registro integral e limites em `docs/testes/ENSAIO_WATCHDOG_W1_2026-10-17.md`.

Disparo físico e retomada do envio aprovados nessa condição. Usuário confirmou posteriormente “sim, pararam e ta ok agora” à pergunta sobre confirmação de segurança, silêncio dos dois dispositivos e retorno a Protegido. Recuperação final aprovada por relato; o diagnóstico anterior sozinho não demonstrava essa etapa. **Ensaio W1 concluído nesta rodada.** Não foi gerado/instalado APK nesta rodada.

Próximas pendências de distribuição permanecem: gerar candidato separado e verificar APK final (assinatura, identidade, versão e recursos incorporados), executar checagem física sem Metro, conferir assinatura original/cadastro Firebase da futura oficial antes da promoção e preservar checkpoint do código/firmware/APK efetivamente distribuído. Backup anterior da oficial já preservado, sem comprovação do fonte exato de sua compilação. Botão físico após reparo e medições de autonomia/descarga real continuam separados da aprovação W1.

### Interface de uso solicitada após concluir W1

Usuário pediu esconder ferramentas e retirar mensagens de fase de teste antes do APK; confirmou espera antes da edição. Ensaios, diagnóstico, disparos manuais, simulação W1 e área técnica agora exigem opt-in `EXPO_PUBLIC_ENABLE_INTERNAL_TOOLS=true`, cliente Teste e `__DEV__`; ficam desligados por padrão e bloqueados em qualquer release. Interface normal e mensagens de erro revisadas sem remover avisos de distância estimada, supervisão e limitações dos canais externos. Dados e identidade/assinatura preservados. **200 testes Node e tipagem aprovados.** Detalhes, ativação e limites em `INTERFACE_DE_USO_APK_2026-10-17.md`.

Validação Android repetida após a limpeza da interface: **BUILD SUCCESSFUL** em 1 min 24 s, bundle 2.063.796 bytes, SHA-256 `91a33bebae0e1020676c84bee7e2db1674b6d4518d4d872ebca4541a3e1c0abe`. Verificador aprovou intermediários/configuração cliente; nenhum APK foi gerado/instalado. Firmware e três cabeçalhos de sinal/distância/watchdog conferidos por hash: inalterados frente ao snapshot após as correções W1. Cadastro remoto Firebase, APK final e instalação sem Metro permanecem pendentes.

### Etapa posterior: candidato standalone gerado e instalado

Após confirmação de espera, primeiro APK standalone Teste gerado com sucesso (4 min 44 s), conferido por assinatura, pacote, bundle e recursos, e atualizado via USB somente no pacote `.teste`. APK SHA-256 `DBB17FD77D333F52DB9A7C3E4AADC8AF05E65FC2D9B84C602EA47790B501E703`; versão 1.0.0-teste-sem-servidor/código 1, não depurável, mesmo certificado Teste anterior. A oficial permaneceu sem atualização. Backup preservou fontes, firmware e APKs antigos antes da instalação.

O verificador de APK foi corrigido para consultar nomes lógicos da tabela Android: o empacotamento renomeou arquivos de áudio/fonte, sem alterar seus bytes. Comparados por hash e aprovados. **207 testes Node e tipagem aprovados** depois do ajuste da ferramenta; nenhum comportamento do aplicativo foi modificado para contornar a checagem. Ainda aguarda abertura e checagem física sem Metro e não foi promovido a oficial. Registro completo em `APK_CANDIDATO_STANDALONE_2026-10-17.md`.
