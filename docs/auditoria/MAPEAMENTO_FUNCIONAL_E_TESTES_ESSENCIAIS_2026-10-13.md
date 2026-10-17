# Estrutura real e redução da validação manual — 13/10/2026

## Escopo e limite da conclusão

Inspecionados o ponto de entrada, telas montadas, handlers, serviços, armazenamento,
ponte Android e firmware salvo da XIAO. Esta revisão não altera comportamento do
aplicativo, firmware, autenticação, projeto remoto ou instalação do celular.
Confere o código atual da pasta; não presume que todo APK antigo contenha esses
mesmos recursos. Identificar APK/bundle continua obrigatório antes de comparar.

Não existe um servidor próprio de monitoramento/REST no projeto examinado.
Metro entrega código durante desenvolvimento; não é o backend de proteção.
As integrações efetivas são Firebase Authentication, Bluetooth/firmware,
serviços nativos do Android, AsyncStorage e EmailJS.

## Tela → ação → processamento/destino

| Parte acessível | Caminho real | Destino / resposta | Limite do teste local |
|---|---|---|---|
| Login Google | AuthScreen → googleAuth → EscoltaAuth nativo → signInWithCredential | Credential Manager entrega token; Firebase valida; onAuthStateChanged abre a aplicação | Validação de token/erros simulada; seletor, certificado e autenticação reais não são comprovados pelo mock |
| E-mail/senha/cadastro/recuperação | AuthScreen → SDK Firebase | Conta/sessão no projeto escolta-unitau; recuperação é mensagem do Firebase | Regras locais de entrada aprovadas; serviço remoto e e-mail de recuperação precisam de ensaio real |
| Perfil responsável/criança | SettingsScreen → accountStorage | AsyncStorage por UID; assinantes atualizam Central, iniciais e nome nos alertas | Serialização/isolamento testados em armazenamento simulado; associação das telas à sessão real permanece manual |
| Central / PROCURAR AGORA | useEsp32Monitor → blePermissions → bleApi | ESCOLTA_BLE, conexão GATT, Notify JSON, RSSI do celular escrito na placa | Cancelamento/timeouts/callbacks testados com BLE simulado; rádio e firmware gravado não são simulador |
| Proximidade | celular lê RSSI → CHAR_RSSI_UUID → firmware → CHAR_STATUS_UUID → parser/hook/Central | estado, estimativa, panico, bateria e energia | Fórmula/filtros/replay verificados; ambiente, caixa e orientação exigem medição física |
| CONFIRMAR SEGURANÇA | hook → CHAR_RESET_UUID, texto reset | Aguarda telemetria panico_ativo=false e estado=seguro; sem vínculo informa falta de cobertura | Rejeição/confirmação lógica testadas; botão, som e resposta GATT reais ficam manuais |
| Colocar Sentinela em espera / Retomar proteção | Settings → hook → CHAR_CONTROLE_UUID | pausar/retomar; aguarda monitoramento_ativo correspondente | Contratos e resposta simulada conferidos; desarme real/retomada da placa continuam manuais |
| Conexão automática | preferências → efeito de reconexão do hook | tentativas periódicas (referência atual: 8 s), serviços/alertas coordenados | Lógica verificada; retomada real depende de rádio/Android |
| Alertas de emergência / Vibração | preferências → hook + service Android + expo-notifications | Notificação é distinta de sirene; vibração segue opção; fallback se áudio nativo não confirmado | Fixtures não reproduzem suspensão do Samsung, volume nem vibração física |
| Verificar prontidão | snapshot real do monitor + Android/Expo | lista de checks e ações reais abaixo | Precisão dos estados do snapshot é distinta de aprovação física |
| Testar notificação | showDiagnosticNotification | Aviso visual do Android, sem emergência | Canal/configuração testados; apresentação visual depende do aparelho |
| Testar sirene | testarAlertaLocal | áudio local + vibração opcional por cerca de 2,5 s, sem e-mail | É ação real acessível e estava insuficientemente representada na ficha anterior |
| Executar novamente / Compartilhar relatório técnico / Revisar bateria e segundo plano | diagnostics → consultas / Share / Linking.sendIntent | Atualiza checks; abre folha de compartilhamento; abre ajustes Android | Folhas/retorno entre apps exigem uso real; não são novos servidores |
| Registros | histórico do hook → AlertsScreen | ocorrência local; prévia e Share; limpeza com confirmação | Limpeza/serialização lógica testadas; exportação/retorno visual manual sem apagar histórico |
| Tema / Reduzir animações / Restaurar preferências | AppPreferencesContext + telas | Persistência por conta; estado visual; reset só das preferências | Renderização e retorno visual ficam numa passagem curta; não confundir reset com apagar dados |
| Ensaio de proximidade | Settings → ProximityTrialModal → subscribeProximityTelemetry | 10 s estabilização + 30 leituras novas; incompletos explícitos; CSV via Share | Contagem, frescor, estatística e escape CSV testados; Notify real, ciclo de tela e exportação precisam de integração |
| E-mail para alertas | Settings/testEmail ou emergência do hook → emergencyEmail | POST direto no EmailJS; parâmetros to_email/message/child_name | Mock prova payload/erro HTTP, não configuração do template/serviço nem entrega real |
| Compartilhar localização deste celular | opção salva; só emergência com canSendEmergencyEmail=true chama getResponsiblePhoneLocation | Solicita localização nesse momento, insere posição do celular na mensagem, timeout/fallback | Ligar o switch NÃO pede permissão imediatamente. Ficha anterior era genérica nesse ponto |
| Protocolo | ManualScreen | conteúdo informativo, sem chamada a backend | Conferido em fonte; não criar 20 testes manuais para texto estático |

