# Reauditoria do código ativo — 17/10/2026

## Conclusão

O fluxo que foi aprovado nos testes físicos permanece preservado, mas **ainda não recomendo promover o código a oficial**. A revisão encontrou três lacunas principais, além das verificações de distribuição que já estavam pendentes. Testes automatizados aprovados não equivalem a ausência de falhas.

Esta etapa é de diagnóstico. Nenhum comportamento do aplicativo ou firmware foi corrigido, nenhuma placa foi gravada e nenhum aplicativo foi instalado. Foram acrescentados somente o roteiro de reprodução e os registros desta auditoria. A compilação de verificação, quando executada, modifica apenas intermediários/caches, não o app instalado.

## Escopo e rastreabilidade

- Entrada `App.tsx` e todos os módulos locais alcançáveis por suas importações: **31 arquivos TypeScript/TSX**, com leitura funcional, inclusive telas, serviços e utilitários. Isso inclui os dois caminhos condicionais do monitor, não significa que ambos executam simultaneamente.
- **32 arquivos** no inventário `App.tsx` + `src`: `PatrolScreen.tsx` é legado sem rota/importação na aplicação atual. Não foi apagado nem usado como evidência do ensaio atual.
- **36 arquivos complementares** registrados com SHA-256: firmware XIAO e seus cabeçalhos, módulos Android, configurações de compilação, pacote/lock e recursos selecionados. Hash não significa revisão semântica de cada linha do lock ou de dependências de terceiros.
- Nenhuma importação local não resolvida no grafo examinado.
- Leitura dos módulos nativos de autoria do projeto e dos caminhos de configuração Android/Expo usados para preparar o candidato.
- Não é uma nova auditoria dimensional da caixa, dos documentos do CICTED/TCC, do firmware ESP32 legado, nem do código-fonte de cada dependência em `node_modules`. São escopos distintos.
- O inventário registra a cópia local, incluindo mudanças ainda não commitadas. Não é um backup completo nem comprovação de que o GitHub contém essa cópia.

Arquivos de evidência:

- `RASTREABILIDADE_CODIGO_ATIVO_2026-10-17.json`: grafo local, hashes, matriz de promoção e reproduções negativas.
- `dependencias_2026-10-17_reauditoria.json`: consulta atual ao npm, sem atualização de pacotes.
- `tools/auditoria/revisar_codigo_ativo.cjs`: regeneração de leitura/simulação, sem hardware, rede ou dados reais. A simulação não faz parte da contagem dos 172 testes de regressão.

## Achados principais

### A1 — P1: promoção para oficial não habilita todo o monitor nativo

**Evidência:** `EscoltaSentinelaModule.kt:14–20` disponibiliza o evento periódico e instala o callback somente para pacote terminado em `.teste`. `EscoltaSentinelaService.kt:160` inicia a rotina somente nesse pacote. Já `nativeIdentity.ts` permite o monitor validado na oficial mediante `escolta.validated_monitor=true`, lido pelo módulo Auth e configurável no plugin/Gradle.

Consequência: a futura oficial com essa opção teria o controlador JavaScript validado, mas não receberia o mesmo pulso nativo de 500 ms nem a renovação do WakeLock feita por essa rotina. Usaria temporizadores JavaScript como alternativa. **Isso não prova uma desconexão futura em todo aparelho, mas prova que ela não teria a mesma implementação testada.**

| Pacote | Opção validada | Controlador JS validado | Pulso nativo atual |
| --- | --- | --- | --- |
| Teste | Ativa | Sim | Sim |
| Oficial | Inativa | Não | Não |
| Oficial | Ativa | Sim | **Não** |

No Teste atual, o pulso continua habilitado. Não foi alterado nesta auditoria.

Correção proposta: uma política nativa única para o recurso validado, independente da identidade/nome/esquema do pacote; manter a oficial antiga desligada por padrão; testar a futura oficial com a opção ativa e o Teste. Não basta renomear o app ou reutilizar somente seu bundle.

