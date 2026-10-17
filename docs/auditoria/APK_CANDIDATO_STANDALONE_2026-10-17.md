# APK candidato standalone — rodada de entrega

## Preparação

Usuário confirmou Sentinela em espera antes desta etapa. Compilação solicitada por `tools/build-android.ps1 -Target StandaloneApk -TestApp -Online`. Somente candidato paralelo ARM64, não substituição da oficial. Ferramentas internas desligadas; Firebase público `escolta-unitau` e cliente Google conferidos antes do Gradle.

Backup novo `backups/releases/2026-10-17_candidato_standalone`, sem sobrescrever os anteriores: oficial antiga, fontes atuais (216 entradas, incluindo Metro e W1), referência Git, pacote do firmware W1 efetivamente gravado e APK Teste instalado antes desta rodada. Sem credenciais, builds ou `.env.local` detectados pelos filtros. Não inclui dados/sessão do celular nem chave original EAS. Checksums no LEIA-ME desse diretório.

Samsung SM-S928B / serial `RXCXA07DTXF` reconhecido por ADB; ABI `arm64-v8a`. Antes desta rodada: Teste `com.nicolasvmen.escoltaunitau.teste`, código 1, versão 1.0.0-teste, depurável, atualização de 15/10; oficial `com.nicolasvmen.escoltaunitau`, código 1, versão 1.0.0, atualização registrada em 31/07. A data de instalação não comprova o código JavaScript servido pelo Metro.

Certificado público da cópia Teste obtida do telefone: SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, igual à chave local Teste esperada. Oficial tem outro certificado e não será atualizada com essa chave. Não foi acessado dado privado de conta ou exportada chave privada.

Durante a compilação, o servidor Metro do usuário respondeu `packager-status:running` na porta 8081. Isso sustenta que não havia encerrado naquele instante, após a exclusão de `.expo/jtmp`; não é monitoramento contínuo ou garantia contra qualquer erro futuro.

## Resultado de geração e inspeção

Geração concluída: **BUILD SUCCESSFUL em 4 min 44 s**, 644 tarefas (541 executadas, 103 atualizadas). Avisos de APIs antigas e de metaspace foram emitidos, mas não impediram a conclusão. Não foram suprimidos nem motivaram migração de SDK/áudio.

APK final: 92.467.314 bytes, SHA-256 `DBB17FD77D333F52DB9A7C3E4AADC8AF05E65FC2D9B84C602EA47790B501E703`. Pacote `.teste`, nome Escolta Teste, código 1, versão **1.0.0-teste-sem-servidor**, minSdk 24/targetSdk 36, `debuggable=false`, metadata de monitor validado ativa. Certificado SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, igual ao Teste instalado anteriormente e diferente da oficial.

Bundle incorporado no APK: 2.063.796 bytes, SHA-256 `91a33bebae0e1020676c84bee7e2db1674b6d4518d4d872ebca4541a3e1c0abe`, idêntico ao bundle validado após a limpeza da interface. A geração local seleciona ARM64 para compilação, porém dependências pré-compiladas empacotaram bibliotecas também de outras ABIs. Isso não aprova funcionamento em outros aparelhos/arquiteturas; o alvo desta rodada é o Samsung ARM64 identificado.

### Recursos otimizados e correção do verificador

A primeira checagem recusou o APK por procurar literalmente `res/raw/escolta_alerta.wav`. Inspeção da tabela Android mostrou recurso lógico `raw/escolta_alerta` preservado e arquivo renomeado pelo empacotamento para `res/Ow.wav`. Não era ausência do áudio no aplicativo.

O verificador agora resolve os nomes lógicos com `aapt dump --values resources`, exige o arquivo físico não vazio e compara áudio/fonte com SHA-256 dos originais. Não basta aceitar qualquer WAV. Adicionados testes negativos para recurso ausente, declaração sem conteúdo, nome parecido e caminhos inválidos; a assinatura e os demais bloqueios foram mantidos.

| Recurso lógico | Caminho físico | Conferência |
| --- | --- | --- |
| Áudio nativo | `res/Ow.wav` | 88.244 bytes, SHA-256 `9F5FFD851C96F007E38D28856FE8AF4F38E8052031D27E657176E7DD3C2BC3BF`, idêntico ao fonte |
| Áudio fallback JS | `res/ti.wav` | mesmo tamanho/hash do áudio fonte |
| Fonte Ionicons | `res/CU.ttf` | 389.724 bytes, SHA-256 `FA2AB7D2557819B2BFE5009E46844EFA7170CF177BE7735D43AA2AC1295F1D54`, idêntica ao fonte |
| Ícone Google | `res/7x.png` | recurso lógico `drawable/assets_googleg`, arquivo presente/não vazio; não se exige identidade binária após otimização PNG |

Verificador final retornou `ok=true`, sem issues. **207 testes Node aprovados**, sem falhas/skips/TODO; tipagem novamente aprovada. Apenas ferramentas de verificação mudaram após gerar esse APK; não houve alteração do aplicativo para contornar a checagem e não foi necessário recompilar o arquivo.

### Instalação do candidato

APK copiado, com hash reconferido, para `dist/android/candidato-2026-10-17/Escolta_Candidato_SemServidor.apk` e para o checkpoint de backup. Samsung selecionado explicitamente por serial `RXCXA07DTXF`. Instalação de atualização `adb install -r` terminou com **Success**. Não houve desinstalação, limpeza de dados, alteração da oficial, gravação de firmware, abertura automática do app ou comando de retomada da proteção.