## Conferência frontend ↔ firmware

Nome `ESCOLTA_BLE`; serviço `e5c1f4a0-1234-4b5c-9abc-def012345678`.
Os cinco identificadores de características terminam em a1 (status), a2 (som),
a3 (reset), a4 (RSSI) e a5 (controle), correspondentes nos dois arquivos.
Firmware publica Notify/read de status e aceita write para comandos.
Frontend escreve RSSI, reset e pausar/retomar e valida confirmação pelo status.

`rssi`, `estado` e `panico_ativo` obrigatórios são emitidos e aceitos no parser;
`monitoramento_ativo`, `som_on`, `fw`, bateria/USB/carga e estimativa também
correspondem. Mensagens de referência dos quatro estados foram aceitas pelo
parser real e conferidas dentro de 244 bytes. Isso não substitui compilação
integral de ArduinoString/nRF nem prova que a placa instalada tem esse firmware.

## Fora da ficha do usuário

- `PatrolScreen.tsx` / antigo Modo Laboratório: arquivo existe, mas App.tsx não o
  importa/monta. A função vigente acessível é ProximityTrialModal.
- `toggleSomBle` / característica som: serviço preservado, sem controle de som
  correspondente nas telas montadas. Não pedir ao usuário apertar botão inexistente.
- `modo_casa`, `keepScreenAwake`, `informationalSounds` e
  `attentionAlertsToContacts`: campos antigos/preparados; não são opções atuais
  expostas com efeito operacional confirmado nessas telas.
- GPS na criança, mapa/rastreamento em tempo real, Firestore de perfis, backend
  próprio de envio, múltiplas crianças e iOS: não inventar funcionalidade/teste.
- Área acadêmica habilitada por cinco toques na versão: conteúdo informativo,
  não é a antiga rota de laboratório nem um backend adicional. Não gera ensaio
  manual independente só para visualizar identificação/textos estáticos.
- Certificados, migração entre projetos, APK final independente de Metro e pacote
  oficial: pendências técnicas minhas para a entrega, não tarefas manuais genéricas
  a executar no app hoje. Google real OK no teste não aprova outro pacote/certificado.