### A2 — P1: ausência de RSSI novo não dispara um alerta autônomo na placa conectada

**Evidência:** `xiao_escolta_ble.ino:313–350`, especialmente `if (!rssiAtualizado) return` em `335`. O contador de perda atua quando `conectado=false`; com o enlace aberto, sem novas escritas de RSSI, a decisão anterior é mantida. `enviarStatus` passa a enviar distância nula após a validade expirar, mas isso não altera o estado/buzzer/LED.

Reprodução local do fluxo real de `processarSinal`, com periféricos simulados e estado inicial seguro:

- 120 chamadas de 500 ms, conexão mantida e nenhum RSSI novo: continua seguro, sem pânico.
- As mesmas chamadas com conexão perdida: contador chega a 10 e ativa pânico.

O aplicativo tem um watchdog de dados de aproximadamente 6 s, que normalmente desconecta e permite o alarme. Entretanto, ele depende da execução do JavaScript: o evento periódico nativo também precisa ser processado no JS para chamar esse watchdog. Uma paralisação desse runtime com GATT ainda aberto não fica coberta autonomamente pela placa. **É um caso negativo de código, não uma nova falha observada nos ensaios físicos de hoje.**

Correção proposta: watchdog de comunicação na própria XIAO, com carência inicial e tempo explícito, desativado em espera, sem interpretar ausência de amostra como distância. Deve produzir condição técnica segura/alerta e impedir confirmação com dado antigo. Validar pausa, retomada, minimização e recuperação para não introduzir alarmes indevidos. Os limiares K2 não precisam mudar para resolver isso.

### A3 — P2: gravação pendente de ensaio pode cruzar contas

**Evidência:** `ProximityTrialModal.tsx:77–80` agenda a chamada a `AsyncStorage.setItem` dentro de outra fila. `accountStorage.ts:71` captura o dono no momento dessa chamada, não no momento em que o ensaio terminou.

Reprodução com o callback `finish` extraído do componente real e o módulo `accountStorage` real, mas memória/contas simuladas:

1. Ensaio termina na conta A, com a fila anterior do modal artificialmente atrasada.
2. A sessão muda para B antes de esvaziar a fila.
3. A gravação é liberada.
4. O ensaio de A é escrito em `@escolta_proximity_trials_v1:uid:B`.

O armazenamento central captura corretamente o dono das operações já invocadas. A lacuna está no agendamento externo do modal. Não há evidência de que isso já tenha ocorrido no histórico real; os testes normais de contas que passaram não incluíam essa combinação com gravação atrasada.

Correção proposta: capturar explicitamente o UID proprietário ao iniciar/terminar a coleta e conservar esse dono em toda gravação pendente; não depender da conta global vigente depois de um `await`. Adicionar regressão com atraso, logout e segunda conta.

## Ajustes adicionais e riscos de distribuição

### A4 — P2: histórico ilegível não bloqueia a substituição por histórico vazio

Em `ProximityTrialModal.tsx:50–64`, erro de leitura/JSON/histórico inválido deixa `storageError=true`, mas termina com `loaded=true` e `runsRef=[]`. `start` e `canStartTrial` não exigem recuperação desse histórico. Ao concluir uma nova coleta, `finish` pode sobrescrever o mesmo armazenamento com apenas a sessão nova.

É conclusão por inspeção do caminho de erro, não corrupção de dados reais reproduzida. Recomendo bloquear a sobrescrita até recuperar ou preservar a cópia bruta, diferenciando falha de carregamento de falha de salvamento. Não apagar automaticamente o histórico antigo.

### A5 — assinatura, opção de compilação e backup ainda impedem adotar qualquer release como oficial

