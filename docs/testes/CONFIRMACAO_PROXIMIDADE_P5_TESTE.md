# Confirmação sem fabricar proximidade — p5 de teste

Em 13/10/2026, o responsável confirmou o funcionamento do amarelo com vibração breve na entrada e retorno ao verde ao aproximar. Depois confirmou que a emergência por sinal fraco permaneceu até a confirmação, mas identificou que confirmar ainda distante deixava o aplicativo verde.

## Causa

O reset anterior chamava `restaurarEstadoSeguro()`, apagando filtro e leituras e definindo RSSI inicial −50 e estado seguro. O aplicativo também atribuía `nivelSinal='seguro'` depois do comando. A resposta da placa podia, portanto, comprovar apenas que o reset ocorreu, não uma proximidade restabelecida.

## Correção experimental

- Perfil p4 preservado: amarelo −82 dBm, perigo −90 dBm, 4 s de confirmação após filtragem. Fórmula de distância inalterada.
- Placa p5 só aceita reset com vínculo, monitoramento ativo, janela completa, dados recentes, estado seguro confirmado pelo filtro, ausência de transição candidata para alerta e RSSI bruto/filtrado na faixa segura.
- Reset aceito encerra somente o pânico retido: não limpa a mediana/EMA, não inventa RSSI −50 e não reinicia a distância.
- Aplicativo de teste exige identificação `xiao-p5-teste`, vínculo e sinal recente válido antes de escrever reset. Versões anteriores que fabricavam estado seguro não são usadas como comprovação.
- A ponte BLE devolve o status real recebido depois da conclusão da escrita. A confirmação no teste exige pânico desativado, estado seguro e sinal recente válido.
- Antes de encerrar a sirene, o aplicativo confere novamente as leituras. Se a condição mudar durante a resposta/cancelamento, mantém a emergência e aciona o fallback sonoro local.
- O verde vem do estado confirmado, não do clique. A confirmação continua presencial e não pode comprovar a localização real da criança: RSSI indica uma faixa experimental, não uma distância física garantida.

Identificador: `xiao-p5-teste`. Flags de compilação: `-DESCOLTA_TESTE_PROXIMIDADE_4DB=1 -DESCOLTA_TESTE_CONFIRMACAO_PROXIMA=1`.
Sem as flags experimentais, o firmware padrão p2 permanece reproduzível; p3/p4 também permanecem disponíveis. O APK oficial não é instalado nem alterado nesta correção. A placa física continua compartilhada: seu novo reset protegido também se aplica a qualquer cliente BLE que se conectar.

## Verificação

102 testes JavaScript e verificação TypeScript aprovados. 65 verificações C++ passaram: 33 padrão, 12 p3, 12 p4, 8 da guarda de confirmação.
Incluem confirmação distante recusada, dados antigos, firmware antigo, resposta “seguro” com sinal fraco, piora do sinal durante cancelamento, janela incompleta, recuperação real sem apagar filtro e overflow de relógio.
Não constituem validação física independente.

O responsável confirmou a placa em espera antes da implantação. Compilação integral, gravação e teste físico serão registrados conforme concluídos.

## Implantação concluída

Compilação final aprovada para XIAO Sense, com ambas as flags: 332.592 bytes de programa (41%) e 70.024 bytes de variáveis globais (29%). O binário contém `xiao-p5-teste`. A guarda também verifica o último RSSI recebido, incluindo uma leitura fraca ainda pendente de processamento.
SHA256 do pacote DFU: `F3715E869A2A2BFACC944F1D7ED61081FF671612F6824F975D47928422FEBA98`.

Destino conferido: XIAO COM8, VID_2886/PID_8045, separado do Samsung COM5. Upload via COM9 terminou com `Activating new firmware`, `Device programmed`, código 0 e retorno à COM8.
O servidor Metro existente retornou HTTP 200 para o bundle Android atualizado. Não foi instalado novo APK: a alteração do aplicativo é JavaScript, restrita pela identidade de teste.
O APK oficial continua com `lastUpdateTime=2026-07-31 23:33:32`.

Recarregar o cliente de desenvolvimento ainda em espera evita usar código anterior em cache. Confirmação de `xiao-p5-teste` na telemetria e teste físico de tentativa de confirmação distante permanecem pendentes.

## Resultado físico relatado

O responsável confirmou a identificação do firmware após atualizar e retomar a proteção.
No teste dirigido, relatou que a confirmação distante foi recusada. Esclareceu posteriormente que a mensagem de aguardar a confirmação da placa apareceu somente depois de chegar perto, e o encerramento ocorreu após confirmar novamente.
Assim, a recusa distante e a confirmação após aproximação foram aprovadas nessa execução, por relato físico. Não houve captura de valores RSSI/tempo nesse teste; não se atribui distância exata nem latência garantida.

No teste seguinte, o responsável saiu da conta com proteção ativa e relatou ausência de alertas após sair. Também entrou novamente por iniciativa própria: observou retomada da proteção seguida de protegido. Saída e retorno aprovados nessa execução por relato, sem inspeção do serviço Android no intervalo deslogado.

No teste sem internet (Wi-Fi e dados móveis desligados, Bluetooth mantido), relatou que somente o e-mail não funcionou, enquanto os demais itens do procedimento funcionaram. Alertas locais e confirmação sem internet aprovados por relato físico. Não foi comprovada fila de reenvio de e-mail; o código atual não implementa essa fila.

No teste da preferência de vibração, relatou ausência de vibração com a opção desativada e retorno da vibração após ativá-la. Aprovado nessa execução por relato físico.

No teste comparativo de notificações, confirmou a ação “Abrir Central” com “Alertas de emergência” ativado e sua ausência com a opção desativada. Aprovada essa diferença de apresentação por relato físico; os alarmes não são desativados por essa preferência. Não se presume validação de banner heads-up nem de todos os ajustes de notificações do Android.

Na repetição do procedimento de segundo plano com os ajustes atuais, relatou alertas amarelos próximos (aproximadamente 1–2 m), tanto com tela bloqueada quanto desbloqueada, com retorno ao protegido. Não percebeu desconexão em nenhum momento. Continuidade do vínculo observada por relato, sem captura técnica nesta execução; estabilidade silenciosa de perto não aprovada. Não se presume que completou os cinco minutos previstos. A causa dos alertas ainda não foi comprovada por leituras contemporâneas de RSSI bruto/filtrado; passagem do braço foi uma hipótese do responsável. Não foram alterados filtro, limites ou potência de rádio em resposta a esse relato.

## Próximo teste físico

Com adultos, iniciar emergência por sinal fraco mantendo o vínculo. Tentar confirmar ainda distante: deve permanecer em emergência, sem verde nem encerramento da placa.
Aproximar e aguardar a recuperação real do sinal; confirmar novamente. Deve encerrar o alerta com leitura/distance preservadas. Não repetir a campanha de metragens para verificar esse defeito específico.
