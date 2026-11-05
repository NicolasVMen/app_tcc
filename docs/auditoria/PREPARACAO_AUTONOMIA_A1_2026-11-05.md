# Candidata 1.0.2 A1 — 05/11/2026

Usuário confirmou Sentinela em espera e silenciosa antes da preparação.
Autorização ADB do Samsung foi refeita; consulta somente leitura confirmou
oficial 1.0.1/código 2, instalada em 17/10/2026. Nenhum firmware foi alterado.

## Fontes e preservação

- Implementação opt-in: commit `ac55c412f60c4de890d0e545417f70c781e2fefb`.
- Preparação de versão 1.0.2, base Android 3: commit `5f99446`.
- `npm run typecheck`: aprovado; `npm test`: 248 aprovados, sem falhas/skips/TODO.
- Perfil `autonomia-instrumentada`: herda `oficial-validada`; coletor A1 true,
  ferramentas internas false, monitor validado true e mesmo cliente Google Web.
- Oficial anterior preservada em `dist/android/oficial-1.0.1` e copiada para
  `backups/releases/2026-11-05_autonomia-a1`; SHA-256 reconferido:
  `13D5DC02313AFDA5356AAB14A5FCDC0EEAA1B3868ADF2A1ECA4F5968A750FC9C`.
- Fontes de upload inspecionadas antes e depois do envio: 66 arquivos,
  2.540.134 bytes; inventário SHA-256
  `175234dba8d57191c2846fe9406dfafe6a5bd7b11b6cd4f4b727818db6a80eca`.
- ZIP do arquivo de fontes preservado no mesmo checkpoint; SHA-256
  `795806120F7C2F2093E232771DA2F18362E7D012B9C4B107EFB1BC615319C1B0`.
  Documentos, fotos, coletas, `.env.local` e credenciais privadas não incluídos.

## Compilação remota solicitada

EAS CLI 21.0.0 existente, conta `nicolas_venciguerra_men`, projeto
`be41ccc5-f32b-428e-9974-91dffc0fed45`. Código remoto consultado antes: 2.
Compilação incrementou 2 → 3 e selecionou a configuração original
`Build Credentials A632cnQN2k (default)`. Isso não substitui conferência do
certificado no APK final.