- O `release` local em `android/app/build.gradle:115` usa a chave de debug. Isso serve ao candidato paralelo de teste, **não à atualização da oficial antiga**, cujo certificado é diferente.
- O script standalone exige `-TestApp` e preserva a separação de pacote, o que está correto. Ele não constitui um fluxo pronto de promoção oficial.
- O `eas.json` genérico não fornece, por si só, a opção `escoltaValidatedMonitor=true`. Um build oficial padrão pode preservar o caminho antigo em vez do validado. Preparar um perfil explícito e verificá-lo no APK final.
- O `versionCode` local ainda é 1; no fluxo EAS existe controle remoto e autoIncrement. Conferir o valor final efetivo antes de atualizar, em vez de inferi-lo do fonte.
- A localização prévia da credencial original no EAS não é uma nova verificação de assinatura nesta auditoria. Não exportei a chave nem li suas senhas.
- O backup do APK oficial antigo não contém, sozinho, um backup completo do código e dos dados. É necessário congelar também a árvore de código/configurações correspondentes e preservar a oficial instalada.
- A configuração cliente do Firebase local aponta para `escolta-unitau`. Habilitação remota de provedores e cadastro do certificado do futuro APK oficial não foram novamente conferidos no console. Login Google aprovado no Teste não prova o cadastro do certificado oficial.

### A6 — dependências precisam de triagem, não de atualização forçada

Consulta npm concluída sem erro: **44 pacotes sinalizados, 27 com severidade alta, 17 moderada e zero crítica**. O retorno 1 do `npm audit` indica achados, não falha de consulta.

A lista inclui dependências transitivas de ferramentas de desenvolvimento/build e funcionalidades não importadas pelo fluxo atual, como Firestore via pacote Firebase. Isso não significa 44 vulnerabilidades exploráveis no APK. Exemplos de avisos diretos na árvore: `braces`, `image-size`, `node-forge`, `postcss`, `@grpc/grpc-js`, `sprintf-js`, `uuid`; a propagação aumenta a contagem por pacote.

O resultado precisa ser classificado entre ambiente de compilação, dados de entrada e código efetivamente distribuído. Algumas sugestões automáticas propõem trocar a versão principal do Expo ou do Firebase, inclusive versões incompatíveis com a configuração atual. **Não executar `npm audit fix --force` nem atualizar todo o SDK às vésperas da apresentação.** Atualizações dirigidas só depois de conferir compatibilidade e repetir bundle, testes e validação física.

O `expo install --check` usando o mapa local do SDK não apontou incompatibilidade de versões. A própria ferramenta avisou que estava sem rede e que a validação offline é limitada; isso não fecha a triagem de segurança.

### A7 — textos e limites que não devem ser apresentados como garantia

- `ManualScreen.tsx:24` descreve emergência apenas como reconexão falha. O código também aceita botão físico e sinal muito fraco sustentado ainda conectado. Alinhar essa orientação aos três caminhos.
- Nomes e versão do app em relatórios/ensaio ainda usam `1.0.0` fixo. Para rastrear um APK final, preferir versão/build real mais firmware recebido. Não altera proteção, mas evita confundir resultados.
- A placa atual não implementa autenticação/associação exclusiva de um responsável no GATT; o aplicativo seleciona pelo nome `ESCOLTA_BLE`. Não tratar identificação pelo nome/UUID como segurança contra outras placas ou aplicativos. Escopo atual continua um protótipo de um dispositivo e um telefone, não um produto certificado.
- Preferências e intenção de espera possuem alguns caminhos que ignoram erro de persistência. A pausa confirmada pela placa funciona na sessão, mas uma falha de armazenamento deve ser comunicada ao usuário antes de prometer que essa escolha será restaurada após reinício.

## Como o sistema funciona hoje

### Aplicativo, conta e serviços externos

O Expo carrega `App.tsx`. Firebase Auth restaura a sessão ou apresenta login por senha/Google. O contexto aguarda hidratação e UID correto antes de montar a área autenticada. Perfil, preferências, ocorrências, intenção de monitoramento e ensaios ficam localmente separados por UID, ressalvada A3. Não existe um servidor próprio de aplicação no caminho principal: Firebase valida a autenticação; EmailJS é um canal externo experimental, opcional e dependente de internet. O Metro é o servidor de desenvolvimento, não o backend dos alarmes BLE.

