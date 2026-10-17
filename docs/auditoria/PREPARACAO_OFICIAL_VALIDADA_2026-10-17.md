# Preparação da atualização oficial validada — 17/10/2026

Usuário autorizou prosseguir após aprovação relatada dos roteiros do candidato sem Metro. A oficial instalada e o candidato não foram alterados/instalados nesta etapa; nenhum firmware foi gravado e nenhum serviço Metro foi iniciado.

## Empacotamento local

- Perfil EAS `oficial-validada` já existente: APK interno, incremento remoto herdado de `production`, opt-in `ORG_GRADLE_PROJECT_escoltaValidatedMonitor=true`, ferramentas internas desabilitadas.
- Identificada lacuna: a sobreposição de manifesto que remove `SYSTEM_ALERT_WINDOW` e bloqueia HTTP global estava condicionada apenas ao candidato Teste standalone. Plugin e Gradle gerado sincronizados para aplicar exatamente a mesma sobreposição também à oficial com opt-in explícito. Oficial padrão e desenvolvimento não são promovidos implicitamente.
- Mantidos bloqueio de assinatura debug na oficial validada, identidade/pacote separados, exigência de opt-in duplo no candidato e recusa de sobrescrever manifesto release preexistente incompatível.
- Nenhum fonte de execução JavaScript/Kotlin/firmware foi modificado nesta etapa. O manifesto compartilhado teve somente seu comentário ajustado.
- Adicionado teste de contrato do empacotamento oficial; **208 testes Node passaram**, sem falhas/skips/TODO. TypeScript passou; plugin e Gradle gerado conferidos como sincronizados. Isso ainda não valida um APK oficial compilado ou sua execução.

## Firebase remoto — cadastro oficial ausente

Consulta pela interface do console, na conta Escolta Unitau e projeto `escolta-unitau` (número `247729429884`), mostrou apenas o app Android `com.nicolasvmen.escoltaunitau.teste` e o app Web existente. Não havia app Android do pacote oficial `com.nicolasvmen.escoltaunitau`.

Formulário de novo app Android preparado com pacote `com.nicolasvmen.escoltaunitau` e apelido `Escolta UNITAU`, **sem clicar em Registrar app**. Aguardando confirmação específica do usuário para registrar o pacote oficial e associar os certificados públicos da assinatura original, permitindo login Google nessa identidade. Não trocar nem remover cadastro/certificado Teste.

Referência pública da assinatura original previamente comparada ao APK antigo e à credencial EAS existente:

- SHA-1: `02838290c62302cbe91e63ec7325fbcd20305987`.
- SHA-256: `34f8ddb808fac6d1eba6f3086ab8d86615270467831be74eaedade9a6a70c705`.

Nenhuma chave privada/senha exportada ou impressa. Nenhum cadastro, provedor, permissão de usuário ou certificado remoto alterado nesta etapa. Evidência visual do formulário: `FIREBASE_OFICIAL_CADASTRO_PENDENTE_2026-10-17.png`.

## Depois da confirmação

1. Registrar a identidade oficial e certificados originais no Firebase correto; conferir resultado visível e configuração Google correspondente.
2. Conferir EAS/credencial original, ambiente de produção incluindo cliente Web público, conteúdo efetivamente enviado e versionCode acima do instalado. Não usar assinatura Teste/debug para substituir a oficial.
3. Preservar checkpoint novo das fontes efetivas, compilar com perfil oficial-validada e conferir APK final por pacote/certificado/versão/bundle/recursos/permissões/metadata.
4. Somente com Sentinela em espera/silenciosa e APK aprovado, instalar como atualização sem desinstalar/limpar dados. Não abrir ou retomar proteção automaticamente.
5. Validar a própria oficial instalada sem servidor; não inferir aprovação do cadastro OAuth oficial a partir do login do Teste.

Botão físico após reparo e autonomia integral/bateria baixa real continuam pendentes, separados da entrega de software.

## Continuação autorizada: registro remoto concluído

