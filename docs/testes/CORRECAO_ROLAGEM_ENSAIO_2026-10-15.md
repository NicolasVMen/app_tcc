# Rolagem do ensaio de proximidade — 15/10/2026

Responsável relatou que a tela não descia ao abrir Ensaio de proximidade, inclusive arrastando fora dos campos, enquanto outras telas funcionavam. Disse que já existia antes da nova exportação e pareceu pior com o conteúdo adicional. Confirmou Sentinela em espera antes da alteração.

## Evidência

Inspeção de layout nativo via ADB no Samsung (1080 × 2340 pixels) mostrou, dentro do `ReactModalHostView`:

```text
ReactScrollView ... 0,275-1080,6611
ReactEditText ... 51,1336-1029,1547
ReactEditText ... 51,1581-1029,1792
```

A área rolável estava com 6.336 pixels de altura, superior à tela. Isso é compatível com conteúdo medido sem limite de viewport e cortado pela janela, não comprova travamento do JavaScript/Android. A extração por UIAutomator não conseguiu idle em uma tentativa; não usá-la como aprovação da interação. Não foram executados gestos automatizados nem alterada proteção durante o diagnóstico.

## Alteração localizada

Somente layout de `ProximityTrialModal.tsx`:

- Contêiner limitado à altura atual da janela por `useWindowDimensions`, incluindo `maxHeight`, adaptando a mudanças da janela.
- ScrollView com `flex: 1` e `minHeight: 0`, recebendo apenas o espaço restante abaixo do cabeçalho.
- Cabeçalho sem encolhimento; indicador vertical visível, suporte a rolagem aninhada e descarte do teclado ao arrastar.
- Campo multiline de observações sem rolagem própria para reduzir disputa de gestos.
- Identificadores de viewport/scroll adicionados para diagnóstico.

Não foram alterados coleta/tempo de amostragem, CSV, histórico, conta, BLE, alarmes, firmware, limiares ou a versão oficial. Não houve novo APK nesta etapa: mudança JavaScript recebida pelo aplicativo de desenvolvimento quando o Metro atualizar a tela. Não pedir recarga `r` durante proteção ativa para testar layout.

Tipagem aprovada e suíte completa com **159 testes aprovados**, incluindo contrato estrutural de viewport/scroll. Esse teste verifica código, não que o gesto físico funcionou.

## Checagem física pendente

Foi solicitado ao responsável sair/reabrir a tela ainda em espera, sem `r`, tentar descer e deixar a tela aberta. Confirmar no aparelho: chegar à exportação e histórico, voltar ao topo, editar observações/altura com teclado e rolar novamente, sair/reabrir sem perder histórico. A comparação de limites nativos após reabertura e a aprovação da rolagem ainda dependem dessa execução. Não declarar resolvido apenas pela compilação/testes.

## Conferência após reabrir o aplicativo

Responsável informou que sair/reabrir somente a tela não resolveu naquela sessão, mas fechar e abrir o aplicativo fez a rolagem funcionar, sem usar `r`. Não afirmar que a atualização em memória havia sido aplicada antes desse reinício ou que será necessário reiniciar a cada uso.

Inspeção posterior mostrou contêiner do modal `0,0-1080,2340`, ScrollView `0,275-1080,2205` (1.930 px) e conteúdo interno `0,0-1080,6478`. Agora o viewport é menor que o conteúdo e cabe na janela, ao contrário dos 6.336 px observados antes. Essa evidência mais o relato confirmam a rolagem básica após reabertura. Ainda verificar exportação, cancelar/repetir o seletor e gestos com teclado; não marcar a funcionalidade inteira aprovada por esse único resultado.
