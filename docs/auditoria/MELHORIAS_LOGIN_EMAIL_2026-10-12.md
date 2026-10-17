# Login, cadastro e e-mail — 12/10/2026

## O que mudou

- Cadastro por e-mail: validação de endereço, confirmação de senha, mínimo de oito
  caracteres para contas novas, preenchimento automático e bloqueio de cliques
  repetidos. O acesso de contas antigas continua aceitando a senha existente.
- Recuperação não afirma que uma conta existe nem expõe esse detalhe na mensagem.
- Se o acesso foi criado e apenas o perfil falhou, a mensagem não manda recriar
  a conta. Nome, criança e contato de perfis existentes não são sobrescritos pelo
  preenchimento inicial do acesso Google.
- Google: módulo Android separado `escolta-auth`, usando Credential Manager e
  validação do ID token pelo Firebase. Cancelar o seletor não autentica; tokens
  não são persistidos no perfil nem registrados em logs. O logout também tenta
  limpar a sessão do provedor. Não há implementação iOS/Web nesta etapa.
- O botão Google fica **indisponível enquanto faltar configuração ou o módulo
  nativo**. Não foram criadas credenciais fictícias nem alterado o Firebase remoto.
- E-mail: seção renomeada para “E-mail para alertas”, com endereço validado,
  ativação explícita, confirmação do uso autorizado pelo contato e teste manual.
  Mudar/remover o endereço desativa o envio. Endereços legados são preservados,
  mas o envio permanece desligado até ativação explícita.
- O teste não envia localização nem nome da criança. HTTP aprovado só comprova
  aceitação pelo serviço, não entrega. O diagnóstico não trata cadastro de contato
  como aprovação do canal. Não foram enviados e-mails reais nesta verificação.
- Avisos por e-mail são controlados pela sua opção específica, independentemente
  da opção de notificações locais. O canal não substitui alarmes e não comprova
  confiabilidade: falta backend autenticado, confirmação de destinatário, limites
  de abuso e rastreamento de entrega. EmailJS permanece experimental.
- Ícones: carregamento explícito da fonte Ionicons antes de mostrar as telas;
  falha oferece tentativa de novo carregamento. Não foi confirmado no telefone
  que fonte/cache era a causa dos ícones ausentes relatados pelo usuário.

## Aplicativo paralelo

`./tools/build-android.ps1 -Target Apk -TestApp -Online` prepara a versão debug
ARM64 `com.nicolasvmen.escoltaunitau.teste`, nome **Escolta Teste**, versão
`1.0.0-teste`, links `escolta-teste://` e `exp+escolta-teste://`.
O plugin em `tools/plugins/with-test-build.cjs` conserva a configuração ao
regenerar o projeto Android. O projeto Android existente recebeu somente os
ajustes correspondentes, sem executar prebuild destrutivo.

O pacote oficial mantém seu identificador. A versão paralela tem dados locais
separados, exige novo login e ainda depende de Metro. Não equivale a uma release.
Histórico/preferências do aplicativo antigo não são automaticamente copiados.
Se os testes forem aprovados, a promoção a oficial exige planejar assinatura,
identificador, migração de dados e APK sem servidor. Não há promoção automática.

As notificações nativas usam o link do pacote correto, evitando abrir a versão
antiga. Não mantenha as duas versões monitorando a mesma placa ao mesmo tempo.

## Configuração Google que ainda depende do administrador

No projeto Firebase **escolta-unitau-tcc**:

1. Em Authentication → Sign-in method/Provedores, habilitar Google e definir o
   e-mail de suporte do projeto.