Usuário respondeu “sim” ao cadastro oficial e associação da assinatura original. Registrado via console, na conta Escolta Unitau, o app Android `com.nicolasvmen.escoltaunitau`, apelido Escolta UNITAU, ID `1:247729429884:android:ccc2de31da9b15d33358f9`. Tabela do app oficial passou a exibir exatamente o SHA-1 e o SHA-256 originais citados acima; app Teste e app Web continuam presentes. Evidência: `FIREBASE_OFICIAL_REGISTRADA_2026-10-17.png`. Não foram alterados usuários/provedores, baixadas chaves privadas nem instalado SDK Firebase nativo adicional. Tentativa de download do JSON público não retornou arquivo verificável; não se reutilizou o JSON antigo Teste como se fosse oficial. Execução real do login na oficial ainda depende do APK.

EAS CLI 21.0.0 (npm oficial) confirmou conta `nicolas_venciguerra_men` e projeto `@nicolas_venciguerra_men/escolta-unitau`, ID `be41ccc5-f32b-428e-9974-91dffc0fed45`. Nova consulta somente leitura em `eas credentials --platform android`, perfil oficial-validada, mostrou configuração padrão **Build Credentials A632cnQN2k**, JKS, SHA-1/SHA-256 idênticos aos originais. Menu cancelado sem criar, trocar ou baixar chave/credentials.json. Nenhuma credencial FCM é exigida para os alertas locais BLE usados pelo app.

## Arquivo de envio e prévia de regeneração Android

- Versão de exibição preparada: **1.0.1**, base local Android code 2 (acima da oficial code 1); incremento remoto EAS permanece ativo, valor final deverá ser conferido no APK.
- Perfil oficial-validada explicita ambiente production, assinatura remota e cliente WEB Google público já validado do projeto, sem depender do `.env.local` ignorado. Ferramentas internas continuam false.
- Criado `.easignore` com lista de fontes/recursos necessários. Documentos, fotos do protótipo, TCC/CICTED, coletas, logs, Android gerado, dependências, backups e credenciais não serão enviados.
- Duas inspeções locais iniciais detectaram ausência das pastas de código. O copiador EAS no Windows consulta os diretórios sem barra final antes de percorrê-los; ajustadas exceções dos diretórios e adicionadas verificações desse caso. **Nenhuma das inspeções incompletas foi enviada**.
- Inspeção EAS local final em `.expo/eas-oficial-arquivo-2026-10-17-v3` aprovada pelo verificador dedicado: **61 arquivos, 2.504.830 bytes**, nenhum arquivo não autorizado ou ausente, todos idênticos às fontes atuais; SHA-256 do inventário conteúdo/caminhos `3520639f28b92feede8f365ffaebed5dcd0e5173f17587d4e693014d8d53de5c`.
- Prévia Android isolada a partir desse arquivo, `.expo/eas-prebuild-oficial-2026-10-17`, gerada com Expo prebuild `--no-install`: sucesso, package.json sem alterações. Plugin, sobreposição release, módulo Google e módulo Sentinela incluídos. Aviso expo-system-ui ausente para configuração global de aparência não é resolvido por instalar dependência nova nesta entrega; temas internos continuam sob o contexto do app.
- **211 testes Node aprovados**, sem falhas/skips/TODO, TypeScript aprovado. Nenhum fonte de lógica de monitoramento/alarme ou firmware alterado.

Até este ponto não houve upload/build EAS, geração de APK oficial nem instalação sobre a oficial antiga. Próxima etapa: checkpoint novo e solicitação de build remota usando a credencial conferida; verificar o APK final antes de instalar.

## Build oficial solicitada após checkpoint

Checkpoint novo `backups/releases/2026-10-17_oficial-1_0_1`, sem sobrescrever backups anteriores:

- APK oficial antigo: 147.568.857 bytes, SHA-256 `EC9810B0CB8B1F6B8F177AFB80215F968BDC3A00A351CB33DC6369DAA75D3D35`.
- Fontes preparadas: 2.877.430 bytes, SHA-256 `1CF51697977C3F3529CA574C9F823DD4BF50B7687E717A45E6D192DF5290DFDB`.
- Referência HEAD: SHA-256 `7CFCA7D7E54D7B1F618DA6F4349F96601C6141C7DF30D2D180AD665AC9F4C534`, commit `9585ef5c0e7fdbc928414463b6e3d44b64798790`.