A instalação bem-sucedida não comprova preservação visual de perfil/preferências nem funcionamento sem Metro. Essas verificações dependem da abertura guiada pelo usuário, ainda pendente neste registro.

Consulta posterior ao Package Manager: Teste passou a `1.0.0-teste-sem-servidor`, código 1, `debuggable=false`, atualização registrada em 17/10/2026 às 17:56:41. Oficial permaneceu `1.0.0`, código 1, com data de atualização de 31/07/2026 às 23:33:32. O app não foi aberto por ADB e nenhuma retomada foi enviada. O usuário será orientado a encerrar Metro e abrir pelo ícone, ainda em espera.

## Checagem instalada necessária

### Abertura sem Metro — aprovada nesta rodada

Usuário confirmou: “parei o servidor, entrei no app e está em espera”. Consulta posterior por ADB confirmou PID 8147 do pacote `.teste`, atividade retomada `com.nicolasvmen.escoltaunitau.teste/com.nicolasvmen.escoltaunitau.MainActivity` e nenhuma porta 8081 em escuta no computador. O candidato abriu pelo fluxo orientado, sem QR e com estado em espera preservado. Isso não comprova todos os campos de perfil/preferências nem um novo login Google, BLE ativo ou alertas; essas etapas continuam separadas. Nenhuma retomada foi enviada por ferramenta.

### Proteção próxima e tela bloqueada sem Metro — aprovadas por relato

Solicitado retomar proteção a aproximadamente 1 m, manter por 1 minuto em primeiro plano, observar Protegido/estimativa atualizando/silêncio; depois bloquear tela por 2 minutos sem mover os dispositivos e reabrir, ainda sem servidor. Usuário respondeu aos dois: “funcionou certinho”. Aprovação limitada ao roteiro relatado, sem medição instrumental de todos os pacotes/tempo nesta etapa. Não constitui validação de alarmes em release, descarga/autonomia ou execução prolongada em Doze. Nenhum código/firmware alterado após esse relato.

### Alcance reduzido e emergência sem Metro — aprovados por relato

Solicitados dois roteiros no candidato instalado: (1) afastar até a marca de aproximadamente 3 m já usada, aguardar amarelo/bipe lento/vibração inicial e aproximar para retorno automático a Protegido/silêncio; (2) afastar até aproximadamente 5 m, aguardar vermelho, tentar confirmar segurança ainda distante (deve recusar), aproximar mantendo a emergência e só então confirmar, com resposta da placa e silêncio de ambos. Usuário respondeu: “funcionou corretamente”. Resultado aprovado por relato para esses roteiros, não garantia metrológica dos limiares em qualquer ambiente. Não houve nova coleta CSV, alteração de código/firmware nem teste do botão físico. Perda real de conexão com tela bloqueada no candidato standalone ainda será verificada separadamente.

### Perda de conexão com tela bloqueada e recuperação — aprovadas por relato

Solicitado bloquear o celular ainda Protegido, desligar completamente a caixinha e aguardar até 30 s pelo alerta no telefone; abrir o app e tentar confirmar segurança com a placa desligada, devendo recusar e manter a emergência. Em seguida, religar a caixinha próxima, observar reconexão/estimativa sem encerramento automático da emergência e confirmar segurança somente após resposta da placa, voltando a Protegido e silêncio. Usuário informou para os dois: “funcionou corretamente”. Aprovação por relato nesse aparelho/roteiro, sem captura instrumental de latência ou validação de execução prolongada em Doze. Sem nova alteração de código ou firmware. Login Google renovado e compartilhamento de relatório nesta instalação standalone continuam pendentes.

### Compartilhamento e novo login Google sem Metro — aprovados por relato

Solicitado compartilhar o relatório normal de Registros para uma conversa do próprio usuário, verificar texto/horários/ocorrências e retornar sem travamento ou perda de conexão; em seguida, colocar a Sentinela em espera e silenciosa, sair da conta, entrar novamente com a mesma conta Google e conferir nome/e-mail/perfil/preferências e permanência em espera sem alarmes. Usuário respondeu: “deu certinho, tudo ok”. Ambos os roteiros aprovados por relato no candidato standalone. Isso não valida o cadastro OAuth do pacote oficial, que tem identidade/certificado diferentes, nem confirma entrega de e-mail nesta rodada.

Os roteiros solicitados de abertura sem Metro, proteção próxima/tela bloqueada, amarelo/vermelho/confirmação, perda de conexão/recuperação, relatório e novo login Google estão aprovados nesta instalação por evidência indicada acima. A promoção da identidade oficial ainda exige assinatura original, cadastro Firebase/OAuth e versão adequados, seguida de checagem instalada da própria oficial. Botão físico após reparo e ensaios de autonomia integral/bateria baixa real permanecem pendentes.

1. Conferir pacote/certificado/versão e artefatos do APK final antes de instalar.
2. Atualizar somente Teste, com mesmo certificado e preservação de dados; não usar desinstalação para contornar erro.
3. Encerrar Metro e abrir candidato por seu ícone, sem QR/deep link de desenvolvimento. Confirmar sessão/perfil/preferências/espera e interface de uso sem ferramentas internas.
4. Checar acesso Google, BLE, alerta/recuperação e segundo plano no candidato sem servidor. Não pedir ensaio CSV: ferramenta interna deve estar ausente no uso normal. Relatório de ocorrências continua sendo função de usuário e pode ser compartilhado.
5. Só após essa rodada, preparar promoção com assinatura original, cadastro Firebase oficial e versão adequados. Não chamar o pacote paralelo de oficial.

Botão físico após reparo, autonomia integral e descarga/bateria baixa real continuam pendentes e não serão inferidos desta compilação.
