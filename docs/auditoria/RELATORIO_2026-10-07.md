# Auditoria do Escolta UNITAU — 07/10/2026

## Conclusão

O aplicativo, o firmware XIAO e a caixa têm uma estrutura identificável e
reproduzível, mas **não é correto afirmar que todo o código está sem erros**.
Foram reproduzidas três falhas em simulação e encontrados outros riscos
na leitura estática. Recomendo corrigir os bloqueadores abaixo antes da
bateria física de testes e do APK standalone.

Nenhuma regra de alarme, fonte de firmware, geometria de impressão ou código
de produção do app foi alterado nesta auditoria. Foram acrescentados testes,
ferramentas, índices e relatórios; cinco documentos/imagens foram movidos sem
alterar seus bytes. Não houve flash, instalação de APK, envio de e-mail,
alteração de conta/cloud, commit ou push durante esta etapa.

## Escopo e honestidade da verificação

- Inventário inicial: **389 arquivos próprios/artefatos locais**, com SHA-256.
- Leitura funcional do caminho ativo: entrada React, telas, contexto,
  serviços, hook, utilitário de ensaio, módulo Kotlin, firmware XIAO, cabeçalhos
  de filtro/distância, fonte CAD atual e configuração de compilação.
- Firmware ESP32 identificado e lido como legado, não testado em placa ESP32.
- Utilitários acadêmicos: sintaxe/estrutura e dependências de caminhos;
  não foram executados os geradores que poderiam sobrescrever entregas.
- DOCX/PPTX/ZIP: CRC e XML; imagens: decodificação/verificação; PDFs:
  leitura e renderização de todas as páginas em baixa resolução.
- Não houve releitura acadêmica integral de todos os TCCs/resumos antigos,
  atualização normativa ABNT ou inspeção visual pixel a pixel de cada banner.
- Dependências de terceiros, caches, `.git`, binários de ferramentas e
  diretórios gerados volumosos ficaram fora da leitura manual linha a linha.
  A árvore npm foi consultada; não foi auditado o código de cada dependência.

“Tudo” aqui está separado em fonte ativa, histórico, dependências e artefatos.
Um arquivo constar no catálogo não significa que seu conteúdo científico ou
comportamento físico tenha sido certificado.

## Resultados executados

| Verificação | Resultado |
|---|---|
| TypeScript `tsc --noEmit` | Aprovado |
| Testes JS já existentes | 21 aprovados |
| Novas regressões de auditoria | 3 reproduzidas, marcadas TODO; ainda não corrigidas |
| `npm test` após criação do gate | Deve falhar enquanto esses TODO existirem; isso é deliberado |
| Cabeçalhos C++ reais | 33 verificações em tempo de compilação aprovadas |
| Compilação completa XIAO | Aprovada: 332.320 bytes de programa (40%); 70.024 bytes globais (29%) |
| Exportação Android JavaScript/Hermes | Aprovada: 854 módulos, bundle de aproximadamente 3 MB |
| Autolinking do módulo Kotlin | Módulo `escolta-sentinela` descoberto corretamente |
| Compilação Kotlin/Gradle | **Não confirmada**: ambiente falhou em `Unable to establish loopback connection` antes da compilação |
| Compatibilidade Expo offline | Check superficial passou, mas não detectou o conflito de peer dependency abaixo |
| `npm ls --all --json` | Falhou: plugin BLE 7.0.0 exige Expo ^49; instalado Expo 54.0.35 |
| `npm audit` | 56 pacotes sinalizados: 1 baixo, 15 moderados, 39 altos, 1 crítico |
| Integridade de formatos | Rodada final: 298 arquivos verificados, nenhum erro; 18 PDFs lidos e renderizados |
| Sintaxe/referências | 29 fontes JS/TS, 104 imports e links locais sem erros detectados; 2 scripts PowerShell sem erros de parser |
| Quatro STL atuais | Fechados, uma malha conectada cada, sem arestas inválidas/triângulos degenerados |
| CAD → entregáveis | Os quatro exports regenerados têm a mesma geometria dos quatro STL atuais |
| Fechamento CAD | Interseção volumétrica base/tampa vazia |
| Apoio/furo do botão | Furo 4,8 mm; haste 4,2 mm; abas 1,8 mm; folga em repouso 0,5 mm |
| Testes no celular/caixinha nesta etapa | Não executados |