Os tokens Google passam pelo Credential Manager nativo e são validados pelo Firebase; não vi gravação de senha no perfil nem impressão de token no código inspecionado. Configurações públicas Firebase não são uma chave de administrador. Isso não substitui revisão das regras/políticas remotas.

### Conexão, alertas e confirmação

O aplicativo procura `ESCOLTA_BLE`, descobre os serviços, observa o status e lê RSSI no celular a cada aproximadamente 500 ms. O valor é enviado à XIAO; a placa filtra e decide os estados. As notificações de status chegam por volta de 1 s. O ensaio é observador: não substitui callbacks de proteção, não recalibra e não silencia alarmes.

O controlador validado pertence à conta e não à tela; desmontar/trocar a tela não descarta a sessão BLE. O serviço Android mantém notificação em primeiro plano, eventos periódicos e sirene nativa. O GATT e a decisão principal do monitor do telefone ainda dependem de JS; o serviço não é um segundo cliente BLE inteiramente independente. Remover dos recentes, forçar parada, matar processo e desligar/reiniciar são condições diferentes; não generalizar o teste de uma delas às demais.

Perda do vínculo inicia reconexão e carência de cerca de 5 s. Pânico recebido da placa ativa alerta retido, sem depender de perder conexão. Aproximar/reconectar não apaga uma emergência: é necessário confirmar, ter sinal recente seguro e receber ACK real da XIAO. Espera/logoff são interrupções explícitas, com tentativa de desarmar a placa antes de encerrar.

### Perfil K2 preservado

| Parâmetro | Código atual |
| --- | --- |
| Firmware recebido/esperado | `xiao-p5-r4-d1-k2` |
| Potência solicitada na conexão | +4 dBm, com leitura/verificação e tentativa de restauração se falhar |
| Filtro | Kalman escalar, Q=1 por segundo, R=4, intervalo real entre amostras |
| Entrada amarela | RSSI filtrado ≤ −77 dBm, confirmação de 4 s e amostras contínuas |
| Retorno amarelo → seguro | > −72 dBm, confirmação de 2 s |
| Entrada vermelha por sinal | ≤ −90 dBm, confirmação de 4 s; emergência fica retida |
| Retorno interno de perigo | > −86 dBm; não cancela automaticamente o pânico retido |
| Início/candidato | janela inicial de 5 leituras, pelo menos 3 amostras de candidato |
| Lacuna de leitura | > 2,5 s reinicia as leituras/candidato; ver A2 para ausência contínua |
| Confirmação segura K2 | RSSI bruto e filtrado > −77, dados recentes, monitor ativo e ACK seguro sem pânico |
| Distância D1 | referência −63,386376 dBm e expoente 3,377961; aproximação, não trena |
| Bateria | topo visual de 100% em 4,10 V; não significa fim de carga nem autonomia certificada |

O modelo D1 fornece aproximadamente 2,53 m em −77 e 6,14 m em −90. Portanto as cores não são um comparador literal de 3/5 m mostrados no visor: são decisões RSSI calibradas e confirmadas no ambiente ensaiado, com histerese e retenção. Não mexi na calibração aprovada para tentar fazê-la parecer exata no papel. Os testes físicos em 4/5 m aprovados pelo usuário permanecem evidência localizada, não garantia para praia, shopping ou todo ambiente.

Abrir e compilar o `.ino` sem as opções experimentais não produz automaticamente K2: o padrão preserva o perfil antigo. Congelar as opções de compilação e conferir a identificação/hash junto do APK candidato.

## Mapa arquivo por arquivo — aplicação

Leitura funcional dos 31 alcançáveis; “revisado” não é certificação de ausência de bugs. Os achados acima prevalecem sobre a função descrita na tabela.

