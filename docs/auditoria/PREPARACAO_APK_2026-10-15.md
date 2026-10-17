# Preparação do candidato Android — 15/10/2026

## Escopo e limites

O responsável adiou o reparo dos dois fios do botão para segunda-feira e pediu adiantar melhorias antes do APK. Esta etapa prepara/valida a distribuição local de teste sem Metro; não promove automaticamente ao oficial e não aprova hardware ou calibração. Não instalar/desinstalar apps, apagar dados, gerar chaves substitutas, gravar firmware ou alterar limites RF nesta etapa.

## Alterações implementadas

- `tools/plugins/with-test-build.cjs`: candidato de release requer dois opt-ins (`escoltaTestBuild=true` e `escoltaStandaloneTestBuild=true`), mantém pacote `.teste`, nome e links separados. Bloqueio de release sem opt-in acontece no grafo, antes da execução de tarefas, não apenas depois de empacotar. Não sobrescreve um manifesto release próprio já existente.
- `tools/android/standalone-test/AndroidManifest.xml`: overlay somente do candidato, remove SYSTEM_ALERT_WINDOW e proíbe HTTP aberto globalmente. Microfone e armazenamento legado continuam bloqueados pelo projeto. Desenvolvimento com Metro não perde sua permissão de overlay.
- `tools/build-android.ps1`: novos alvos `ValidateStandalone` (bundle de produção, manifesto e Kotlin, sem APK) e `StandaloneApk` (geração futura). Ambos exigem `-TestApp`; ambiente restaurado no final; nenhuma instalação. O script antigo `-Target Apk` continua sendo debug com Metro, não standalone.
- `tools/auditoria/verificar_candidato_android.cjs`: verifica somente intermediários, sem escrever dados: pacote/nome, links, não-debuggable, ausência de HTTP global e permissões indevidas, serviço não exportado/persistente e suas permissões, flag do monitor corrigido, bundle não vazio e SHA-256. Confere Firebase/cliente Google no ambiente de produção e presença do cliente no bundle; não imprime identificador, senha ou token. Não comprova cadastro remoto do certificado ou login real.
- `nativeIdentity.ts`: identidade do pacote (`IS_TEST_BUILD`) separada de funcionalidade (`VALIDATED_MONITOR_ENABLED`). Teste mantém correções inclusive com módulo antigo. Oficial padrão não é promovida. Futura oficial poderá optar explicitamente com `-PescoltaValidatedMonitor=true`, flag nativa `escolta.validated_monitor`, depois de assinatura/aceitação revisadas. Nome, links e instância Firebase continuam determinados pela identidade, não pela flag de recursos.
- App/controlador, transporte BLE, pulso em segundo plano e confirmação de segurança agora consultam a flag de recursos, sem mudar a decisão atual do teste nem a da oficial padrão. Isso evita perder as correções ao trocar o pacote/nome na promoção futura. Novos testes cobrem oficial opt-in recusando confirmação sem vínculo e preservando pulso nativo.
- `.gitignore`: protege `credentials.json` e arquivos `.keystore`, além dos `.jks` já protegidos. Não houve leitura/impressão ou download de chave privada.

Aplicados os mesmos blocos ao Android gerado para validar agora; a configuração permanente fica no plugin e no overlay versionável. Comparação do bloco gerado com o plugin: reproduzível/idempotente. Modificações anteriores da árvore foram preservadas.

## Validação executada

1. Base inicial: 131 testes JS aprovados e TypeScript sem erros.
2. Depois da preparação estrutural: 138 testes aprovados.
3. Depois de separar identidade/recursos: 144 testes aprovados, zero falhas/skips/TODO; TypeScript novamente aprovado. Inclui contratos/simulações, não testes físicos.
4. PowerShell validado por AST. Primeiro build offline parou por duas dependências release ausentes do cache; build online buscou dependências sem trocar versões do projeto.
5. Primeira composição do manifesto falhou porque `tools:node` é validado antes de resolver placeholders. Corrigido para overlay estático de release, condicionado por Gradle. Não suprimir o erro nem aceitar manifesto permissivo.
6. Validação estrutural antes da flag nativa adicional terminou `BUILD SUCCESSFUL in 59s`, 102 tarefas. Bundle Hermes 2024504 bytes, SHA-256 `1edf66f66a9f82824595746507d962ea9e7ff9c33c427ba4b2c5d1b3727d4395`; pacote `.teste`, Google embutido, permissões/serviço corretos, HTTP global desabilitado. Nova validação após a flag nativa será registrada abaixo quando terminar.

