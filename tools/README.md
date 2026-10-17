# Ferramentas do projeto

Execute comandos a partir da raiz do projeto. Não executar geradores em lote.

## Ferramentas internas do aplicativo

Ensaios, diagnóstico, simulação W1 e disparos manuais de teste ficam desligados por padrão.
Para reativar, somente no cliente de desenvolvimento Escolta Teste, definir
`EXPO_PUBLIC_ENABLE_INTERNAL_TOOLS=true` na configuração local e reiniciar o Expo
com a Sentinela em espera. Remover/voltar a false ao terminar. A opção é ignorada
em qualquer APK release e na identidade oficial; não existe menu secreto na versão
de uso. Procedimento e limites em
`docs/auditoria/INTERFACE_DE_USO_APK_2026-10-17.md`.

## Verificações sem acionar hardware

- `npm run typecheck`: tipagem do app.
- `npm test`: testes JS com gate estrito; falha também enquanto houver TODO.
- `./tools/test-proximity-signal.ps1`: 33 verificações C++ dos cabeçalhos reais,
  usando o compilador Seeed já instalado. Não grava na placa.
- `npm run audit:catalog`: catálogo por arquivo, sintaxe JS/TS e referências.
- `npm run audit:inventory`: inventário com SHA-256, somente leitura.
- `npm run audit:dependencies`: consulta npm, sem instalar/atualizar pacotes.

## Auditoria

`auditoria/verificar_arquivos.py --save` verifica formatos, imagens, ZIP/XML,
PDFs e sintaxe Python. Exige Pillow, pypdf e pypdfium2; usar um ambiente que
já tenha essas bibliotecas.

`auditoria/verificar_cad.py` regenera cópias em `.expo/auditoria-cad`, compara
geometrias com o kit atual e verifica interferência do fechamento. Não altera
os STL entregáveis. Exige o OpenSCAD portátil já existente.

`auditoria/organizar_documentacao.cjs` descreve cinco movimentos fixos de
relatórios/imagens. `--apply` move somente esses alvos, valida SHA-256 e não
sobrescreve destinos. Foi executado uma vez nesta auditoria e é idempotente.

## Outros utilitários

- `test-monitor-alerts.cjs`: hook real com React/BLE/áudio simulados; sem rede.
- `test-ble-recovery.cjs`: cancelamento, timeout RSSI, sessão antiga e confirmação de comandos.
- `test-account-storage.cjs`: isolamento por conta, migração e ordem de gravação.
- `test-native-alert-bridge.cjs`: confirmação de áudio, fallback e respostas tardias; não compila Kotlin.
- `test-notifications.cjs`: canais de bateria com e sem vibração.
- `test-proximity-ble.cjs`: transporte BLE simulado e observação dos ensaios.
- `test-proximity-distance.cjs`: ajuste/replay numérico e fixture experimental.
- `calibrar-distancia-radio4.cjs`: reproduz o ajuste D1 de 12 ensaios/360 amostras,
  sem escrever parâmetros nem gravar a placa. `test-distance-radio4-d1.cjs/.cpp`
  verificam a variante isolada e os limites preservados. Roteiro físico em
  `docs/testes/CALIBRACAO_DISTANCIA_RADIO4_D1_2026-10-15.md`.
- `test-proximity-trial.cjs`: coleta, validade, estatística e CSV.
- `test-proximity-export.cjs`: resumo/detalhado, escopo, arquivo grande, transporte
  por URI, cancelamento, falhas e concorrência; não comprova o seletor físico.
- `test-proximity-signal.cpp`: verificações em tempo de compilação C++.
- `build-android.ps1`: valida Kotlin (`-Target Validate`) ou gera development APK
  ARM64 (`-Target Apk`). Não instala; usa temporários curtos e restaura o ambiente.
  Padrão offline; `-Online` permite buscar dependências que faltarem no cache.
  `-TestApp` gera `com.nicolasvmen.escoltaunitau.teste`, com nome e links separados,
  preservando o aplicativo atual. Validate verifica também o módulo `escolta-auth`.
  `-Target ValidateStandalone -TestApp` valida bundle de produção, manifesto e
  Kotlin sem gerar APK. `-Target StandaloneApk -TestApp` gera depois o candidato
  ARM64 sem Metro, ainda com pacote/chave de teste; não instala nem promove.
  Esses alvos verificam Firebase/cliente Google e artefatos; não provam execução
  no aparelho ou cadastro remoto do certificado. Ambos exigem `-TestApp`.
- `auditoria/verificar_candidato_android.cjs`: inspeção somente leitura do
  manifesto/bundle de release, Google público e flag do monitor corrigido.
- `test-standalone-build.cjs` e `test-native-identity.cjs`: isolamento do candidato,
  guards de geração e separação entre identidade e ativação de correções.
  `escoltaValidatedMonitor=true` é opt-in para a futura oficial, não autorização
  de promoção. Não usar com assinatura debug como substituto da chave original.
  O teste já ativa as correções; o padrão oficial permanece inalterado.
- `test-auth-email.cjs`: validação de cadastro, ponte Google simulada, consentimento
  do canal de e-mail, resposta HTTP e plugin de build paralela. Não acessa contas reais.
- `cicted/`: geração, revisão e anonimização de documentos; podem sobrescrever saídas.
- `diagramas/`: geração de imagens do circuito, não código eletrônico executável.

Os scripts de banner permanecem junto aos artefatos para preservar seus
caminhos relativos; ver `docs/cicted/banner/README.md`.

Para registrar nova consulta de dependências sem sobrescrever a evidência de
07/10: `node tools/auditoria/verificar_dependencias.cjs --save-as=dependencias_2026-10-09.json`.