| Arquivo | Função conferida |
| --- | --- |
| `App.tsx` | Entrada, fontes, autenticação, hidratação, navegação real, deep links e seleção do controlador por perfil nativo. |
| `src/context/AppPreferencesContext.tsx` | Defaults, tema, hidratação por geração/UID, migração conservadora, persistência de escolhas. |
| `src/hooks/useEsp32Monitor.ts` | Controlador principal: vínculo, dados, espera/retomada, alertas, bateria, fallback de áudio, e-mail, ACK e descarte. |
| `src/hooks/usePersistentEsp32Monitor.ts` | Assinatura da sessão persistente sem atribuir recursos à duração da tela. |
| `src/screens/AlertsScreen.tsx` | Ocorrências, confirmação de limpeza e prévia antes de compartilhar relatório textual. |
| `src/screens/AuthScreen.tsx` | Cadastro/login, recuperação, Google, validação de formulário e bloqueio de operação simultânea. |
| `src/screens/DashboardScreen.tsx` | Estados visuais, prontidão, idade do dado/distância, bateria e confirmação explícita da segurança. |
| `src/screens/ManualScreen.tsx` | Orientação de uso e limitações de distância; ressalva A7 sobre causas de emergência. |
| `src/screens/PatrolScreen.tsx` | Inventariado como legado não roteado; não é a coleta usada hoje, nem foi certificado como funcional. |
| `src/screens/ProximityTrialModal.tsx` | Coleta observacional, estabilização, limite de amostras, parada, rolagem, histórico e exportação; A3/A4. |
| `src/screens/SettingsScreen.tsx` | Perfil, escolhas, contato/consentimento de e-mail, espera/retomada, diagnóstico e logoff. |
| `src/screens/SystemDiagnosticsModal.tsx` | Consulta de permissões/estado, testes controlados e relatório; não mede autonomamente prontidão física de tudo. |
| `src/services/accountStorage.ts` | Namespace por UID, fila serial, notificações e migração sem apagar originais; proteção central não resolve agendamento externo A3. |
| `src/services/backgroundSentinel.ts` | Ponte nativa, timeout, geração dos comandos de alarme, eventos periódicos e distinção alerta retido/áudio tocando. |
| `src/services/bleApi.ts` | Singleton GATT, geração de conexão, timeout/limpeza, polling, assinaturas adicionais e confirmação após escrita. |
| `src/services/blePermissions.ts` | Consulta e solicitação sem repetir diálogos em toda reconexão; não confunde notificação com permissão BLE. |
| `src/services/emergencyEmail.ts` | Consentimento + e-mail válido, envio experimental com abort/timeout e sem promessa de entrega. |
| `src/services/firebaseConfig.ts` | Inicialização/persistência Auth e rejeição de reutilização silenciosa de projeto incorreto. |
| `src/services/firebaseEnvironment.ts` | Projeto correto, nomes separados Teste/oficial e validação básica do cliente Google. |
| `src/services/googleAuth.ts` | Ponte Google opcional, cancelamento, validação por Firebase e limpeza do seletor. |
| `src/services/nativeIdentity.ts` | Identidade, esquema e opção do monitor; divergência da implementação nativa A1. |
| `src/services/notificationService.ts` | Canais, permissão, bateria, diagnóstico, emergência e abertura da Central. |
| `src/services/persistentMonitor.ts` | Registro de sessão por conta, preferências e barreira de descarte do GATT anterior. |
| `src/services/proximityExport.ts` | Arquivo/URI em vez de CSV gigante na Intent, exclusão mútua, pasta autorizada e retorno conservador. |
| `src/theme.ts` | Paletas e transparência; sem decisão de proteção. |
| `src/utils/asyncTimeout.ts` | Limite de espera sem supor cancelamento automático da operação subjacente. |
| `src/utils/authValidation.ts` | E-mail/cadastro e mensagens de erro; não invalida senha antiga no login. |
| `src/utils/monitorScope.ts` | Estado/ref/efeitos observáveis fora da duração da tela; descarte explícito. |
| `src/utils/proximityExport.ts` | Histórico/último e amostras/resumo; BOM, UTC, ordenação em cópia e escape de fórmulas. |
| `src/utils/proximityTrial.ts` | Validade/idade, deduplicação, 30 amostras, estatística, validação do histórico e CSV detalhado. |
| `src/utils/safetyConfirmation.ts` | Lista exata de firmwares, leitura forte/recente e ACK sem forçar seguro. |
| `src/utils/telemetry.ts` | Validação mínima do contrato; validações adicionais de bateria/distância e ACK ocorrem nos consumidores. |