Falhas iniciais de execução por permissões nos temporários (Hermes/OpenSCAD)
foram contornadas com execução autorizada; as verificações então passaram.
As tentativas Gradle, inclusive sem daemon persistente, não avançaram devido
ao erro de loopback. Isso não confirma erro Kotlin nem comprova compilação.

## Bloqueadores e correções recomendadas

### A01 — P1: notificações desligadas podem silenciar sirene crítica

Evidência: `useEsp32Monitor.ts`, caminho de pânico por telemetria, linhas
578–594; `EscoltaSentinelaService.kt`, `armEmergency`, linhas 165–191.

O hook passa `notificationsEnabled` como `alertsEnabled`. O Kotlin só chama
`startNativeAlarm` quando esse valor é verdadeiro. A ponte retorna sucesso
porque o comando foi enviado, e o fallback JS não toca. A interface, porém,
diz que desligar notificações não desliga a sirene crítica.

**Reprodução:** primeiro teste AUDITORIA em `tools/test-monitor-alerts.cjs`.
**Correção:** separar permissão/preferência de notificação do áudio crítico,
com uma política consistente nos caminhos botão, RSSI e desconexão.

### A02 — P1: perda BLE sem início do serviço nativo não tem fallback garantido

Evidência: `useEsp32Monitor.ts`, linhas 747–773; ponte `backgroundSentinel.ts`.

Na perda BLE, o retorno `false`/erro de `armBackgroundEmergency` é ignorado.
Depois de 5 s o hook assume que a saída nativa foi tratada, se notificações
estiverem habilitadas, e pula o áudio local. Pode ficar vermelho sem sirene.
O caminho de botão já tem um fallback, mas o de perda não tem a mesma regra.

**Reprodução:** segundo teste AUDITORIA, módulo nativo simulado indisponível.
**Correção:** guardar resultado/estado real do alarme nativo e ativar fallback
quando necessário; evitar também tocar dois alarmes simultâneos.

### A03 — P1: conexão não significa telemetria/RSSI válidos

Evidência: `bleApi.ts`, loop de RSSI; `useEsp32Monitor.ts`, conexão e
cancelamento da tolerância antes da primeira telemetria; `DashboardScreen.tsx`
usa `essentialReady = conectado && soundReady && autoConnect`.

O código oculta a distância quando a atualização envelhece, mas não tem
watchdog completo de saúde do fluxo. Uma leitura/escrita RSSI que não termina
pode deixar `readingRssi` travado. O BLE pode continuar conectado e os status
continuarem chegando com RSSI antigo. A XIAO retorna distância nula quando
falta RSSI recente, mas preserva o estado anterior; não declara por si só uma
falha técnica de RSSI. A tela pode continuar sugerindo proteção.

**Correção:** timeout/cancelamento das operações, validade separada de
telemetria e de RSSI, estado explícito de falha técnica e recuperação. Não
transformar automaticamente ausência de dados em uma distância inventada.
Leitura estática; falta teste de injeção controlada e ensaio físico.

### A04 — P1: corrida entre timeout, desconexão e conexão em andamento

Evidência: `bleApi.ts`, `startConnection`, `scanTimeout`, `onDisconnected`
e `disconnectBle`, linhas 110–275.

O timeout continua ativo enquanto `connect`/MTU/discovery aguardam. Após a
Promise rejeitar, o callback assíncrono ainda pode finalizar e publicar uma
conexão. `disconnectBle` não cancela todas as etapas pendentes. Um listener
antigo também limpa o dispositivo global sem verificar se é a conexão atual.

**Correção:** geração/identidade de sessão, cancelamento explícito, checagem
após cada `await`, separar timeout de scan do de conexão e remover listeners.
Risco por leitura estática; ainda não reproduzido em aparelho.

### A05 — P1: JSON sintaticamente válido não é telemetria válida

Evidência: `bleApi.ts:160` faz apenas `JSON.parse(...) as Esp32Status`;
`nivelDoEstado` no hook usa fallback sem validar RSSI. Com RSSI/estado ausentes,
as comparações não passam e o fallback retorna pânico.

**Reprodução:** terceiro teste AUDITORIA com telemetria incompleta.
**Correção:** validar tipos/faixas/campos e estados antes de atualizar o hook;
separar erro de protocolo de afastamento. `modo_casa`/`configurado` estão
declarados obrigatórios no tipo, mas nem são enviados pela XIAO atual.