Solicitado `eas build --platform android --profile oficial-validada --non-interactive --no-wait`. CLI carregou os três parâmetros públicos do perfil (monitor validado, ferramentas internas false, cliente Google Web), incrementou versionCode remoto **1 → 2** e confirmou **Using Keystore from configuration: Build Credentials A632cnQN2k (default)**. Upload de 1,7 MB concluído e fingerprint calculado. Inspeção local do arquivo de envio repetida após upload: mesmos 61 arquivos e hash de inventário já descrito. Não foram incluídos documentos, fotos pessoais, CSV, backups, `.env.local` ou chaves privadas.

Build ID: `622eb96d-11d7-4f0e-81bf-f26d546ffb7c`; projeto EAS conferido; criada em `2026-10-17T21:34:11.014Z`; versão **1.0.1**, código **2**, perfil **oficial-validada**, distribuição interna Android. Primeira consulta retornou IN_PROGRESS. Nenhum APK oficial ainda aprovado/instalado nesse ponto.

Resultado visual do Firebase com pacote e dois certificados: `FIREBASE_OFICIAL_CERTIFICADOS_2026-10-17.png`. Registro remoto concluído não é comprovação do login no APK oficial ainda em compilação.

### Conferências durante a compilação

- `arquivo_enviado_EAS.zip` preservado no checkpoint: 1.831.651 bytes, SHA-256 `28C50123A3B9A7427BA22B6F286F255FFE48FEC6842E35AC9227D86C2C886746`. Não sobrescreve os snapshots anteriores.
- ADB somente leitura confirmou oficial ainda 1.0.0/code 1, última atualização 31/07/2026 23:33:32; Teste permanece 1.0.0-teste-sem-servidor/code 1, atualização 17/10/2026 17:56:41.
- Verificador do APK final reforçado para conferir permissões necessárias/proibidas, bloqueio de HTTP global e backup, deep links da identidade correta e serviço Sentinela único/não exportado/não encerrado com Recentes/tipos de foreground corretos. Também exige bundle de tamanho válido. APK candidato conhecido aprovado com hash inalterado; teste negativo rejeitou a oficial antiga pelas diferenças esperadas, sem instalá-la. Essas mudanças são ferramentas de inspeção, não fontes enviadas à build.
- Usuário confirmou por resposta à pergunta de espera: “sim, em espera ... ela fica silenciosa porque o app ta em espera”. Esclarecido que não se pede mute separado: silêncio deve decorrer da espera. Nenhum comando de retomada enviado.
- EAS avançou por instalação de dependências, Expo prebuild, preparação das credenciais, geração do bundle e RUN_GRADLEW. Estado consultado ainda IN_PROGRESS, sem erro comunicado. Não equivale a APK concluído.

## APK oficial concluído, conferido e instalado

Build EAS `622eb96d-11d7-4f0e-81bf-f26d546ffb7c` terminou **FINISHED**, sem erro informado, em `2026-10-17T21:41:00.436Z`. APK baixado para `dist/android/oficial-1.0.1/Escolta_UNITAU_1.0.1.apk` e preservado no checkpoint `2026-10-17_oficial-1_0_1` com hash reconferido.

