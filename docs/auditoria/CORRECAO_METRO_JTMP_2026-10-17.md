# Metro e socket temporário do Java — 17/10/2026

## Evidência e causa

Após confirmar visualmente que os controles internos sumiram da interface, o usuário enviou a saída do Expo: `EACCES: permission denied, lstat ...\.expo\jtmp\socket_1930626818`, emitido pelo `FallbackWatcher` e encerrando o Metro.

`tools/build-android.ps1` usa `.expo/jtmp` para `TEMP`, `TMP` e `-Djdk.net.unixdomain.tmpdir` no processo Java da compilação. A configuração padrão Expo instalada bloqueia `.expo/types`, não `.expo/jtmp`. O watcher tentou inspecionar um socket de compilação que não é fonte/asset. Avisos de Expo AV/Legacy Architecture precederam a falha, mas não são a exceção que encerrou esse processo. A pergunta sobre Xcode veio de tentativa de abrir iOS e não é necessária para Android.

## Correção

Criado `metro.config.js` a partir de `getDefaultConfig(__dirname)` de `expo/metro-config`. Somada apenas a exclusão `.expo/jtmp` do projeto e descendentes, para caminhos absolutos e relativos e separadores Windows/POSIX. Mantidos todos os bloqueios padrão do Expo, resolver, transformer, serializer, assets e demais opções.

Não bloqueia toda a pasta `.expo`: arquivos virtuais de entrada continuam acessíveis. Não altera `node_modules`, permissões do Windows, carregador, firmware, Bluetooth, Firebase ou alarmes. Nenhum socket foi apagado manualmente e nenhum servidor do usuário foi encerrado.

## Verificação

- Testes de caminho: diretório e socket excluídos, limites de nome respeitados (`jtmp2`/`jtmp-backup` continuam fora da exclusão nova), fontes/áudio/assets não bloqueados.
- Teste com configuração padrão simulada preserva referências e bloqueios existentes, inclusive raiz com caracteres especiais.
- Watcher real da versão instalada iniciou sobre fixture isolada, observou `src` e não observou `jtmp`, inclusive após evento de diretório com caminho relativo. Sem erros registrados. A fixture criada pelo teste foi removida após fechar o watcher, com destino validado dentro da pasta temporária do sistema.
- Configuração real Expo carregada em Node: socket informado pelo usuário bloqueado, extensões TSX e WAV preservadas.
- Suíte completa: **203 testes Node aprovados**, sem falhas, skips ou TODO. TypeScript sem erros.
- A exclusão não é prova de operação contínua do servidor real após reinício. A reaplicação da configuração exige reiniciar o Expo; não usar apenas `r`.

## Aplicar no terminal do usuário

Com a Sentinela em espera, cancelar a pergunta de iOS com `n`, se ainda existir, e encerrar o Metro com Ctrl+C. Executar:

```powershell
npx expo start --dev-client --scheme escolta-teste --clear
```

O `--clear` limpa o cache do Metro; não limpa os dados do aplicativo. Não precisa instalar Xcode nem abrir VS Code como administrador para esta correção. Os avisos de APIs antigas podem continuar; não foi executada migração de áudio/arquitetura nesta etapa.
