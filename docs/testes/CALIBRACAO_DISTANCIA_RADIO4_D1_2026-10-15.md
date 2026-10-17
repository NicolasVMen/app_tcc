# Distância radio4 D1 — alteração isolada e validação

## Autorização e escopo

Responsável autorizou aplicar a proposta de mudar primeiro somente a estimativa, mantendo alarmes. Confirmou novamente Sentinela em espera, silenciosa e XIAO no USB. Depois fechou/abriu o Escolta Teste e confirmou retorno em espera/silencioso para carregar o reconhecimento da tag nova.

Nova variante opt-in `ESCOLTA_TESTE_DISTANCIA_RADIO4=1`, firmware `xiao-p5-r4-d1`. Requer teste p5, perfil p4 e potência solicitada +4 dBm. Perfil padrão sem macro conserva -68,44 / 2,65; nenhuma promoção da versão oficial.

## Fórmula e dados

`distancia = 10 ^ ((referencia - RSSI_filtrado) / (10 * expoente))`

- Antes: referência -68,44 dBm; expoente 2,65.
- D1: referência -63,386376 dBm; expoente 3,377961.
- Valores identificam um ajuste estatístico, não uma medição direta a 1 m nem precisão equivalente ao número de casas decimais.

Derivação reproduzível, somente leitura: `node tools/calibrar-distancia-radio4.cjs`. Fonte integral: `dados/Escolta_2026-10-15_23-24-03-581_historico_amostras.csv`, SHA-256 `1C85425AE6518BC0628AE7272735265B52516AF0E7DF69ED95C49DE0874238F0`.

Selecionados por IDs explícitos 12 ensaios completos da campanha atual, 360 amostras: 1..10 m mais as repetições de 4/5 m. Ambos os ensaios de 4 m são mantidos. Ajuste linear inverso de log10(distância real) em RSSI filtrado exportado; cada distância tem peso total igual, dividido entre seus ensaios/amostras. Não entram coletas históricas com outra montagem/potência nem o ensaio incompleto de 1 m no ajuste principal. Este último permanece para avaliação adicional de robustez, identificado como incompleto.

Comparação numérica aproximada dentro do próprio conjunto usado no ajuste:

| Ponto | Média anterior (m) | D1 calculada com RSSI exportado (m) |
|---|---:|---:|
| 1 m | 0,78 | 1,16 |
| 2 m | 1,32 | 1,75 |
| 3 m | 3,94 | 4,15 |
| 4 m primeiro | 7,76 | 7,06 |
| 4 m repetido | 2,72 | 3,08 |
| 5 m primeiro | 4,64 | 4,68 |
| 5 m repetido | 4,53 | 4,62 |
| 6 m | 8,46 | 7,51 |
| 7 m | 8,65 | 7,64 |
| 8 m | 8,99 | 7,88 |
| 9 m | 6,55 | 6,19 |
| 10 m | 8,05 | 7,26 |

Não melhora todos os pontos (piora 3, 9 e 10 m); não elimina a variação de 4 m. O CSV armazena RSSI filtrado inteiro, enquanto a placa calcula com float; essa simulação não reproduz exatamente cada décimo do firmware. Esses resultados são de ajuste, não de validação independente.

## O que não mudou

- Sinal p4: amarelo entra -82/sai -77, perigo entra -90/sai -86 dBm; confirmação de entrada 4 s, retorno 2 s; mediana 5 e EMA 0,30; lacuna máxima 2,5 s.
- Potência solicitada +4 dBm, advertising e PHY; mesmos diagnósticos opcionais, sem nova configuração de rádio.
- Emergência retida, exigência de proximidade/frescor/ACK, perda de conexão e botão físico.
- Medição de bateria ADC40/topo visual 4,10 V mantidos pelas mesmas flags do binário anterior.
- Pinos, UUIDs, disposição física, preferências, contas e aplicativo oficial.

App aceita explicitamente a nova tag na confirmação, sem afrouxar o RSSI mínimo (-82), frescor, estado seguro, leitura bruta ou resposta da placa. O único marcador funcional alterado além dos coeficientes é a identificação da variante para rastrear os CSVs. Serial de inicialização informa `[DISTANCE_CAL] profile=radio4-d1` com coeficientes.

**Importante:** nesta fase os estados ainda NÃO são cortes exatos de 2 e 5 metros. A fórmula muda, os limiares de alerta não. Não validar esta etapa exigindo vermelho exatamente aos 5 m nem tratar verde como garantia de estar a menos de 2 m. Botão físico continua pendente de reparo para segunda-feira e aceitação final.

## Checagens antes da gravação

Suíte JavaScript: 165 aprovados, zero falhas/TODO; TypeScript aprovado. C++: 33 verificações legadas, 11 verificações D1 e compilação dos 12 asserts do perfil p4 aprovados com o compilador Seeed. A primeira tentativa no ambiente isolado não localizou o compilador; a repetição autorizada com o compilador instalado passou.