## Mapa complementar — nativo, firmware e distribuição

| Arquivo/grupo | Função e resultado da leitura |
| --- | --- |
| `EscoltaAuthModule.kt` | Credential Manager, token em memória, guarda de operação e leitura da opção validada. |
| `EscoltaSentinelaModule.kt` | API do serviço e eventos; restrição de pacote identificada em A1. |
| `EscoltaSentinelaService.kt` | Serviço, permissões, promoção segura, alarme persistido, sirene/vibração e WakeLock de duração limitada; A1. |
| Manifests/Gradle/config dos dois módulos | Autolinking, dependências nativas, serviço não exportado, permissões e recursos declarados. |
| `MainActivity.kt` / `MainApplication.kt` | Entrada Android, delegação Expo e configuração da arquitetura; arquivos gerados/ignorados pelo Git. |
| `firmware/xiao_escolta_ble/xiao_escolta_ble.ino` | Pinos, ADC/carga, GATT, eventos, botão com debounce/1,5 s, estado, buzzer, LED e serialização; A2. |
| `ProximitySignal.h` | Políticas antigas e K1/K2 isoladas por opções, Kalman/mediana-EMA, histerese, tempo e confirmação segura. |
| `ProximityDistance.h` | Escala antiga/D1, validade e extrapolação sem teto artificial. |
| `RadioPowerPolicy.h` | Critérios para aplicar/verificar/restaurar potência. |
| `RadioPowerExperiment.h` | Aplicação +4 por conexão e checkpoints, sem trocar PHY ou aumentar adaptativamente. |
| `RadioDiagnosticAddress.h` | Validação/decodificação de endereço e ordem de bytes. |
| `RadioDiagnostics.h` | Resolução de handle e leitura de diagnóstico sob seção crítica curta; sem impressão durante IRQ bloqueada. |
| `assets/alert_tone.wav` e recurso nativo | Mesmo tamanho e SHA-256: cópia nativa corresponde ao áudio do fallback. |
| `package.json` / lock / config TS/Babel | Entrada, scripts, bibliotecas declaradas e dependências resolvidas; consulta npm registrada em A6. |
| `app.json` / `eas.json` | Identidade, plugins, permissões bloqueadas e perfis; A5. |
| `tools/plugins/with-test-build.cjs` | Reprodução de flags/manifesto no prebuild; pacote e comportamento validado são conceitos distintos. |
| `tools/android/standalone-test/AndroidManifest.xml` | Remove sobreposição e tráfego claro no candidato. |
| `tools/build-android.ps1` | Diferencia validar/gerar, exige Teste para standalone e não instala automaticamente; A5. |
| `tools/auditoria/verificar_candidato_android.cjs` | Verifica configuração/intermediários, não assinatura ou funcionamento do APK final. |

## Verificações executadas nesta auditoria