- Build: `b001cb0f-65ec-4744-a69e-00ca7c4fc1d8`.
- [Acompanhamento no EAS](https://expo.dev/accounts/nicolas_venciguerra_men/projects/escolta-unitau/builds/b001cb0f-65ec-4744-a69e-00ca7c4fc1d8).
- Perfil: `autonomia-instrumentada`, APK interno, pacote oficial existente.
- Fontes comprimidas/enviadas, fingerprint calculado.

**Na etapa de envio: nenhum APK A1 instalado, nenhuma coleta física iniciada.**
Antes de instalar, conferir assinatura, pacote, versão, código, recursos,
manifesto e bundle. Instalar como atualização, sem desinstalar ou limpar dados,
mantendo espera e sem abrir/retomar proteção automaticamente.

## Validação após instalação

Usar o [roteiro A1](../testes/COLETOR_AUTONOMIA_A1_2026-11-05.md): iniciar
manualmente uma coleta curta, conferir USB/bateria, estados reais, tela bloqueada,
persistência e arquivos exportados antes do ciclo longo. Não chamar os testes
automatizados ou a compilação de resultado de autonomia.

## Candidata compilada e instalada

- EAS FINISHED, commit `5f994463c838a450ed5f7ded23ffb509e6bf01da`, às
  19:00:17 de 05/11/2026 (Brasília).
- APK local em `dist/android/candidata-1.0.2-a1/Escolta_UNITAU_1.0.2_A1.apk`,
  95.675.988 bytes. SHA-256:
  `E8076966A6183E4ABA3AED07069259B067C20D68CE5543BA87DA091783A13823`.
- Verificador do APK final: aprovado para pacote oficial, versão 1.0.2/código 3,
  certificado original SHA-256 `34f8ddb808fac6d1eba6f3086ab8d86615270467831be74eaedade9a6a70c705`,
  bundle incorporado, esquema, permissões, recursos de som, fontes, ícone e
  serviço Sentinela validado.
- Usuário reconfirmou espera/silêncio e bancada. `adb install -r` passou, sem
  desinstalar ou limpar dados. Package Manager confirmou 1.0.2/código 3.

## Regressão no Samsung e simulações

- Inicialização em espera, sessão existente e 44 ocorrências preservadas.
  Central, Protocolo, Registros e Sistema acessíveis. Registro A1 presente.
- Cancelamento da limpeza de registros e da prévia de compartilhamento, sem
  apagar histórico ou enviar dados.
- Diálogos de restauração, saída, Polícia e SAMU abertos e cancelados. Não
  houve restauração, logout nem chamada.
- A1 não inicia sozinho. Cancelamento de início preserva parada. Confirmação
  sem BLE em espera recusa com instrução de aguardar telemetria.
- Reinício a frio por encerramento explícito do processo em espera: abertura
  bem-sucedida, modo de espera preservado. Sem erros ReactNativeJS/AndroidRuntime
  no processo da primeira checagem após reabrir. Isso não prova ausência de
  erros em outros processos, aparelhos ou períodos.
- TypeScript aprovado; 255 testes Node aprovados, incluindo 12 horas virtuais
  de registro, oscilação BLE em emergência, recuperação após interrupção e
  percurso combinado monitor–placa simulada–CSV, sem tráfego ou e-mail real.
- No fluxo de e-mail simulado, o monitor real chama o serviço real com transporte
  HTTP substituído pelo teste. Pânico repetido gera uma requisição; atenção e
  aviso desativado não geram. Aceite, recusa, rede ausente, localização do
  celular fictícia permitida, negada e indisponível foram exercitados. Falhas
  não encerraram o alerta local. Nenhum contato, e-mail ou GPS real foi usado.
- 10 arquivos de teste C++ compilados; 136 asserções estáticas passaram. Não
  houve gravação ou alteração de firmware.

**Defeito reproduzido:** o rodapé de Sistema exibe `Escolta UNITAU v1.0.0`
porque o texto é fixo, embora Android confirme 1.0.2. O rodapé não deve ser
usado para identificar o APK. A correção do texto ainda não está nesta build.

### Telemetria física e recuperação

- Retomada pelo fluxo normal em bancada: placa reconhecida em protegido, USB
  presente, leitura de 3,54–3,55 V/5% estimados. A marcação manual “Emergência”
  não mudou o estado observado nem disparou emergência.
- A primeira coleta continuou com a tela do coletor fechada e o aplicativo em
  segundo plano. O serviço nativo permaneceu em foreground, e surgiu uma
  amostra periódica durante o intervalo. Cancelar o encerramento preservou a
  coleta; encerrar somente a coleta preservou a conexão da Sentinela.
- Na segunda coleta, após colocar a Sentinela em espera pelo fluxo normal,
  o processo foi encerrado e reaberto. A UI mostrou “Coleta parada” e
  preservou os registros, incluindo perda de vínculo sem tensão/USB antigos.
- Bateria da placa permaneceu alimentada pelo USB. Não retirar o cabo para
  ensaio de descarga nessa leitura baixa. Ainda não há resultado de autonomia.
- Emergência, perda de vínculo em alerta e e-mail foram simulados a pedido.
  Preferências de contato preservadas, sem alarme intencional ou mensagem real.

### Exportação física dos CSVs no Samsung

- Com o Escolta novamente disponível em primeiro plano, as duas coletas foram
  preservadas. A janela A1 mostrou **Coleta parada** e o último registro sem
  vínculo, com tensão e USB indisponíveis, sem reutilizar os valores anteriores.
- Os dois arquivos foram salvos pelo seletor do Android em
  `Documents/Escolta_QA_A1_2026-11-05_2032/` no Samsung e copiados para
  `.expo/qa-a1-csv/` no computador. Os SHA-256 do telefone e das cópias
  coincidem; os CSVs de ensaio não foram incluídos no Git.
- `*_registros.csv`: 3.666 bytes, BOM UTF-8, 30 colunas, 8 registros em 2
  coletas. A primeira tem 5 linhas, término `encerrado_pelo_responsavel` e
  132.121 ms observados via USB; a segunda tem 3 linhas, término
  `registro_interrompido_entre_execucoes`, 10.338 ms via USB e 21 ms sem
  observação (valores arredondados). Ambas somam 0 ms de descarga observada.
- `*_resumo.csv`: 823 bytes, BOM UTF-8, 12 colunas, uma linha por coleta. Os
  totais USB + sem observação batem com o tempo monotônico do último registro
  de cada coleta, dentro de 1 ms. Sequências 1..N, versão A1, firmware,
  estados e campos vazios na perda de vínculo foram conferidos.
- A marcação manual `etapa_informada=emergencia` manteve
  `estado_observado=protegido` e `emergencia_app=false`: o coletor distinguiu
  anotação de alarme real. `Compartilhar registros CSV` abriu a prévia do
  Android, que foi cancelada sem destinatário. `Excluir coletas após exportar`
  apresentou confirmação; cancelamento preservou as coletas.
- Ocorrência de interface a acompanhar: na primeira abertura da janela A1 no
  Samsung, os botões de exportação ficaram sob a barra de navegação e a rolagem
  não respondeu a várias tentativas, inclusive após reabrir o aplicativo.
  O botão pôde ser acionado por foco de teclado/acessibilidade; após retornar
  do seletor de arquivos, a rolagem passou a funcionar, inclusive ao subir e
  descer novamente. Causa não identificada; não declarar resolvida sem nova
  compilação e teste de interface. Nenhum arquivo foi apagado.
- O Escolta foi deixado em **espera**, com o coletor fechado e parado. Isto
  valida a exportação curta, não mede autonomia nem comprova envio de e-mail
  real. Um ensaio de descarga requer bateria recarregada e medição prolongada.