Pacote de retorno preservado: `.expo/battery-p5-r4-top410/xiao_escolta_ble.ino.zip`, SHA-256 `584F2E453EB3B7FC943DB67AA2C4A9E7A1FCA59A88010C9A585BC76D76563158`. Build D1 separado em `.expo/distance-radio4-d1`; não sobrescrever pacote anterior. XIAO serial `8BDE14575D4B412E`, identificada na COM8 antes da compilação. Compilação, hash final e gravação ainda precisam de registro de conclusão; não inferir sucesso pelo início da compilação.

## Compilação e gravação concluídas

Compilação final aprovada no FQBN `Seeeduino:mbed:xiaonRF52840Sense`, core Mbed Seeed 2.9.3 e ArduinoBLE das bibliotecas já instaladas. Programa 335.296 bytes (41%), globais 70.056 bytes (29%). Flags anteriores preservadas (4DB, confirmação próxima, diagnóstico, TX=4, periódico, ADC40 e topo4100) mais a única flag nova `ESCOLTA_TESTE_DISTANCIA_RADIO4=1`.

Pacote `.expo/distance-radio4-d1/xiao_escolta_ble.ino.zip`, SHA-256 `5C0FE4F16226242BF012FB89EA8C98BC49D433C83EB5534BD2480C352CEA3F28`. Upload após confirmações do responsável retornou `Activating new firmware`, `Device programmed` e porta COM8; transferência DFU ocorreu na COM9. Nenhuma gravação no ESP32 ou no pacote oficial. Arquivo de política de sinal permanece SHA-256 `B928CEDC28DB6AE3531505FF4C3F46FE00B8B9F97B086F75E8AA72E1818CD9D8` nesta etapa.

Leitura passiva USB de 10 s às 23:43 de 15/10 (São Paulo) mostrou dois diagnósticos ADC40, tensão suavizada 4,1321/4,1320 V, topo visual 4,10, 100%, USB=1/carregando=1. Isso confirma execução após gravação e manutenção da indicação de bateria, não valida a distância. Não houve marcador D1 inicial nem diagnóstico de conexão/radio na janela: conferir tag e novas amostras pelo app ao retomar. Leitor serial foi ampliado apenas para reconhecer `[FIRMWARE]` e `[DISTANCE_CAL]`, sem comandos adicionais.

## Roteiro físico, após gravação confirmada

### A — conferir retomada e estabilidade próxima

1. Começar com app em espera e placa silenciosa após gravação; conferir tag `xiao-p5-r4-d1` no ensaio/diagnóstico quando conectado.
2. Tirar o USB da caixinha para os testes medidos; caixa fechada, bateria, suportes não metálicos e mesma altura/orientação. Medir com trena, sem corpo na linha durante coleta. Informar altura real; não usar a estimativa como referência.
3. A 1 m, retomar proteção, aguardar leituras e observar por 1 minuto. Deve conectar/atualizar sem alarme indevido nas condições próximas; se apitar, guardar o que houve, não atribuir automaticamente à fórmula nem mudar limiares durante a rodada.
4. Nesta marca fazer uma coleta de 30 amostras (incluída no minuto se possível), condição `D1-VALID; 1m; ...` com condições reais. Não coletar manuseando/caminhando.

### B — conferir estimativa sem repetir os dez pontos

5. Coletar 30 amostras em **2, 4, 5 e 10 m**, um ponto por vez, com prefixo `D1-VALID` e mesma montagem. Se 10 m não estiver disponível, registrar limite de alcance avaliado, sem preencher dado inexistente. Junto do 1 m são cinco ensaios/150 amostras, não nova campanha inteira 1..10.
6. Não exigir número estático ou todos os pontos perfeitos. Comparar médias/erro/dispersão e duração das oscilações. Incluir eventuais incompletos e relatos de alerta/desconexão. A aproximação do alvo deve ser avaliada em conjunto, sem escolher só o melhor trecho.
7. Exportar `Histórico completo + Amostras detalhadas` como arquivo CSV. As novas linhas serão separadas pela tag e prefixo. Distância no painel é arredondada; usar CSV para comparação quantitativa.
8. Comparar D1 com cálculo legado nas mesmas leituras novas como referência contrafactual aproximada (RSSI inteiro exportado), além das coletas anteriores separadas. Não comparar montagens diferentes como se toda melhora/piora fosse efeito do software. Se piorar o conjunto de conferência ou produzir regressão funcional, revisar/retornar; não declarar aprovada por melhora só nos dados de ajuste.

### C — regressão curta dos alertas que devem permanecer iguais

9. Afastar até amarelo confirmado, se ocorrer com vínculo, e voltar: bipe lento e retorno a protegido como antes. Não contar quatro segundos a partir do primeiro passo: filtro e propagação acrescentam atraso. Sem amarelo durante deslocamento rápido não é falha por si só.
10. Provocar uma emergência por afastamento/perda real de enlace em ensaio entre adultos. Retornar perto: emergência deve continuar retida; confirmação com leituras recentes/resposta da placa deve encerrar. Não exigir teste do botão solto. Interromper se houver problema físico.
11. Próximo, deixar 2 minutos com tela bloqueada e desbloquear: vínculo/leituras devem se manter/retomar adequadamente sem novo alerta indevido. Não confundir com aprovação de autonomia completa/forçar parada do processo.

Conduzir no chat em blocos pequenos, começando pela retomada próxima e coleta de 1 m. Esse roteiro ainda não foi executado com D1.
