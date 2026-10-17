# Correções do aplicativo — 09/10/2026

## Resultado e limite da entrega

Foi implementada uma etapa de correção do fluxo ativo do aplicativo. Não é uma
certificação de segurança infantil nem uma declaração de que todas as pendências
foram encerradas. O relatório de 07/10 permanece como evidência histórica.

Não houve flash da XIAO, instalação de APK, envio de e-mail, alteração de contas
remotas, alteração mecânica, exclusão de dados, commit ou push nesta etapa.
As alterações de firmware/CAD já existentes no diretório foram preservadas.
As duas cópias de áudio e os documentos acadêmicos também foram preservados.

## Implementações

- Notificações e sirene crítica são independentes. A ponte exige confirmação de
  reprodução, não apenas aceitação do comando Android; há fallback local.
- Cancelamento e confirmação humana invalidam respostas atrasadas. Falha de reset
  conectado mantém o alerta, em vez de registrar que a placa normalizou.
- Dados recebidos precisam ter tipos, RSSI e estado válidos. JSON incompleto não
  vira pânico. RSSI recente é calculado localmente, não aceito do JSON remoto.
- Conexão sozinha não libera prontidão. Após 3 s sem telemetria/RSSI recentes,
  distância e prontidão são retiradas; após 6 s, inicia recuperação do vínculo.
  A janela posterior de perda continua em 5 s. São regras técnicas, não metros.
- Leitura/escrita RSSI têm timeout de 2 s; scan de 10 s separado da conexão de
  15 s. Geração de sessão impede conexão/listener antigo de publicar estado novo.
- Pausa, retomada e reset aguardam telemetria de confirmação após a escrita.
  Sem vínculo, confirmação presencial continua possível, mas a tela informa
  explicitamente que o dispositivo permanece sem comunicação.
- Estado nativo de emergência é separado do estado de áudio. Alarme já armado
  conserva motivo e prazo para tentativa de recuperação do serviço; parada
  explícita limpa esse registro. Isso não implementa conexão BLE nativa independente.
- Perfil, histórico, preferências, ensaios e intenção de monitoramento têm
  namespace por UID. Gravações são serializadas e capturam sua conta de origem.
  A migração copia dados da conta recuperada na abertura sem apagar originais;
  login novo não herda automaticamente dados legados de dono desconhecido.
- A interface aguarda preferências da mesma conta autenticada; mudanças de perfil
  atualizam nome da criança e identificação. O histórico guarda data e hora,
  valida registros, preserva eventos novos durante carga e não ressuscita
  registros antigos após uma limpeza que ocorreu enquanto a carga estava pendente.
- E-mail verifica resposta HTTP e tem limite de 10 s. Localização opcional tem
  limite de espera de 5 s, com texto de indisponibilidade; nenhuma dessas etapas
  bloqueia o início do alerta local. Continua sendo canal experimental.
- Diagnóstico considera dados atuais, não só conexão; notificação nativa usa link
  para Central e preserva motivo do alerta. A Central não chama todo pânico de
  perda de conexão. Bateria tem canais distintos conforme preferência de vibração.
- CSV acrescenta firmware/modelo/sistema/altura/versão sem alterar dados históricos,
  inclusive em coletas interrompidas antes da primeira amostra.
- Removido plugin externo BLE que exigia Expo 49; usado plugin da biblioteca
  instalada `react-native-ble-plx`, mantendo Expo 54 e React Native 0.81.5.
  Instalação agora verifica peers, em vez de ocultar conflitos.
- Backup Android desabilitado e microfone/armazenamento antigo bloqueados na
  configuração. Manifesto local gerado foi ajustado também, sem prebuild limpo
  que pudesse apagar personalizações. Inspecionar manifesto mesclado no build.

## Situação dos itens da auditoria anterior

"Implementado" significa correção no código com verificações locais proporcionais;
não significa comportamento já aprovado no telefone.