2. Cadastrar um aplicativo Android com pacote
   `com.nicolasvmen.escoltaunitau.teste` e registrar os certificados da build de
   teste. O SHA-1 local é
   `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
   O SHA-256 local é
   `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`.
3. Obter o ID OAuth do cliente **WEB** do mesmo projeto (não o ID Android nem
   um segredo). Colocar `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com`
   em `.env.local`, usando `.env.example` como referência.
4. Reiniciar Metro para carregar o valor e testar seleção/cancelamento de conta,
   login novo/existente, logout, troca de conta e recuperação. Se o provedor
   indicar conflito de conta, usar o acesso existente; não mesclar dados manualmente.

Não envie segredo OAuth, senha do Google ou chave privada. Certificados de uma
futura assinatura de produção serão diferentes e precisam de cadastro próprio.

Foi usada a integração moderna descrita pelo
[Android Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation)
e a autenticação documentada pelo
[Firebase](https://firebase.google.com/docs/auth/android/google-signin).
Credential Manager 1.5.0 e Google ID 1.1.1 foram mantidos para compatibilidade com
o Kotlin 2.1 do Expo SDK 54: a primeira tentativa com versões mais recentes
falhou por incompatibilidade de metadados Kotlin. Não foi alterada globalmente
a versão Kotlin/Expo para forçar compilação. As versões fixadas não significam
que são as versões mais recentes; uma migração de SDK deve reavaliá-las.

## Verificações e limites

- TypeScript aprovado; **64 testes automatizados aprovados**, sem falhas/TODO.
- Testes cobrem helpers reais, ponte Google com Firebase/Android simulados,
  cancelamento, configuração ausente, token vazio, opt-in de e-mail, HTTP recusado,
  falha de rede, isolamento de perfil e idempotência do plugin.
- A configuração Expo introspect confirmou o placeholder do nome no manifesto.
- A build paralela completa passou após o ajuste de compatibilidade.
- A confirmação final terminou com `BUILD SUCCESSFUL in 36s`. `aapt` confirmou
  pacote `.teste`, rótulo “Escolta Teste”, versão `1.0.0-teste` e atividade de
  abertura. `apksigner verify` validou a assinatura debug documentada acima.
  O manifesto confirma links separados, `allowBackup=false` e ausência de
  permissão de microfone. Embora a compilação seja direcionada a ARM64, o APK
  também contém bibliotecas pré-compiladas de armeabi-v7a/x86/x86_64; enxugamento
  e revisão do pacote de distribuição permanecem para a release.
- Cópia conferida da entrega: `.expo/entrega-2026-10-12/Escolta-Teste.apk`,
  145.797.704 bytes, SHA-256
  `73F1F6315FE8098EEFEC854CEE457E8FFF80BB5FE6A1B70207D504AF92679F89`.
- Exportação Android/Hermes aprovada: 861 módulos, 21 assets, bundle 3,05 MB em
  `.expo/melhorias-2026-10-12`. A primeira tentativa encontrou restrição de gravação
  no TEMP do ambiente; a repetição com temporários locais e acesso autorizado
  passou. Exportação de JavaScript não torna o APK debug standalone.
- `git diff --check` e sintaxe PowerShell aprovados. Sem commit/push nesta etapa.
- A autorização USB voltou a aparecer como pendente; nenhum aplicativo foi
  desinstalado, nenhum dado apagado e nenhuma instalação realizada até aqui.
- Login Google real, recebimento do e-mail, funcionamento físico dos alarmes e
  execução em segundo plano continuam exigindo configuração/ensaio no aparelho.
- As pendências de segurança e confiabilidade da auditoria anterior permanecem;
  estas melhorias não certificam o protótipo nem o tornam produto final.

## Continuação: instalação e acesso ao console

Após o usuário autorizar novamente a depuração USB, o APK da entrega foi
instalado com `Success`. A lista de pacotes confirmou **ambos** os aplicativos:
`com.nicolasvmen.escoltaunitau` e `com.nicolasvmen.escoltaunitau.teste`.
O pacote de teste informa `versionName=1.0.0-teste`. Não houve desinstalação,
limpeza de dados ou substituição do pacote antigo. A instalação não comprova
funcionamento dos ensaios físicos nem atualização da assinatura oficial.

O usuário selecionou no navegador a conta com acesso ao projeto e a aba correta
foi reutilizada. O formulário do provedor Google foi aberto somente para inspeção;
nenhuma alteração de provedor ou credencial foi salva nesta etapa. A configuração
remota aguarda confirmação específica antes da ativação.

## Nova conta dedicada: criação pendente

O usuário preparou a conta `escoltaunitau@gmail.com` e autorizou criar um novo
projeto Escolta Unitau sem cobrança, aceitar os Termos do Firebase, habilitar
e-mail/senha e Google e conectar somente o aplicativo de teste. O projeto antigo
deve permanecer intacto; não há autorização para migrar/apagar usuários antigos.

O formulário foi enviado com identificador inicial `escolta-unitau`, sem
participação no Programa para desenvolvedores, Gemini ou Google Analytics.
O console retornou “Falha na operação (Motivo: [object ProgressEvent])”. Após
recuperar o console, os Termos não foram solicitados novamente, mas nenhum
projeto apareceu na página inicial. A tentativa de preparar novamente o nome
gerou um identificador com sufixo; essa segunda criação não foi enviada.
A consulta direta de `escolta-unitau` retornou erro ao processar a solicitação.
Não é possível afirmar que o projeto foi criado ou que não existe: pode haver
provisionamento parcial, o que precisa ser conferido antes de nova criação.

A abertura da opção “Adicionar o Firebase ao projeto do Google Cloud”, pretendida
para inspecionar possíveis recursos parciais, foi bloqueada pela revisão de
segurança por não haver autorização específica de associação. Nenhuma associação
foi feita. Provedores, aplicativos Android/Web, credenciais OAuth e a configuração
local do Firebase permanecem sem alteração nesta continuação.

O usuário informou em seguida que criou o projeto. A aba de visão geral mostrou
“Escolta Unitau”, identificador `escolta-unitau`, conta dedicada correta e plano
Spark, mas também “Concluindo…”. A consulta à área de Authentication retornou
“O projeto não existe ou você não tem permissão para listar apps no projeto”.
A página inicial da mesma conta apresentou lista vazia, status “0 de 0”. Esses
sinais são contraditórios: a conclusão do provisionamento/acesso não foi
confirmada. Não houve nova criação, exclusão, associação, ativação de provedor
ou alteração da configuração do aplicativo nessa verificação.

Na conferência seguinte, o print do usuário e a lista atual do navegador
confirmaram um projeto listado: Escolta Unitau, ID `escolta-unitau`, na conta
`escoltaunitau@gmail.com` (1 a 1 de 1). A dúvida sobre sua presença na lista foi
resolvida. Contudo, abrir o link listado e acessar diretamente sua visão geral
continuaram retornando erro de inexistência/permissão para listar aplicativos.
Os logs disponíveis mostraram erros genéricos, sem causa identificável; não há
evidência suficiente para atribuir o erro a permissões, rede ou navegador.
Nenhuma configuração remota/local foi alterada nesse último exame. O acesso à
visão geral ainda precisa funcionar antes de registrar apps e ativar provedores.

## Configuração concluída no código após orientação pela tela do usuário

O usuário acessou normalmente o console e confirmou a ativação de e-mail/senha
e Google, com o endereço dedicado como suporte. Registrou o Android
`com.nicolasvmen.escoltaunitau.teste`, forneceu o `google-services.json` e confirmou
que adicionou o SHA-1 indicado. O arquivo recebido foi lido localmente e conferiu
projeto `escolta-unitau`, número `247729429884`, pacote de teste e cliente OAuth
tipo 3 (WEB). O arquivo original, baixado antes da adição do SHA-1, não contém
cliente OAuth Android; não comprova por si só o registro final do certificado.

Como o aplicativo utiliza Firebase Authentication pelo SDK JavaScript, foi
orientado o registro Web adicional. O usuário forneceu sua configuração pública,
com appId `1:247729429884:web:c725e5c41ecc67a83358f9`. Não foram executados os
comandos genéricos do exemplo: Firebase já está instalado, e o app não inicializa
Firebase Analytics nem instala SDK Firebase nativo adicional.

`src/services/firebaseEnvironment.ts` seleciona a configuração pelo marcador
nativo da build. Escolta Teste usa o projeto novo e o nome Firebase próprio
`escolta-teste-escolta-unitau`; o app antigo conserva sua configuração exata e
o nome `[DEFAULT]`. Isso também separa a sessão Firebase persistida. Não foram
transferidas, apagadas ou mescladas contas/perfis de projetos diferentes.
Recargas só reutilizam instância com nome e configuração correspondentes;
falhas de inicialização diferentes de `auth/already-initialized` são propagadas.

O ID público WEB do Google foi colocado em `.env.local`, confirmado como ignorado
pelo Git. A ponte Google fica bloqueada na build antiga e recusa cliente cujo
prefixo numérico não corresponda ao projeto selecionado. Essa checagem é de
consistência local; a validação criptográfica do token continua no Firebase.
Nenhum segredo OAuth, senha ou chave de administrador foi inserido no código.

Verificações desta continuação: TypeScript aprovado; **69 testes automatizados
aprovados**, sem falhas/TODO; `git diff --check` aprovado. Os cinco testes novos
conferem seleção de projeto, bloqueio do cliente Google errado, isolamento de
instâncias e comportamento de recarga/falha de persistência. São testes simulados,
não confirmação de login real ou cadastro do SHA-1 no serviço remoto.

O Samsung apareceu autorizado por USB. Ambos os pacotes continuam instalados.
Metro foi iniciado com o esquema `escolta-teste`, porta 8081 e ambiente atualizado;
o encaminhamento USB de `tcp:8081` foi confirmado. Nenhum APK foi reinstalado,
nenhuma limpeza de dados foi executada. As mudanças são JavaScript e usam o
módulo nativo já presente no APK de teste. O login real com Google/e-mail,
cancelamento, logout e retorno ao aplicativo ainda precisam ser ensaiados.

A primeira inicialização de Metro no ambiente restrito exibiu prontidão, mas
as requisições locais não responderam. Somente esse processo foi interrompido
e reiniciado com acesso autorizado fora da restrição. A verificação final obteve
HTTP 200 para status, manifesto Android e bundle. Metro concluiu a geração de
976 módulos; o bundle de 6.963.036 bytes contém ambas as configurações públicas
(selecionadas pelo marcador nativo) e o cliente Google atualizado. Isso comprova
entrega de código pelo servidor, não login ou execução física no telefone.
O servidor foi deixado ativo para o teste acompanhado pelo usuário.

## Correção de primeiro acesso: notificações e autorização BLE

O usuário confirmou login Google real e relatou fechamento repetido após
autorizar notificações. O buffer de crash do Samsung registrou `SecurityException`
no `EscoltaSentinelaService.onStartCommand`, ao chamar `startForeground` com tipo
`connectedDevice`. A versão de teste tinha `POST_NOTIFICATIONS` concedida, mas
`BLUETOOTH_CONNECT` e `BLUETOOTH_SCAN` negadas. Na antiga, ambas estavam concedidas.
A ordem serviço → solicitação BLE já estava no código versionado anterior;
não foi uma falha do Firebase nem dos canais de bateria. O usuário confirmou
recuperação após conceder a permissão pelas configurações do Android.

Com autorização para corrigir, foram implementados:

- `blePermissions.ts`: consulta real, solicitação compartilhada, reconsulta após
  diálogo e limitação de solicitações após recusa durante a mesma sessão.
  Android 12+ solicita scan/connect; Android anterior mantém localização para
  descoberta BLE. A localização opcional do contato de emergência é separada.
- Hook: confere BLE antes de iniciar serviço/conexão; recusa vira orientação
  na interface, sem iniciar o serviço. Confere cancelamento após aguardar permissão.
- API BLE: utiliza a mesma autorização e preserva cancelamento por geração.
- Ponte JS: consulta sem diálogos antes de início/atualização/armamento nativo,
  incluindo compatibilidade com o APK antigo; falha retorna ao fallback existente.
- Serviço Android: valida antes de iniciar e novamente ao receber o comando;
  promoção protegida contra `SecurityException`/`IllegalStateException`,
  encerramento sem reinício automático quando não autorizado. `isRunning` só
  fica verdadeiro após promoção. Nenhuma permissão de rede artificial foi adicionada
  para contornar a exigência de Bluetooth; tipos do serviço permanecem iguais.

Verificações: TypeScript aprovado; **79 testes automatizados aprovados**, sem
falhas, pulos ou TODO; `git diff --check` aprovado; Gradle `assembleDebug` com
`escoltaTestBuild=true` aprovado em 42 s. Os dez novos testes cobrem permissão,
recusa, concorrência, recuperação pelas configurações, ordem do hook, bloqueio
da ponte e contrato textual nativo. O teste textual nativo e a compilação não
substituem ensaio de recusa no Android real. Não foram revogadas permissões do
celular nem apagados dados para forçar um primeiro acesso.

APK conferido: `com.nicolasvmen.escoltaunitau.teste`, rótulo `Escolta Teste`,
mesmo certificado debug SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
SHA-256 do APK desta correção:
`E994A076908B4B4E99184CC8DFBC6DBC31EDE1CE62116319178E9B913B782A33`.
Arquivo compilado: `android/app/build/outputs/apk/debug/app-debug.apk`.

Não há aprovação global do aplicativo: reabertura, notificações, recusa no aparelho
e alertas com a caixinha continuam exigindo validação acompanhada. A concessão
manual anterior explica a recuperação, mas não prova a correção instalada.

A atualização `adb install -r` terminou com `Success`, sem desinstalação/limpeza.
O pacote de teste registrou atualização às 23:24:34 de 12/10 no relógio do aparelho;
scan/connect/notificações permaneceram concedidas. O pacote original manteve
`lastUpdateTime=2026-07-31 23:33:32`, conferido antes/depois. O servidor anterior
não estava ouvindo; foi iniciado um único Metro na porta 8081, esquema de teste,
e refeita a ponte USB. Bundle HTTP 200 com 6.965.090 caracteres, contendo a
orientação nova e o cliente Google existente. Não houve abertura automatizada
da interface nem teste físico de recusa nesta instalação; o usuário deve reabrir
o Escolta Teste para confirmar a execução e manutenção da sessão.