### A06 — P1: dados locais não são separados por conta

Evidência: chaves globais do perfil, preferências, histórico, intenção e ensaios.

Autenticar outra conta no mesmo telefone não muda automaticamente o namespace
do AsyncStorage. Perfil, contato e eventos anteriores podem reaparecer.
Cadastro também grava o perfil após a autenticação, podendo montar a interface
antes dessa gravação. O nome da criança no hook é lido uma vez e pode ficar
desatualizado após editar o perfil.

**Correção:** namespace por UID com migração cuidadosa dos dados existentes,
estado de perfil compartilhado e tratamento explícito da troca de conta.
Não apagar o histórico do usuário para resolver isso.

### A07 — P1: plugin BLE fora do contrato de dependências

`@config-plugins/react-native-ble-plx@7.0.0` declara Expo `^49`, mas o app usa
54.0.35. `.npmrc` contém `legacy-peer-deps=true`, que permite instalar essa
combinação sem resolver o conflito. O funcionamento do build já instalado
não demonstra que uma geração nativa limpa será compatível.

**Correção:** selecionar e verificar uma combinação compatível, manter lock,
gerar/compilar em ambiente controlado e repetir testes. Não foi feita
atualização automática nesta auditoria.

### A08 — P1: alertas de segurança das dependências exigem triagem

Resultado completo em [dependencias.json](dependencias.json). As 56 entradas
incluem dependências transitivas e propagação entre pacotes; **não são 56
explorações comprovadas no aplicativo**.

A entrada crítica é `shell-quote@1.8.3`, trazida por
`react-native -> react-devtools-core`. Outras entradas incluem ferramentas Expo,
Metro, `node-forge`, `undici` e `ws`. Parte pertence à cadeia de desenvolvimento;
é necessário verificar alcance real, versões corrigidas e compatibilidade.

Não usar `npm audit fix --force` às cegas: o próprio relatório sugere, em
alguns caminhos, Expo 44.0.6, que seria downgrade incompatível com o projeto.
Nenhum pacote foi instalado, atualizado ou removido.

### A09 — P1 para promessa de proteção: serviço nativo não é monitor BLE independente

O serviço possui Handler, MediaPlayer e notificações, mas nenhum BluetoothGatt.
Ele só conhece uma perda de conexão quando o JS o avisa. `START_STICKY`
reinicia o serviço, não os estados voláteis/timers perdidos nem o código JS.