| ID | Situação atual |
|---|---|
| A01, A02 | Implementados; política e fallback passam em simulação. Kotlin/áudio físico pendentes. |
| A03, A04, A05 | Implementados; dados antigos, timeout, cancelamento e protocolo inválido cobertos por regressões. |
| A06 | Implementado com preservação dos originais; repetir troca de contas no aparelho. |
| A07 | Conflito de peers resolvido; configuração Expo avaliada. Build nativo limpo não confirmado. |
| A08 | Parcial: atualizações compatíveis reduziram avisos. Triagem/migrações restantes ainda necessárias. |
| A09 | Parcial: alarme armado persistido. BLE ainda depende de JavaScript; morte de processo não tem proteção independente garantida. |
| A10 | Timeout/HTTP corrigidos; canal ainda sem backend autenticado nem garantia de entrega. |
| A11 | Controle inerte de sons informativos retirado da interface. Campos legados sem uso mantidos apenas por compatibilidade, não anunciados como funções. |
| A12 | Implementado; data, validação, serialização e conflitos de carga/limpeza tratados. |
| A13 | Implementado; diagnóstico atualiza e considera saúde de dados. Não é certificado. |
| A14, A15 | Implementados; confirmar abertura da Central e texto correto no Android. |
| A16 | Implementado; canais com/sem vibração cobertos por teste. Preferências do sistema podem prevalecer. |
| A17 | Implementado; CSV testado, metadados não inventados para registros antigos. |
| A18 | Implementado; exige estado após escrita e mantém emergência se placa não confirmar. |
| A19 | Pendente: seleção por nome não autentica placa nem protege comandos GATT. Exige desenho de vínculo/pareamento e validação conjunta com firmware. |
| A20 | Parcial: backup e permissões extras tratados. Conferir manifesto mesclado e overlay do cliente de desenvolvimento antes da distribuição. |
| A21 | Pendente: compilação nativa, assinatura própria e APK standalone sem Metro. iOS não validado. |
| A22, A23 | Não alterados nesta etapa do aplicativo; pendências de visualização/documentação CAD continuam separadas. |

## Verificações

- `npm test`: **49 testes aprovados**, zero falhas/TODO; simulação sem rede/telefone.
- `npm run typecheck`: **aprovado** na conferência final.
- `npm ls --all --json`: árvore sem conflito de peers após a atualização.
- `expo config --type introspect`: configuração avaliada com plugin BLE da biblioteca.
- Exportação Android JavaScript/Hermes: aprovada; 857 módulos, aproximadamente
  3,03 MB, 21 assets, saída `.expo/correcoes-2026-10-09`. Exportação não é APK.
- Gradle `:escolta-sentinela:compileDebugKotlin --offline --no-daemon`:
  **bloqueado antes da compilação** por `Unable to establish loopback connection`
  no Java 21 do Android Studio. Tentativas com acesso autorizado e provedor
  alternativo de seletor não resolveram. Nenhuma configuração permanente do
  Windows/Java foi alterada para contornar isso. Kotlin não está aprovado.
- `git diff --check`: sem erro de whitespace; avisos de conversão LF/CRLF são
  da configuração Git Windows, não defeitos de TypeScript.

Os testes executam o código TypeScript real com React/Android/BLE simulados.
Não validam volume físico, Doze, foco de áudio, desempenho do telefone,
permissões efetivas, Bluetooth real, recepção de e-mail ou confiabilidade infantil.

## Dependências

Consulta atual: [dependencias_2026-10-09.json](dependencias_2026-10-09.json).
De 56 pacotes sinalizados inicialmente (incluindo um crítico), passou para
**44: 27 altos, 17 moderados, nenhum crítico/baixo**. A contagem inclui propagação
entre dependências e não corresponde a 44 ataques comprovados no aplicativo.

Foram atualizados dentro dos intervalos existentes `shell-quote`, `undici`, `ws`,
`@xmldom/xmldom`, `brace-expansion`, `browserslist`, `compression`, `fast-uri`,
`http-cache-semantics`, `js-yaml`, `nanoid`, `source-map-js`, `tar` e outros itens
compatíveis, com `--ignore-scripts` e lock atualizado. Não foi usado
`npm audit fix --force`: sugestões de downgrade para Expo 44/Firebase 9 ou
migração de React Native não foram aplicadas cegamente.

Restam avisos diretos/transitivos em `@grpc/grpc-js`, `braces`, `image-size`,
`node-forge`, `postcss`, `sprintf-js` e `uuid`. Há ferramentas de build e
dependências Firebase não usadas pelo caminho de autenticação, mas isso não
elimina automaticamente o risco da cadeia de desenvolvimento. Falta triagem
de alcance e combinação de versões testada antes de distribuição.

## Como validar no aparelho

1. Resolver o erro do ambiente de compilação; compilar o módulo e o aplicativo.
2. Gerar e instalar nova development build. **A tecla de recarga do Metro não
   atualiza Kotlin**; o cliente antigo usa fallback, não comprova a correção nativa.
