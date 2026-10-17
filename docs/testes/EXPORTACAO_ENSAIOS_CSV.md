# Exportação dos ensaios de proximidade

Abra **Sistema → Ensaio de proximidade → Histórico local → Exportar resultados**. Termine/interrompa a coleta antes de exportar; não é preciso desligar a proteção. A exportação não altera distância, filtros, potência ou alarmes.

## Escolhas na tela

1. **Histórico completo:** todos os ensaios atualmente guardados nesta conta, inclusive incompletos (limite local já existente: 100 ensaios).
2. **Último ensaio:** o ensaio guardado com início mais recente, mesmo se incompleto. Não significa apenas a coleta concluída com sucesso.
3. **Amostras detalhadas:** uma linha por amostra, preservando as 22 colunas do formato anterior. Envie este arquivo para analisar/calibrar o sinal. Ensaio sem amostras continua representado por uma linha com dados da coleta e campos de leitura vazios.
4. **Resumo por ensaio:** uma linha por ensaio, com quantidade de amostras, média/faixa de RSSI, mediana do RSSI filtrado, média/faixa da estimativa, erro absoluto médio e contagens de atenção/pânico. Valores agregados arredondados a até três casas decimais; o arquivo detalhado não é arredondado pelo resumo.

A tela informa quantos ensaios e amostras serão incluídos. Para comparar vários pontos de uma rodada, use **Histórico completo + Amostras detalhadas**. Para ler rapidamente em planilha, use **Resumo por ensaio**. O histórico pode incluir dias/firmwares diferentes; separe as campanhas pelos IDs, datas e condições, não misture tudo automaticamente.

## Compartilhar

Toque **Compartilhar arquivo CSV** uma vez e escolha o destino no seletor do Android. O app prepara um arquivo temporário e compartilha sua URI com autorização de leitura, não o texto inteiro em `Intent.EXTRA_TEXT`. O retorno do seletor não comprova entrega: ele também pode significar cancelamento. Verifique o anexo no aplicativo de destino.

Não há exclusão do arquivo temporário imediatamente após o seletor, pois o destinatário ainda pode estar lendo. O sistema pode limpar o cache; o histórico continua no armazenamento da conta. Para uma cópia persistente sob seu controle, salve no celular.

## Salvar no celular (Android)

Toque **Salvar CSV no celular**, escolha/crie uma pasta e autorize o acesso solicitado pelo seletor. Em alguns aparelhos não é permitido selecionar a raiz de Downloads; crie ou escolha uma subpasta, por exemplo **Documentos/Escolta**. Aguarde a mensagem de arquivo salvo. Depois abra Meus Arquivos e compartilhe o `.csv` como documento, se preferir.

Cancelar a escolha de pasta não apaga ensaios. Erro de criação/gravação aparece na tela; em caso de timeout, confira se há arquivo incompleto na pasta antes de repetir. Não chamar um arquivo parcial de exportação concluída. Não é solicitado acesso geral aos arquivos do telefone.

## Nome e leitura

Exemplo de nome, não arquivo de ensaio real: `Escolta_2026-10-15_23-15-00-123_historico_amostras.csv`. A data no nome é a hora local do aparelho na exportação; os horários nas colunas são UTC (`Z`). A extensão é CSV, texto UTF-8 com BOM para facilitar acentos no Excel, colunas separadas por ponto e vírgula. Valores numéricos usam ponto decimal. Se a planilha não separar corretamente, importe como UTF-8, delimitador `;` e ponto como separador decimal. Não confundir resolução exibida com precisão física.

Observações livres são exportadas, portanto evite dados pessoais. Textos iniciados por marcadores de fórmula recebem proteção ao abrir em planilha. Não há envio automático para internet/nuvem: o destino é escolhido pelo responsável.

## Limitações de interpretação

- Distância real vem da trena e não é uma leitura do protótipo.
- RSSI filtrado exportado pela placa é arredondado; celular e placa têm leituras assíncronas.
- Campos não medidos (por exemplo, altura) ficam vazios, não viram zero.
- Contagens de pânico ativo não representam alarmes independentes; uma emergência pode ficar retida.
- Erro absoluto médio usa somente estimativas numéricas válidas. Sem estimativas, permanece vazio, não zero.
- O CSV pode ter várias campanhas e versões; confira metadados antes de calibrar.

## Correção de 15/10/2026

Falha reproduzida no Samsung: `TransactionTooLargeException`, transação de 532.044 bytes ao iniciar o seletor com histórico enviado como texto. O novo caminho compartilha arquivo, com trava de concorrência, progresso, tratamento de cancelamento/erro e alternativa de salvamento. Não há truncamento de linhas para esconder o problema.

Foram adicionados 14 testes de exportação; suíte total passou com 158 testes e tipagem sem erros. Testes simulam 100 ensaios/3.000 amostras, transporte por URI, falhas, cancelamento e exclusão mútua. Compilação de desenvolvimento do pacote de teste concluída; operação real no seletor, cancelamento/repetição, conteúdo recebido e manutenção do vínculo ainda precisam da checagem no Samsung. Esses resultados automáticos não substituem essa confirmação.

Dependências diretamente declaradas: `expo-sharing ~14.0.8` (resolvido 14.0.8) e `expo-file-system ~19.0.23` (resolvido 19.0.24), compatíveis com as faixas do SDK 54 local. Não houve atualização geral de Expo, React Native, Firebase ou firmware.

APK de teste anterior preservado em `.expo/escolta-teste-antes-exportacao-2026-10-15.apk`, SHA-256 `6CA378CB10C535C38D8CBBD6373E141CF1DA7D9634BAFBCF2707750FA0751225`. APK corrigido de desenvolvimento: `android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 `C85F2082793A6E0C7BD30F18E3A0DA2330FAE257DF2D982B4093F4933E1CBB4E`. Ambos têm certificado SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. O APK antigo não é backup dos dados nem do bundle servido pelo Metro.

Pacote alvo exclusivo: `com.nicolasvmen.escoltaunitau.teste`, versão 1.0.0-teste. A versão oficial não foi substituída. A variante continua sendo de desenvolvimento e depende do servidor; não confundir com aprovação do APK oficial/sem servidor. O artefato lista quatro ABIs (inclui arm64-v8a); não descrevê-lo como exclusivamente ARM64.

Atualização no Samsung realizada com `adb install -r`, retorno `Success`, `lastUpdateTime=2026-10-15 23:12:50`. Sem desinstalação/limpeza. Banco RKStorage continua presente; isso não substitui conferir contagem e conteúdo do histórico na tela. Comando de abertura da MainActivity enviado com sucesso, sem assumir que o usuário já viu a nova tela. Nenhum erro apareceu no recorte de logs pós-abertura consultado; ainda não é aprovação física do compartilhamento.

Conferência posterior: recebido `Escolta_2026-10-15_23-24-03-581_historico_amostras.csv`, 21 ensaios/584 linhas/22 colunas. Todas as 502 linhas do arquivo anterior estão presentes e inalteradas, além de 82 novas, sem chaves duplicadas. Uma exportação física completa foi comprovada. Cancelamento/repetição, resumo, salvamento em pasta e BLE durante exportação ainda não foram confirmados separadamente. Ver `ANALISE_REPETICAO_4_5M_E_EXPORTACAO_2026-10-15.md`.