- **95.646.228 bytes**, SHA-256 `13D5DC02313AFDA5356AAB14A5FCDC0EEAA1B3868ADF2A1ECA4F5968A750FC9C`.
- Pacote `com.nicolasvmen.escoltaunitau`, nome **Escolta UNITAU**, versão **1.0.1**, código **2**, não depurável, minSdk 24/targetSdk 36. Bibliotecas das quatro ABIs empacotadas; isso não comprova testes em quatro arquiteturas (aparelho desta rodada: Samsung ARM64).
- Certificado público original SHA-256 `34f8ddb808fac6d1eba6f3086ab8d86615270467831be74eaedade9a6a70c705`; assinatura validada por apksigner, igual à referência oficial e ao cadastro Firebase.
- Verificador final **ok=true, zero issues**: monitor validado ativo; HTTP global e backup Android bloqueados; permissões de sobreposição/áudio-gravação/armazenamento amplo ausentes; permissões de BLE/notificações/foreground presentes; serviço Sentinela único/não exportado/não encerrado com Recentes e tipos connectedDevice/mediaPlayback; deep links da identidade oficial, sem esquema Teste.
- Áudio nativo e fallback e fonte Ionicons presentes e idênticos por hash aos fontes. Ícone Google presente, mesmo hash do recurso verificado no candidato.
- Bundle incorporado: **2.063.796 bytes**, SHA-256 `91A33BEBAE0E1020676C84BEE7E2DB1674B6D4518D4D872EBCA4541A3E1C0ABE`: **idêntico ao bundle do candidato standalone aprovado pelo usuário**. Cliente público Google correto e projeto Firebase presentes. Essa igualdade não é prova de igualdade binária de todo o APK/nativo nem substitui checagem da identidade oficial instalada.

Após a confirmação de espera do usuário, serial Samsung `RXCXA07DTXF` conferido autorizado/conectado e oficial instalada reconferida como 1.0.0/code 1. Executado somente `adb -s RXCXA07DTXF install -r` com o APK acima e hash conferido, sem desinstalar/limpar dados: **Success**. Nenhuma abertura, retomada de proteção ou gravação de firmware enviada por ferramenta.

Consulta posterior ao Package Manager confirmou oficial **1.0.1/code 2**, flags sem DEBUGGABLE, atualização **17/10/2026 18:43:14**. Teste permaneceu **1.0.0-teste-sem-servidor/code 1**, atualização **17/10/2026 17:56:41**. Backup da oficial antiga permanece preservado. Não se comprovou visualmente sessão/perfil/preferências na oficial; dados do pacote Teste são separados e não foram copiados para o pacote oficial.

Próxima checagem humana: abrir pelo ícone **Escolta UNITAU** (não Escolta Teste), autenticar com a mesma conta Google e conferir perfil/espera, sem servidor; em seguida validar conexão e ciclo de emergência da própria identidade oficial. Não adotar como totalmente aprovada antes dessa checagem. Botão físico após reparo, autonomia integral e bateria baixa real permanecem pendentes.

### Primeira abertura e login da oficial — relato recebido

Usuário: “abriu, autenticou e voltou a proteção sozinho”. Abertura e autenticação Google da identidade oficial aprovadas por relato, com servidor previamente desligado. Não inferir confirmação de todos os campos/preferências desse relato.

Conferido o comportamento no código, sem alterações: `useEsp32Monitor.ts` carrega `@escolta_monitoring_intent`; somente o valor literal `standby` representa pausa salva, valor ausente ou outro assume intenção ativa. A preferência padrão `autoConnect` é true. Com intenção ativa, ao receber telemetria da placa em espera, o controlador chama `retomarProtecao(true)`. Armazenamento é local por aplicativo/UID: a pausa do pacote Teste não é compartilhada com o pacote oficial. Isso explica o caminho de retomada relatado; não foi inspecionado o valor privado persistido da conta, portanto não se afirma se havia intenção ativa antiga ou ausência de chave na oficial. A orientação anterior de aguardar abertura em espera não considerou essa independência entre instalações.

Nenhum comando de retomada por ferramenta, edição de código, recarga ou gravação de firmware após esse relato. Usuário será orientado a manter o Teste em espera e validar continuidade em segundo plano/Recentes e um ciclo de perda/reconexão/confirmação na própria oficial. Aprovação de login não substitui esses roteiros.

## Aceitação da oficial 1.0.1 nesta rodada

Solicitados na identidade oficial, com Teste em espera e sem Metro:

1. Próximo da placa e Protegido, remover a oficial dos aplicativos Recentes, bloquear a tela por 2 minutos e reabrir: continuar Protegido, sem alarmes.
2. Protegido, bloquear a tela e desligar a caixinha, aguardar alerta; abrir o app e tentar confirmar segurança com a placa desligada (deve recusar); religar a placa próxima, observar reconexão mantendo a emergência e encerrar somente por confirmação aceita.