Nenhum APK release foi solicitado até esta atualização. APK debug preexistente é de 13/10. Bundle/mapa/manifestações intermediárias não são aprovação de DEX, assinatura, APK final ou funcionamento sem servidor.

### Resultado final após separar identidade e recursos

Nova validação terminou `BUILD SUCCESSFUL in 58s`, 102 tarefas (5 executadas, 97 atualizadas), incluindo compilação release do módulo Auth com a nova constante nativa. Verificador estrutural retornou `ok=true`: metadata do monitor corrigido ativa, pacote `.teste`, links/nome isolados, serviço correto, HTTP global desabilitado e cliente Google presente. Bundle final 2024632 bytes, SHA-256 `e484f6a414e80a5b531529e006e88b69e4673e0e738694729603a80b81bfb356`. Não confundir com hash anterior ao último ajuste. Nenhum APK release foi gerado/instalado, nenhum firmware foi gravado.

## Dependências: triagem, não eliminação dos avisos

Consulta npm nesta etapa: 44 pacotes sinalizados (27 altos, 17 moderados, zero críticos). São sete raízes de avisos e propagação, não 44 ataques comprovados. Sem `audit fix --force`, downgrade Expo/Firebase, troca de RN ou atualização de lockfile.

| Raiz instalada | Caminho encontrado / alcance observado |
| --- | --- |
| @grpc/grpc-js 1.9.16 | Dependência de @firebase/firestore; fluxo ativo usa Auth, sem import de Firestore encontrado. |
| braces 3.0.3 | micromatch, ferramentas de arquivos/build. |
| image-size 1.2.1 | Metro, análise de assets no build. Correção consultada na linha 2.0.4 exige revisar compatibilidade, não forçar override major. |
| node-forge 1.4.0 | CLI/certificados Expo; última versão consultada ainda 1.4.0. |
| postcss 8.4.49 | @expo/metro-config pede ~8.4.32; versão consultada 8.5.30, fora dessa faixa. Avaliar override isolado antes de alterar. |
| sprintf-js 1.0.3 | argparse da instrumentação de cobertura; última versão consultada 1.1.3, ainda na faixa do aviso. |
| uuid 7.0.3 e cópia do ngrok | Xcode/ngrok de desenvolvimento; aviso envolve APIs v3/v5/v6 com buffer, não qualquer chamada UUID. |

Mapa de produção gerado: 875 fontes, nenhuma fonte dos sete caminhos de módulos acima. Ionicons, fonte TTF e código Google/Firebase presentes. Isso limita o alcance demonstrado no JavaScript embarcado; NÃO elimina risco de build/cadeia de suprimentos, nem audita dependências Android/nativas. Manter ferramentas/servidor de desenvolvimento restritos, usar entradas confiáveis e tratar atualizações em uma rodada compatível separada. Não declarar audit zero, segurança total ou pendência resolvida.

## Assinatura e backup

