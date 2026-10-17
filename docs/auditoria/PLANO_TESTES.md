# Plano de validação antes do APK

Preparado em 07/10/2026; **não executado nesta auditoria**.

Atualização de 09/10: regressões automatizadas corrigidas; compilação Android
e rodadas físicas continuam pendentes. Ver [correções](CORRECOES_2026-10-09.md).

Primeiro corrigir os bloqueadores do relatório e zerar os TODO do `npm test`.
Não fazer ensaios de segurança com uma criança; usar bancada e adultos,
supervisão presencial e combinar previamente os alarmes. Não enviar e-mails
a terceiros nos testes sem combinar com o destinatário.

## Registro mínimo em cada rodada

Data/hora, modelo e Android do celular, versão do app e firmware mostrado,
caixa fechada, alimentação USB/bateria, ambiente, altura dos dois aparelhos,
orientação, distância real medida com trena, obstáculos, preferências,
resultado esperado/observado, tempo até resposta e CSV quando aplicável.

As novas coletas incluem firmware informado pela placa, modelo do celular,
sistema, versão do app e altura opcional preenchida pelo responsável. Coletas
antigas não recebem metadados inventados. Não misturar coletas no
chão com coletas elevadas nem tratar replay de calibração como validação nova.

## Rodadas propostas

| Ordem | Ensaio | Critério a conferir |
|---|---|---|
| 1 | Inspeção desligada | Botão retorna, pernas/soldas livres, USB acessível, antena livre; nenhum fio esmagado |
| 2 | Conectar a 1 m, caixa fechada, mesma altura | `xiao-p2`, telemetria nova, verde estável; não concluir só pela conexão |
| 3 | Botão: toque breve / pressão de 1,5 s / soltar | Breve ignorado; sustentado ativa; soltar não encerra pânico; confirmação humana encerra |
| 4 | Notificações ligadas/desligadas; vibração ligada/desligada | Sirene crítica permanece conforme política acordada; preferências têm o efeito anunciado |
| 5 | Atenção e recuperação | Bipe lento/vibração só após confirmação do filtro; ausência de alternância rápida por oscilações breves |
| 6 | Perigo de sinal | Critério de RSSI/tempo confirmado, pânico retido e motivo coerente, sem exigir perda BLE |
| 7 | Desconexão breve e prolongada | Reconecta antes de 5 s sem alerta de perda; prolongada aciona; reconectar não encerra emergência indevidamente |
| 8 | RSSI/notificações travados com BLE ainda conectado | Dados antigos não aparecem como proteção válida; falha é percebida e tratada |
| 9 | Segundo plano e tela bloqueada, pelo menos 10 min | Repetir botão/perda/reconexão; áudio e telemetria realmente continuam |
| 10 | Reinício/morte do processo e fechamento pelo sistema | Não prometer proteção silenciosamente quando JS/serviço não estão ativos; estado recuperado de forma coerente |
| 11 | Pausar, retomar, sair da conta durante conexão | Espera confirmada na placa; sem conexões tardias ou alarmes indevidos; retomada explícita |
| 12 | Troca de contas | Perfil, contato, históricos e intenção não vazam entre contas |
| 13 | Negar permissões, Bluetooth desligado, volume/DND | Falhas visíveis; não mostrar “pronto” se falta função essencial; registrar comportamento real do Android |
| 14 | Sem internet após autenticação | BLE local verificado; falha de e-mail não bloqueia alerta local; sessão e reabertura registradas |
| 15 | Ensaio com trena | 1/3/5/7 m e demais posições possíveis até 15 m; 30 amostras por posição; repetir ida/volta e orientações |
| 16 | Bateria e USB | Conectar/desconectar carga, avisos de carga, percentual estimado sem tratar como medição exata |
| 17 | Autonomia | Pelo menos novo ciclo representativo com reconexões/alertas; registrar tensão/condições sem extrapolar 90–5% para 100–0% |

Para perda BLE, há duas contagens independentes (app e placa), sujeitas ao
momento da detecção do evento. Registrar a latência real; não exigir sincronia
perfeita de 5,000 s. Para amarelo/vermelho não usar metros estimados como
critério de verdade: comparar RSSI/estado e distância real separadamente.

As rodadas que exigem travar telemetria ou matar processo precisam de um modo
de diagnóstico controlado; não improvisar alterações no firmware de uso.

## Aceitação

- Zero falhas nos cenários críticos repetidos, com logs que permitam reproduzir.
- Zero regressões conhecidas pendentes no gate de testes.
- Compilação Kotlin/Android confirmada, permissões e assinatura revisadas.
- Dependências incompatíveis e alertas de segurança triados/corrigidos.
- Distância apresentada como estimativa; medir e informar erro/variação,
  sem prometer precisão que as coletas não sustentam.

Depois disso, gerar **APK interno de teste** com JavaScript incorporado e
repetir conexão, pausa, botão, perda, segundo plano e reabertura **sem Metro**.
Testar em development build não substitui validar esse APK. Não há teste
automatizado capaz de certificar sozinho a proteção de uma criança.