- Apagar histórico, realizar chamadas 190/192, forçar falhas de payload/callback,
  criar conflitos de vinculação de contas, testar todo tipo de Android/telefone:
  não exigir na passagem manual enxuta. Conteúdo/handlers podem ser conferidos
  localmente; chamada real de emergência não deve ser feita para ensaio.
- Autonomia/descarga natural, fone/DND/economia agressiva e mecânica completa:
  ensaios físicos/condicionais separados quando relevantes, não certificados
  automaticamente nem incluídos como trabalho rotineiro repetitivo desta ficha.

## O que foi comprovado localmente nesta revisão

TypeScript aprovado. `npm test`: **85 testes aprovados**, zero falhas/pulos/TODO.
Inclui cinco testes novos em `tools/test-app-contracts.cjs`: UUID/nome,
comandos/confirmação, JSON/parser, rotas/recursos reais e caminho de e-mail/localização.
São contratos em fonte e exemplos, não testes de interface nativa.

**33 static_assert C++ aprovados** com compilador instalado em
`C:/Users/Nicolas Venciguerra/AppData/Local/Arduino15/packages/Seeeduino/tools/arm-none-eabi-gcc/7-2017q4/bin/arm-none-eabi-g++.exe`,
`-std=c++14 -Wall -Wextra -pedantic -fsyntax-only tools/test-proximity-signal.cpp`.
Verificam sinal/filtros/temporização/buzzer, fórmula/replay e frescor; sem gravar
na placa. O script padrão procurou por LocalApplicationData redirecionado e
não achou; o caminho real foi localizado. O executável precisou rodar fora
da restrição do ambiente para evitar erro de realocação de DLL. Não houve
instalação, substituição de compilador ou alteração de ambiente permanente.

Regras locais que deixam de ser tarefas manuais repetidas: formato de e-mail,
senha/confirmação, normalização, rejeição de tokens vazios, seleção de projeto,
serialização/isolamento de chaves, payload inválido, callback antigo, timeouts,
contagem/estatística/frescor do ensaio, escape de CSV, fórmula e histerese numérica.
Validação local não é certeza irrestrita sobre SDK real, firmware gravado ou
Android; os pontos de integração correspondentes continuam na ficha enxuta.

## Uso da nova ficha

Usar somente `Ficha_Testes_Escolta_ESSENCIAL.docx` ou `.xlsx` para o próximo passe.
Ela substitui os 99 casos genéricos e evita repetir a matriz de 24 combinações
como se cada situação exigisse um teste completo independente.
Os testes de som/perda preservam contextos visível, minimizado e bloqueado.
E-mail/localização são executados apenas com recurso em uso e contato próprio.
Não repetir entrada Google básica na mesma build/conta já relatada como OK.
Novo pacote/certificado exige confirmação adicional, registrada em pendência
técnica, não copiada como aprovação do app oficial.

A ficha gerada contém **24 roteiros manuais de integração e 3 condicionais** de
e-mail/localização. O Testar sirene foi incluído com sua confirmação e término
automático. Os casos de localização foram corrigidos para o momento real do
pedido; Enviar e-mail de teste não exige ligar avisos automáticos. Google básico
já validado não é caso isolado repetido; reentrada no roteiro só recupera sessão
após teste de logout/cancelamento.

Foram comparados hashes SHA-256 de **45 arquivos** de App/configuração,
src, módulos Android e firmware antes/depois da preparação da ficha: nenhuma
mudança. Alterações desta revisão se restringiram a documentos, gerador e testes
automatizados/runner. Word/Excel foram reabertos e conferidos: 27 roteiros,
campos de resultado vazios e links para procedimentos. Arquivos antigos foram
preservados. Não houve instalação de APK, envio real de e-mail, autenticação
real por ferramenta, alteração de permissão ou gravação na placa.