3. Executar [plano físico](PLANO_TESTES.md) com bancada/adultos: botão, reset,
   notificações/vibração, perda breve/prolongada, leituras antigas, tela bloqueada,
   pausa/retomada, troca de conta e reabertura. Não usar criança como teste.
4. Tratar A08/A09/A19/A20/A21 antes de alegar confiabilidade além do acadêmico.
5. Só então preparar APK interno com JavaScript incorporado e repetir sem Metro.

Distância continua estimativa experimental; a calibração e os limiares `xiao-p2`
não foram alterados nesta etapa. Amarelo/vermelho não equivalem a metros exatos.

## Continuação: ambiente de compilação

O erro de loopback relatado acima foi isolado em um programa Java mínimo:
TCP local funcionava, mas `Selector.open()` falhava em conexão Unix-domain.
Com `jdk.net.unixdomain.tmpdir` apontando para `.expo/jtmp`, ambos passaram,
sem trocar Java, desabilitar firewall ou alterar configurações globais.
A propriedade é usada pela [implementação Windows do OpenJDK](https://raw.githubusercontent.com/openjdk/jdk21u/master/src/java.base/windows/classes/sun/nio/ch/UnixDomainSocketsUtil.java).

A tentativa seguinte avançou além do erro, mas faltavam dependências Kotlin/
Gradle no cache offline. Foi iniciada a compilação online para obtê-las.
O módulo `escolta-sentinela` foi descoberto pela configuração Android e depois
**compilado com sucesso**: `BUILD SUCCESSFUL in 4m 24s`, 45 tarefas, sem erro Kotlin.
O SDK instalou automaticamente NDK 27.1, Build-Tools 35 e plataforma Android 36,
com licenças já aceitas. Não foram aceitas novas licenças por comando nesta etapa.
Foram emitidos avisos de depreciação de bibliotecas/Gradle, não erros de compilação.
Isso atualiza a pendência de compilação Kotlin acima, mas não aprova o APK,
a assinatura, o segundo plano nem o comportamento físico.

Reprodução: `./tools/build-android.ps1 -Target Validate -Online`.
Geração posterior: `./tools/build-android.ps1 -Target Apk -Online`.
O script limita a build ao ARM64 usado pelo Galaxy S24 Ultra, restaura suas
variáveis ao terminar e não instala o APK. A build debug é para testes com Metro,
não uma release standalone/certificada. Os testes TypeScript anteriores não
precisaram de alteração para corrigir esse problema do ambiente.

### APK gerado e instalação pendente

A compilação completa `:app:assembleDebug` terminou com **BUILD SUCCESSFUL
in 3m 55s**, 354 tarefas (309 executadas, 45 atualizadas). O SDK também instalou
CMake 3.22.1 usando as licenças já aceitas. O APK ARM64 de desenvolvimento está
em `android/app/build/outputs/apk/debug/app-debug.apk` (143.898.431 bytes).
Ainda depende de Metro; não é o APK final standalone.

O manifesto mesclado confirma `allowBackup=false`, serviço Sentinela com tipos
`connectedDevice|mediaPlayback` e ausência de permissões de microfone e de
leitura/escrita legadas do armazenamento. O overlay de desenvolvimento permanece;
a revisão de permissões da release continua pendente. O script PowerShell foi
novamente validado pelo analisador de sintaxe, sem erro.

O Galaxy S24 Ultra foi reconhecido e autorizou a depuração USB. A assinatura
do APK existente foi comparada à do APK novo, com `apksigner verify --print-certs`:

- Instalado: SHA-256 `34f8ddb808fac6d1eba6f3086ab8d86615270467831be74eaedade9a6a70c705`.
- Novo: SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

São certificados diferentes: não é uma atualização direta compatível. **Nenhuma
instalação, desinstalação ou limpeza de dados foi feita.** A instalação fica
pendente de escolha do usuário entre preservar a assinatura original ou preparar
um aplicativo separado para teste. Foi copiado apenas o APK instalado para
`.expo/escolta-instalado-antes.apk`; isso preserva o código antigo, **não é backup
do histórico, das preferências ou dos dados de acesso**.

As pendências anteriores de compilação nativa foram superadas. Assinatura para
distribuição, instalação, ensaios físicos, operação sem Metro e limitações de
segurança/segundo plano continuam sem aprovação final.
