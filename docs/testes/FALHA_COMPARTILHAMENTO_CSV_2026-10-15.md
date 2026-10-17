# Falha reproduzida ao compartilhar histórico CSV — 15/10/2026

## Evidência observada

No Samsung SM-S928B, Android 36, pacote `com.nicolasvmen.escoltaunitau.teste`, o responsável relatou que o botão ficava parcialmente transparente sem abrir as opções de compartilhamento. A recarga posterior pelo `r` deixou o aplicativo procurando enquanto a placa aparentava conexão; desligar/ligar Bluetooth recuperou o vínculo. A causa dessa segunda ocorrência ainda não foi comprovada.

Leitura somente diagnóstica via ADB autorizado durante nova reprodução encontrou, por volta de 23:01 no horário do celular:

```text
START ... android.intent.action.CHOOSER ... com.android.intentresolver/.ChooserActivityLauncher ... from uid 10090 (com.nicolasvmen.escoltaunitau.teste)
Failed to deliver transaction for ProcessRecord{... 27062:com.android.intentresolver/u0a86}
android.os.TransactionTooLargeException: data parcel size 532044 bytes
Exception in new process when starting ActivityRecord{... com.android.intentresolver/.ChooserActivityLauncher ...}
Killing 27062:com.android.intentresolver/u0a86 (adj 0): error during init
```

Isso confirma falha de transferência na inicialização do seletor Android. O tamanho acima é o da transação serializada, não o tamanho medido do CSV. Não atribuir esta reprodução a interferência BLE, falha de gravação do histórico ou encerramento comprovado do processo Escolta.

## Caminho no código

`src/screens/ProximityTrialModal.tsx`, função `share`: aguarda `writesRef.current`, converte todos os ensaios por `trialsToCsv(runsRef.current)` e envia o resultado em `Share.share({ message: ... })`. Não há bloqueio de chamadas simultâneas/indicador de exportação.

Na versão instalada do React Native, `ShareModule.kt` coloca o texto em `Intent.EXTRA_TEXT`, chama `startActivity(chooser)` e resolve a Promise logo depois. Uma falha posterior ao entregar a transação ao seletor não necessariamente chega ao `catch` JavaScript.

## Correção proposta na captura

- Exportação completa como arquivo CSV, compartilhando referência ao arquivo, não todo seu conteúdo em extras da Intent.
- Guardar histórico intacto; não truncar linhas nem apagar ensaios para diminuir o payload.
- Impedir toques concorrentes, mostrar preparo/erro e restaurar estado do botão em caso de falha/cancelamento.
- Verificar erros de preparação/gravação/abertura e testar histórico grande, cancelamento e repetição, além de vínculo e telemetria durante/depois da exportação.
- Antes de aplicar mudanças que possam disparar recarga pelo Metro ou instalar novo APK, solicitar modo de espera confirmado pelo responsável. Não reiniciar automaticamente o app, o Bluetooth ou a placa durante proteção ativa.

Nenhum código do aplicativo/firmware foi alterado nesta captura; aplicativo oficial preservado. A reprodução confirma a causa do compartilhamento, mas não valida ainda uma correção.

## Implementação posterior autorizada

Após o responsável confirmar Sentinela em espera, foi implementada exportação por arquivo com seleção de escopo/formato, resumo separado, alternativa de salvar e proteção contra concorrência. Tipagem e 158 testes passaram; APK paralelo compilou e certificado/pacote foram conferidos. Ver `EXPORTACAO_ENSAIOS_CSV.md`. Checagem física da exportação após atualização permanece necessária. A recuperação BLE após `r` é outro item: não foi alterada nem declarada resolvida por este patch.