**Correção/limite:** definir e testar claramente o suporte a segundo plano,
morte de processo e reinício. Para uma proteção independente do JS será
necessário projeto nativo de conexão/watchdog/estado persistente, não apenas
mais um texto “Sentinela ativa”. Não implica prometer operação após force-stop.
Ver [Service — Android](https://developer.android.com/reference/android/app/Service).

## Outras pendências importantes

| ID | Prioridade | Evidência e recomendação |
|---|---|---|
| A10 | P2 | EmailJS usa `fetch` sem `response.ok` nem timeout: HTTP 4xx/5xx pode não gerar aviso de falha. Confirmar resultado sem bloquear alarme local. |
| A11 | P2 | `informationalSounds` aparece na UI mas não é aplicado no fluxo ativo; `keepScreenAwake` e `attentionAlertsToContacts` são preferências sem uso. Implementar ou retirar a promessa. |
| A12 | P2 | Histórico usa só HH:mm, sem data explícita; JSON antigo não é validado, escritas não são serializadas e carregamento inicial pode sobrescrever eventos recém-criados. |
| A13 | P2 | `SystemDiagnosticsModal` memoriza props sem `lastUpdate`; diagnostica conexão sem saúde real de telemetria/serviço. Não tratar como certificado de prontidão. |
| A14 | P2 | Notificação Android coloca extra `escolta_destino`, mas não há ponte/handler explícito para levá-lo à aba Central já aberta em outra aba. Testar e ligar navegação. |
| A15 | P2 | A mensagem nativa diz “não foi possível restabelecer vínculo” mesmo se foi botão/sinal com conexão ativa. Transportar motivo correto. |
| A16 | P2 | Notificação de bateria tem vibração própria, não condicionada à preferência geral de vibração. Harmonizar política. |
| A17 | P2 | CSV de ensaio não armazena versão do firmware/modelo/altura estruturados. Acrescentar metadados sem alterar fixtures históricos. |
| A18 | P2 | Reset de alarme recebe confirmação GATT, não confirmação do estado seguro pela telemetria; UI pode parecer normal antes da confirmação remota. |
| A19 | P2 | BLE é selecionado apenas por nome, sem vínculo/identidade autenticada. Login Firebase não protege comandos GATT. Limitação séria para uso além do acadêmico. |
| A20 | P2 | Manifesto local gerado inclui microfone/armazenamento/overlay; app não grava áudio. Revisar permissões mescladas mínimas e política de backup antes de distribuir. |
| A21 | P2 | Compilação nativa ainda não confirmada; revisar assinatura/credenciais e release sem Metro. iOS não foi validado e não tem o serviço nativo Android. |
| A22 | P3 | `tie_detail_view` mostra o berço XIAO sem subtrair `xiao_tie_cut`; a vista isolada pode parecer bloqueada embora o STL final da base tenha o túnel. Corrigir visualização separadamente. |
| A23 | P3 | Comentários/documentos antigos citam canal de trava 1,8 mm e ponte removível; fonte atual usa canal 2,1 mm e berço fixo. Índices agora distinguem histórico. |

P1: corrigir/definir antes de considerar validação de alarme ou APK aprovado.
P2: corrigir/validar antes da distribuição e do relatório final de confiabilidade.
P3: clareza, manutenção e documentação; não é defeito comprovado da montagem atual.

## Distância: o que os dados sustentam

`xiao-p2` separa distância estimada de decisão de alarme. O ajuste usa as
últimas coletas elevadas de 1/3/5/7 m; não mistura as no chão. O replay teve
melhora global modesta, aproximadamente 4,6% no erro médio das mesmas
coletas, e piora em 3 m. Isso **não é validação independente**.

As distribuições de RSSI em 3 e 5 m se sobrepõem; não há fórmula que transforme
esses sinais em metros precisos universalmente. Não usar distância estimada
para declarar que um limiar de alarme equivale exatamente a uma distância real.
Detalhes: [revisão p2](../testes/REVISAO_DISTANCIA_P2.md).

## Organização realizada sem quebrar caminhos de execução

- Fontes do app, módulo, firmware, `.scad`, STL atuais e dependências mantidos.
- Três relatórios CAD movidos para `hardware/case_3d/documentacao/revisoes`.
- Duas imagens CAD movidas para `hardware/case_3d/documentacao/imagens`.
- SHA-256 dos cinco movimentos preservado; ver [movimentos](movimentos.json).
- Novos índices em raiz, docs, tools, caixa, CICTED e banners.
- `CICTED/` preservada por ser entrada de scripts e conter arquivos diferentes
  dos homônimos em `docs/cicted/banner/impressao`; não houve fusão ou exclusão.
- Cópias idênticas identificadas, não apagadas. Os dois WAV são duplicação
  intencional para áudio JS/nativo. Versões STL iguais podem ser reutilização válida.
- Nenhum gerador acadêmico foi rodado sobre entregas. Caminhos antigos de
  Downloads e ferramentas locais estão documentados, não “corrigidos” por palpite.
- Scripts npm de tipagem, testes estritos, inventário e catálogo adicionados.

O worktree já tinha alterações antes da auditoria. Não houve reset, limpeza,
commit ou envio ao GitHub; esse estado foi preservado.

Conferência final por hash dos 389 originais: 385 preservados byte a byte,
incluindo os cinco movidos; quatro edições esperadas (`README.md`,
`docs/README.md`, `package.json` e o teste do hook). Nenhuma ausência nem
edição inesperada foi encontrada. O catálogo final tem 400 arquivos fora da
própria pasta de resultados de auditoria.

## Próximo passo

1. Corrigir A01/A02/A05 e transformar os três TODO em regressões aprovadas.
2. Tratar validade de RSSI/telemetria, cancelamento BLE e isolamento de perfil.
3. Resolver compatibilidade/segurança de dependências e confirmar build nativo.
4. Executar [plano de testes](PLANO_TESTES.md) com a caixinha fechada.
5. Gerar APK interno standalone e repetir cenários críticos sem Metro.

Mapa: [arquitetura](ARQUITETURA.md). Lista individual:
[catálogo](CATALOGO_ARQUIVOS.md). Evidências mecânicas: [cad.json](cad.json).
Integridade de formatos: [integridade.json](integridade.json).
Preservação dos originais: [preservacao.json](preservacao.json).