Usuário respondeu para os dois: **“deu certinho”**. Ambos aprovados por relato no Samsung SM-S928B, na oficial 1.0.1/code 2 instalada, sem servidor. Somados à abertura/login Google já relatados, encerram a checagem de identidade/distribuição oficial desta rodada. Não são captura instrumental contínua, aprovação de outros aparelhos/arquiteturas nem repetição de todas as medições/calibrações.

**Escolta UNITAU 1.0.1 adotada como versão oficial desta rodada do protótipo**, APK de SHA-256 `13D5DC02313AFDA5356AAB14A5FCDC0EEAA1B3868ADF2A1ECA4F5968A750FC9C`, sem novas alterações de execução ou firmware após a compilação. Teste permanece separado/em espera; não usar os dois apps simultaneamente para proteger a mesma placa. APK antigo, fontes e arquivo enviado ao EAS preservados nos checkpoints documentados.

Pendências mantidas explicitamente: reparar fios e validar botão físico na segunda-feira, **19/10/2026**; medir autonomia integral e comportamento de bateria baixa/descarga real. Essas pendências não foram aprovadas implicitamente pelo teste de perda de conexão. Perfil/preferências completos, entrega de e-mail nesta identidade e execução prolongada em Doze não foram demonstrados por esses dois roteiros finais. Distância RSSI continua estimativa e o protótipo não substitui supervisão.

## Instalação única solicitada e comparação do botão

Usuário solicitou manter somente a oficial no celular e testar o botão reparado diretamente nela, verificando diferenças antes de remover o Teste.

- Reconferidos diretamente os dois APKs preservados: ambos com bundle SHA-256 `91A33BEBAE0E1020676C84BEE7E2DB1674B6D4518D4D872EBCA4541A3E1C0ABE` e metadata `escolta.validated_monitor=true`.
- Código do botão pertence ao mesmo firmware da XIAO, não a uma variante do app: D1/INPUT_PULLUP, debounce 50 ms, acionamento sustentado por 1.500 ms somente com `escoltaAtivada`; em espera é ignorado e exige soltar/pressionar novamente após retomar. Aciona `modoPanico=true`/PERIGO. Nenhuma gravação de firmware nesta etapa.
- Ambos os apps usam o controlador persistente/monitoramento validado; telemetria `panico_ativo` entra no mesmo caminho de emergência e confirmação. Nenhuma ramificação específica da identidade Teste nesse tratamento. Políticas nativas também habilitadas nas duas identidades. Isso demonstra equivalência de software/política para o botão, **não substitui o teste físico após reparar os fios**.
- 12 testes direcionados de identidade/contratos aprovados, sem falhas/skips/TODO; nenhuma alteração de código de execução.
- Antes da remoção: usuário Android 0, oficial 1.0.1/code 2 confirmada e nenhum serviço Sentinela do pacote Teste em execução; hash do APK Teste de backup reconferido.
- Executado somente `adb -s RXCXA07DTXF shell pm uninstall -k --user 0 com.nicolasvmen.escoltaunitau.teste`: **Success**. A opção `-k` solicita preservação de dados/cache do Teste no Android para eventual reinstalação com a mesma assinatura; não se exportaram esses dados nem se afirma que o ZIP de backup os contenha. Não foi feita limpeza permanente ou desinstalação da oficial.
- Verificação posterior `pm list packages --user 0 escoltaunitau`: somente **com.nicolasvmen.escoltaunitau** instalado para o usuário principal, Teste ausente. Código/APK da oficial não alterados, sem recarga/abertura/retomada por ferramenta. Cadastros Firebase e arquivos de desenvolvimento não apagados.

A partir daqui o uso e o próximo teste físico do botão serão somente no **Escolta UNITAU 1.0.1**. Fontes/ferramentas e APKs de teste continuam preservados no computador; não há necessidade de manter duas instalações no telefone.
