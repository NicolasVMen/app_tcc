# Interface de uso e isolamento das ferramentas internas

## Solicitação e limites

Usuário solicitou APK com apresentação de uso, sem convites para executar testes ou avisos de versão não final. Confirmou Sentinela em espera antes das alterações: “pronto, está em espera”.

Esta etapa muda apresentação e acesso a ferramentas internas, não promove automaticamente a candidata nem certifica segurança. Autonomia integral, descarga/bateria baixa real e reparo/teste do botão físico continuam pendentes. Limitações técnicas não foram apagadas para sugerir precisão ou confiabilidade não medidas.

## O que ficou fora do uso normal

- Verificação de prontidão e seus botões de sirene/notificação.
- Ensaio de proximidade, coleta e exportação CSV dos ensaios. A tela não é montada na raiz quando ferramentas estão desligadas; não cria assinaturas de telemetria ou leitura do histórico por trás da interface.
- Simulação manual W1 e adiamento temporário da recuperação de RSSI.
- Envio manual de e-mail de teste.
- Área acadêmica liberada por cinco toques: gesto inerte em uso normal, inclusive com estado de tela antigo em memória.
- Canal de notificações de diagnóstico deixa de ser criado com ferramentas desligadas; eventual canal antigo já criado pelo Android não é apagado nesta alteração.

Código, testes automatizados e dados dos ensaios foram preservados. Não apagar histórico de ocorrências para remover textos antigos: ocorrências já gravadas permanecem como evidência histórica; novas mensagens usam a redação atual.

## Redação de uso

Login, cabeçalho, rodapé, Central, Protocolo, relatório de ocorrências, erros de autenticação, aviso por e-mail e erro de ícones foram revisados. Retirados rótulos como “versão para validação”, “não é a versão final”, selo “protótipo acadêmico” e orientação para servidor de desenvolvimento nos fluxos normais. O erro de firmware incompatível pede atualização da placa sem direcionar o usuário a uma versão de teste.

Mantidos: distância **estimada**, influência de obstáculos/corpo/ambiente, supervisão do responsável, confirmação de segurança presencial com placa próxima, localização **do celular**, consentimento do contato, necessidade de internet e ausência de garantia de entrega de e-mail. Cadastro e ativação de alertas por e-mail continuam disponíveis; somente o disparo manual de teste está oculto.

O pacote paralelo mantém nome/identidade **Escolta Teste** para não confundir instalações e assinaturas durante a entrega. A identidade oficial continua **Escolta UNITAU**. Não trocar pacote, cliente Firebase, namespace de dados, UUID, tag do firmware ou assinatura só para esconder a palavra “teste”. Remover os selos de fase de desenvolvimento não é promover a instalação paralela.

## Como reativar ferramentas no desenvolvimento

1. Colocar a Sentinela em espera e confirmar silêncio antes de atualizar o código/servidor.
2. Na configuração local de desenvolvimento (`.env.local`), definir a variável pública não secreta:

   ```dotenv
   EXPO_PUBLIC_ENABLE_INTERNAL_TOOLS=true
   ```

3. Reiniciar o Expo do projeto e abrir o cliente de desenvolvimento **Escolta Teste**. Ensaios e diagnóstico voltam a aparecer em Sistema. A simulação W1 ainda exige início manual, firmware exato e status seguro/fresco/ativo.
4. Ao terminar, voltar a `false` (ou remover a variável) e reiniciar o servidor ainda em espera.

`INTERNAL_TOOLS_ENABLED` exige simultaneamente `__DEV__`, identidade nativa Teste e valor literal `true`. Ausente, vazio, `false`, `TRUE` ou `1` ficam desligados. Qualquer APK release mantém ferramentas bloqueadas **mesmo que a variável seja true**. Não há gesto ou preferência de usuário capaz de habilitar esses controles na release. O perfil EAS `oficial-validada` e a rotina local standalone também fixam a variável em `false`; a rotina restaura o ambiente do processo ao terminar.

## Verificações

- **200 testes Node passaram**, sem falhas, skips ou TODO; TypeScript sem erros.
- SettingsScreen real renderizado em árvore JSX simulada: ferramentas ausentes com flag desligada, inclusive com estado interno antigo; perfil, preferências, cadastro de e-mail e conta preservados. Opt-in mantém controles acessíveis no desenvolvimento.
- Matriz da identidade testa release/oficial/dev, opt-in ausente/incorreto e opt-in explícito.
- Notificação e sirene manuais recusadas quando ferramentas estão desligadas; emergência real continua solicitando sirene. Canais de emergência e bateria preservados.
- `.ino`, `ProximitySignal.h`, `ProximityDistance.h` e `CommunicationWatchdog.h` comparados por SHA-256 com `RASTREABILIDADE_APOS_CORRECOES_2026-10-17.json`: idênticos. Nenhum firmware foi gravado nesta etapa.
- Validação Android dos intermediários de produção aprovada: `BUILD SUCCESSFUL` em 1 min 24 s, 102 tarefas (2 executadas). Manifesto/bundle/Kotlin e configuração cliente Firebase/Google aprovados pelo verificador; bundle de 2.063.796 bytes, SHA-256 `91a33bebae0e1020676c84bee7e2db1674b6d4518d4d872ebca4541a3e1c0abe`. Nenhum APK gerado/instalado. Isso não aprova execução standalone, assinatura final ou cadastro remoto Firebase.
- Inventário posterior: 34 fontes, 33 alcançáveis, nenhuma importação local ausente. Teste de gravação cruzando contas permaneceu gravando no proprietário de origem.

## Próximo passo

Conferência visual de desenvolvimento realizada pelo usuário após fechar/abrir em espera: “ficou certinho”, em resposta à verificação de controles internos ausentes e configurações normais preservadas. Isso aprova a apresentação observada, não a instalação standalone ainda pendente. O erro de servidor enviado junto foi tratado separadamente em `CORRECAO_METRO_JTMP_2026-10-17.md`.

Gerar o candidato standalone, validar o arquivo APK final e conferir o fluxo instalado sem Expo. Essa é uma checagem de entrega feita pela equipe; o usuário do aplicativo não precisa executar ensaios para utilizá-lo. Conferir chave original e certificado/cadastro remoto Firebase antes de substituir a oficial. Não alegar que as verificações anteriores em desenvolvimento aprovam automaticamente um APK ainda não gerado.
