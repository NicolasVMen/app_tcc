# Ensaio controlado W1 — sem perda intencional do GATT

Nota posterior à execução: as ferramentas internas passaram a ser opt-in e desligadas por padrão, conforme solicitação do usuário. Para repetir este procedimento, consultar `docs/auditoria/INTERFACE_DE_USO_APK_2026-10-17.md`. O registro abaixo preserva a rodada já executada; o painel não fica disponível no uso normal nem em APK release.

## Escopo e segurança

Somente entre adultos, sem criança. O ensaio causa emergência real, com os canais de som/vibração e e-mail configurados no aplicativo. Não usar o botão físico com fios aguardando reparo. Usuário confirmou espera antes da preparação deste código.

Nenhum firmware novo é necessário: a XIAO já recebeu `xiao-p5-r4-d1-k2-w1`. Potência, filtros, limiares, carregador e geometria da caixa não foram alterados para esta simulação.

## Motivo do diagnóstico isolado

O controlador Android normalmente tenta recuperar o vínculo após 6 s sem RSSI fresco; o watchdog independente da placa expira em 8 s. Apenas suspender escritas no app provocaria uma desconexão antes de testar especificamente o watchdog da XIAO. Desligar a placa/Bluetooth também verifica outro caminho.

Foi adicionada injeção manual restrita a **`__DEV__ && IS_TEST_BUILD`**. Ela não existe como opção habilitada na oficial nem em qualquer APK release, inclusive `.teste`. Não inicia ao abrir a tela ou ao reconectar. A oficial instalada não foi substituída.

## Comportamento implementado

- Início exige tag W1 exata, conexão, status seguro/ativo/fresco e sinal forte, sem comando de controle pendente.
- Suspende leituras/escritas RSSI por até 15 s, preservando notificações de status e GATT; leituras antigas não são apresentadas como frescas.
- Adia exclusivamente a recuperação por RSSI antigo por até 18 s (15 de suspensão + 3 para recuperar). A recuperação por **ausência de telemetria** continua com prazo normal de 6 s. Desconexão real não é ocultada.
- Pânico informado pela placa continua ativando os alarmes reais mesmo sem RSSI fresco.
- Ao expirar a janela, o polling normal volta sem comando do usuário e a exceção temporária deixa de valer. Não há reset de alarme ou confirmação automática.
- Cancelamento, espera ou desconexão liberam o envio e invalidam o ensaio. A exceção não atravessa sessões/dispositivos. Uma leitura iniciada antes do clique não vira dado fresco durante a suspensão.
- O painel conta notificações válidas, registra o tempo do primeiro pânico recebido, a primeira escrita retomada e interrupções. Compartilha registro textual, não declara aprovação automaticamente.
- Se o sistema suspender o runtime, o envio só pode retornar quando ele voltar a executar; por isso este ensaio exige tela ligada e app aberto. O prazo usa relógio do celular, não temporizador independente no Android.

## Procedimento

1. Ainda em espera, fechar e abrir o Escolta Teste para carregar o código. Não usar `r` enquanto monitorando. Servidor Expo precisa estar acessível.
2. Dispositivos próximos (~1 m), retomar proteção e aguardar Protegido com leituras novas.
3. Sistema → Verificar prontidão → painel **Simulação W1 — só desenvolvimento** → **SIMULAR FALTA DE RSSI — 15 S**. Ler e confirmar o aviso.
4. Manter a tela ligada, não mover os dispositivos, não desligar Bluetooth/placa, não recarregar nem fechar o aplicativo. A estimativa deve perder a indicação de leitura atual; isso é esperado, não distância infinita inventada.
5. Esperar cerca de 20 s. Esperado: pânico da placa recebido aproximadamente 8 s após a última escrita aceita, notificações continuando, nenhuma interrupção GATT registrada e escrita retomada após 15 s. Uma escrita já em trânsito ao iniciar e o período de notificação influenciam a medida a partir do clique.
6. Compartilhar o diagnóstico W1. Registrar separadamente se o buzzer e o celular alertaram. O relatório não comprova sozinho a saída física.
7. Voltar à Central. Após as leituras voltarem, emergência deve continuar até confirmação de segurança aceita pela placa, estando próximo.

## Validação de código

192 testes Node aprovados, sem falhas/skips/TODO, e TypeScript sem erros após implementar a primeira versão deste diagnóstico. Incluem bloqueio em release/oficial, início recusado em espera/tag antiga/sinal fraco, suspensão limitada, retomada automática, cancelamento/sessões, dados nunca fabricados como frescos, chegada de pânico à UI e preservação do timeout por falta de telemetria.

`tools/build-android.ps1 -Target ValidateStandalone -TestApp -Online` terminou com **BUILD SUCCESSFUL** (1 min 25 s). Verificador dos intermediários aprovou manifesto, pacote Teste, bundle e configuração cliente Firebase/Google. Bundle: 2.063.348 bytes, SHA-256 `bf112e00cbf0ef99ab6409309b3b9c0013e0971adf71f570d0a32b4dee0fd64c`. Nenhum APK foi gerado/instalado. Inventário de fontes após o painel: 34 arquivos, 33 alcançáveis, nenhuma importação local ausente; `PatrolScreen` continua legado.

## Resultado físico relatado e diagnóstico recebido

Usuário carregou o painel ainda em espera e iniciou manualmente o roteiro guiado. Informou: “deu certinho, ambos estão apitando e avisando a emergencia”. Isso confirma as saídas físicas por relato, não por medição de áudio.

Registro compartilhado pelo aplicativo:

```text
ESCOLTA TESTE — injeção controlada W1
Data da consulta: 2026-10-17T20:19:27.948Z
Envio RSSI suspenso por até 15 s; recuperação RSSI adiada por até 18 s.
Ensaio ainda ativo: false
Notificações válidas recebidas durante a janela: 18
Primeiro pânico informado pela placa após: 8256 ms
Escrita RSSI retomada na janela: true
Interrupção: nenhuma registrada
Registro de diagnóstico, não aprovação automática de som, recuperação ou segurança.
```

Resultado compatível com watchdog de 8 s na XIAO durante ausência injetada de RSSI, com status BLE continuando a chegar e escrita retomada automaticamente. A medição de 8,256 s é do clique até a primeira notificação de pânico recebida no app, não o instante exato de expiração do temporizador interno da placa. Foram recebidas 18 notificações válidas na janela, sem interrupção registrada pelo diagnóstico; não é uma captura independente do rádio/GATT.

Disparo e retomada automática do envio aprovados nessa rodada por diagnóstico e relato. Após orientação para confirmar segurança com leituras atuais, o usuário respondeu: “sim, pararam e ta ok agora”, confirmando o encerramento dos dois alarmes e retorno a Protegido perguntados no roteiro. A recuperação e confirmação final estão aprovadas por relato; não são inferidas do relatório anterior.

**Ensaio W1 concluído nesta condição:** disparo com ausência injetada de RSSI, continuidade de notificações sem interrupção registrada, retomada automática das escritas, emergência retida até confirmação humana e recuperação relatada. O botão físico com fios a reparar, autonomia integral, bateria baixa real e APK instalado sem servidor continuam fora da aprovação deste ensaio.