- APK preservado: `.expo/escolta-instalado-antes.apk`, 147568857 bytes; SHA-256 do arquivo `EC9810B0CB8B1F6B8F177AFB80215F968BDC3A00A351CB33DC6369DAA75D3D35`.
- Certificado público desse APK reconferido: SHA-256 `34f8ddb808fac6d1eba6f3086ab8d86615270467831be74eaedade9a6a70c705`.
- Certificado local debug/teste: SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. Diferente; não atualizar o pacote oficial com essa chave, não desinstalar para contornar.
- Não há bundle `assets/index.android.bundle`/HBC encontrado no APK preservado. Ele sozinho não congela o código servido pelo Metro, nem guarda histórico, preferências ou sessão. Antes de promoção, preservar também fontes/lock/configuração da referência e exportações de dados permitidas, sem copiar contas entre UIDs.
- Responsável confirmou acesso à conta Expo/EAS. CLI em cache conseguiu consultar a conta e o projeto configurado, ID `be41ccc5-f32b-428e-9974-91dffc0fed45`, com sucesso. Nenhuma credencial foi criada, substituída, baixada ou apagada; assinatura original ainda não recuperada. Não confundir acesso à conta com prova de que a chave remota corresponde ao APK.
- Cadastro Firebase Android oficial precisa corresponder ao pacote e certificado efetivos. Não reaproveitar automaticamente o registro `.teste` ou supor que Firebase do APK antigo foi alterado.

Consulta posterior do certificado remoto: `eas credentials --platform android`, perfil development, exibiu credencial existente para `com.nicolasvmen.escoltaunitau`, configuração padrão `Build Credentials A632cnQN2k`, JKS. SHA-256 público `34f8ddb808fac6d1eba6f3086ab8d86615270467831be74eaedade9a6a70c705`, SHA-1 `02838290c62302cbe91e63ec7325fbcd20305987`: correspondem ao APK antigo preservado. Portanto, credencial original localizada no EAS e compatibilidade do certificado confirmada. Não exportado arquivo de keystore/credentials.json, não exibidas senhas, nenhuma opção de criação/alteração/remoção escolhida. Consulta cancelada no menu de ações (saída 1 por Ctrl+C, não falha de validação). Isso não significa que um novo APK já foi assinado ou que o Firebase oficial já cadastrou esse certificado.

O painel informa ausência de chaves FCM/submissão; isso não é tratado como falha das notificações locais já existentes. Não criar serviço de push ou conta de publicação para resolver um requisito inexistente.

## Próximos passos e bloqueios reais

1. Certificado original localizado e comparado; usar a credencial correspondente quando chegar à assinatura oficial, sem criar chave nova. Não enviar senhas/keystore no chat ou Git. Preservar fontes/dados de referência e conferir configuração Firebase antes da promoção.
2. Reparar e testar botão; coletar somente referências essenciais 2/5 m com +4 dBm, revisar uma política coerente de sinal/metros/estados e confirmação próxima. Não mudar limiar só para fazer a tela parecer calibrada.
3. Regressão curta após essa alteração: verde silencioso, amarelo lento, vermelho retido, recusa de confirmação distante e recuperação válida; segundo plano. Autonomia/avisos baixos permanecem ensaios de uso supervisionado.
4. Gerar candidato independente com `./tools/build-android.ps1 -Target StandaloneApk -TestApp` quando chegar essa etapa. Conferir APK/certificado e executar sem Metro. Esse candidato ainda usa chave de teste, ARM64 e pacote separado; não é distribuição oficial.
5. Só depois promover mudanças aprovadas com opt-in explícito, assinatura correta, versionCode adequado, Firebase e manifesto release oficial revisados. O overlay candidato não é automaticamente aplicado à oficial. Não usar o perfil EAS preview atual como atalho para essa promoção.

## Referências primárias

- React Native, bundle e assinatura Android: https://reactnative.dev/docs/signed-apk-android
- Expo, variantes lado a lado: https://docs.expo.dev/build-reference/variants/
- Expo, credenciais e preservação da chave: https://docs.expo.dev/app-signing/app-credentials/
- Avisos de origem: GHSA-m9gg-hp2v-232j, GHSA-f596-whhp-79r4, GHSA-vfj7-8cjw-p6xm, GHSA-5p2g-fcmc-qvqq, GHSA-w3rx-r6r6-pgpr, GHSA-86w9-cpqp-85rv, GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849, GHSA-hp3w-g68c-fv3c, GHSA-w5hq-g745-h8pq, retornados pela consulta npm. Contagens não substituem análise de alcance.