| Verificação | Resultado/alcance |
| --- | --- |
| `npm test` | 172 testes aprovados; zero falhas, skips ou TODO. Há mocks, testes de funções e contratos de fonte; não são 172 ensaios físicos. |
| `npm run typecheck` | Sem erros de tipagem. |
| `tools/test-proximity-signal.ps1` | Todos os alvos C++ do script compilam seus `static_assert`, incluindo D1, P3, P4, confirmação, K1 e K2. Não somar a impressão de linhas como total independente: há condicionais e inclusões compartilhadas. |
| Grafo de código local | 31 de 32 fontes alcançáveis, nenhuma importação local não resolvida. |
| Reprodução A1 | Matriz estática JS/Kotlin mostra oficial validada sem pulso nativo. |
| Reprodução A2 | Fluxo transplantado de `processarSinal` demonstra diferença de conexão perdida versus RSSI interrompido; não emula o rádio. |
| Reprodução A3 | Callback do modal e armazenamento reais, com fila/contas simuladas, gravam A em namespace B. |
| `expo install --check` | Compatibilidade pelo mapa local do SDK sem incompatibilidade apontada; ferramenta avisou validação offline limitada. |
| Consulta npm | 44 pacotes sinalizados; não foram instaladas correções. |
| `git diff --check` | Retorno 0; avisos de conversão LF/CRLF, sem correção automática. |
| Verificador de intermediários Android | Retorno positivo sobre intermediários antigos de 15/10 antes da nova tentativa de compilação. Não aprova APK nem comprova que esses intermediários continham todo o código de 17/10. |
| Nova compilação Android de validação | Ver atualização ao fim deste relatório. Nenhum APK foi solicitado. |

## Próximos passos recomendados

1. Corrigir A1–A4 no desenvolvimento de teste e adicionar regressões específicas, sem aproveitar para trocar os limiares K2 aprovados.
2. Repetir somente casos afetados: pulso nativo/opção oficial, interrupção de RSSI ainda conectado, espera/retomada, histórico ilegível e escrita atrasada com troca de conta. Depois fazer a regressão curta de emergência/segundo plano.
3. Fechar exportação no aparelho: cancelar/repetir, resumo, salvar em pasta e manter BLE durante o seletor. A leitura de CSV já recebida não comprova todos esses caminhos.
4. Classificar dependências e preservar o backup completo antes de qualquer atualização/promover perfil. Resolver a configuração efetiva de assinatura/Firebase/opção validada.
5. Gerar candidato separado, conferir certificado, pacote, versão, bundle/recursos e teste instalado sem Metro. Só então decidir a promoção oficial.
6. Após reparo na segunda-feira: testar botão físico na montagem final, inclusive com tela bloqueada. Autonomia completa e descarga/bateria baixa ainda não foram validadas nesta auditoria.

Não é necessário repetir toda a coleta de 1 a 10 m para corrigir as lacunas de ciclo de vida, armazenamento e promoção. Nenhum resultado automatizado elimina as limitações físicas do RSSI ou substitui a confirmação no APK final.

## Encerramento da verificação Android

Executado `tools/build-android.ps1 -Target ValidateStandalone -TestApp` sem geração de APK. A primeira tentativa offline parou por ausência do plugin Gradle `foojay-resolver-convention:0.5.0` no cache, não por erro de Kotlin/TypeScript. Repetida com `-Online`, usando as dependências declaradas, concluiu com **BUILD SUCCESSFUL**, 102 tarefas (3 executadas, 99 atualizadas/em cache).

O bundle de produção foi regenerado com o código atual; manifesto do candidato `.teste` e tarefas de validação Kotlin dos dois módulos foram aprovados pelo Gradle. O verificador estrutural retornou `ok=true`, sem issues: projeto Firebase correto, cliente Google incorporado e recursos para o bundle. A existência do arquivo de áudio nativo correspondente foi conferida separadamente pelo inventário.

- Bundle: 2.051.432 bytes.
- SHA-256: `4b4651b0b10db4b5fe42d4466ce604db528554aca12bcc1ac78fe9c64cb52b52`.
- Permaneceram avisos não bloqueantes de APIs Gradle/Kotlin descontinuadas e regras de merge de manifesto sem declaração a substituir/remover. Não foram tratados como erros nem usados para justificar atualização de SDK.
- Nenhum `assembleRelease`, instalação, alteração de assinatura, acesso ao Firebase remoto ou gravação na XIAO foi feito.

Isso encerra a **verificação de compilação dos intermediários**, não os achados A1–A4, nem a aprovação da assinatura e execução de um APK final. Os 172 testes e a tipagem foram repetidos ao final e continuaram aprovados. A comparação dos hashes inventariados não apontou alteração dos fontes/recursos de execução durante a auditoria.
