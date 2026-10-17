# Perfil experimental p4: -82/-90 dBm e 4 segundos

Solicitado em 13/10/2026 após o responsável confirmar `xiao-p3-teste` e relatar que o ajuste anterior ficou quase bom.

| Decisão | Entrada | Retorno do filtro | Confirmação |
| --- | --- | --- | --- |
| Amarelo | RSSI filtrado ≤ −82 dBm | RSSI > −77 dBm | 4 s |
| Perigo/vermelho | RSSI filtrado ≤ −90 dBm | RSSI > −86 dBm | 4 s |

As margens de retorno de 5 e 4 dB foram preservadas. O perfil é mais sensível e rápido que o p3 (-84/-92, 5 s). A confirmação conta após o sinal filtrado cruzar o limite; mediana, janela inicial, EMA e notificação acrescentam atraso. Não é um limite comprovado em metros.

Botão físico, perda de conexão, retenção de emergência até confirmação, espera, som e fórmula de distância foram preservados. Não foi feita uma nova campanha de medidas nem adulteradas as coletas antigas.

Perfil ativado somente com `compiler.cpp.extra_flags=-DESCOLTA_TESTE_PROXIMIDADE_4DB=1`. Identificação esperada na telemetria: `xiao-p4-teste`.
Sem macro, continua p2; com a macro anterior `ESCOLTA_TESTE_PROXIMIDADE_6DB`, continua p3. O APK oficial não é atualizado por esse ajuste; porém a placa física compartilhada passa a executar o perfil gravado para qualquer aplicativo que se conectar.

O responsável confirmou a placa em espera antes de uma eventual gravação. O teste de bancada usa somente adultos; não se declara adequação para segurança infantil ou precisão de distância sem validação adicional.

Compilação, gravação e confirmação física serão registradas abaixo conforme concluídas.

## Validação anterior à gravação

As 33 verificações C++ do p2, as 12 do p3 e as 12 do p4 passaram no compilador real instalado. O p4 confirma os limiares exatos, 4 segundos após a janela inicial, lacunas que reiniciam a confirmação, prioridade do pânico sobre o mute e silêncio em espera. Os 95 testes JavaScript do aplicativo também passaram.
O código da fórmula de distância permaneceu inalterado.

## Compilação e gravação

A compilação integral da XIAO Sense terminou com código 0, usando a macro `ESCOLTA_TESTE_PROXIMIDADE_4DB=1`: 332.328 bytes de programa (40%) e 70.024 bytes de variáveis globais (29%). O ELF contém a identificação `xiao-p4-teste`.
SHA256 do pacote DFU: `4F85A9D394974199B49C9B9F746290C4BFD7268AC604C14C74063432E0919A4B`.

O usuário confirmou o modo de espera. A XIAO foi identificada na COM8 (USB VID_2886/PID_8045), separada do Samsung na COM5. A gravação ocorreu via bootloader COM9 e terminou com `Activating new firmware`, `Device programmed`, código 0 e retorno à COM8.
Nenhum APK foi atualizado nessa regulagem.

Pendente: conferir `xiao-p4-teste` na telemetria do aplicativo e observar o teste físico. O sucesso da gravação não comprova precisão dos metros nem adequação dos limites.

## Retorno físico e revisão seguinte

O responsável aprovou o ajuste de perto. Relatou funcionamento do amarelo, vibração breve do celular somente na entrada e retorno ao protegido ao aproximar.
Relatou também emergência por sinal fraco retida até confirmação, mas apontou que confirmar ainda distante podia fabricar verde. Esse defeito de reset, separado dos limites, está sendo corrigido na [revisão p5](CONFIRMACAO_PROXIMIDADE_P5_TESTE.md), que mantém a regulagem de sinal do p4.

## Retorno do responsável

Depois das instruções para retomar a proteção, conferir a identificação e experimentar novamente a posição do mousepad, o responsável respondeu: “ok, pronto, agora sim!”. Registrada aprovação do ajuste nessa observação de perto, sem nova campanha de distâncias. A resposta não detalhou duração, RSSI ou identificação exibida; esses dados não são presumidos.

Mantido como perfil experimental. Ainda verificar o acionamento de atenção ao afastar, retorno ao verde, emergência por sinal fraco e estabilidade em outras condições. Não promovido como oficial.
