# Radio4: três ensaios a 1 m

Fonte original, sem alterações: `C:/Users/Nicolas Venciguerra/.codex/attachments/f26282f8-1c2a-4484-8803-01f19aef336e/Texto colado.txt`.
SHA256: `D1B802615B79023EA5FE5B4F2387D800B9BBFBDFE1DCF1FE583A974897DF8F6C`.

O CSV contém 172 amostras em sete ensaios: quatro anteriores p5 (30, 30, 15 e 7 amostras) e três novos `xiao-p5-r4` com 30 amostras cada. Esta análise não mistura os antigos com os três relatados agora. Modelo SM-S928B, Android 36, app 1.0.0. Nos três novos, distância real informada 1 m e altura numérica em branco.

O responsável relatou ausência de bipes em todos os três novos; disse que esqueceu de mudar a anotação antiga no primeiro, percebeu piora no segundo e fez o terceiro com o braço. O terceiro registra braço com Galaxy Watch 7 e suspeita de interferência do relógio, com percepção anterior de menor efeito no braço sem relógio. Essas observações acompanham a análise, sem reescrever CSV ou assumir uma causa comprovada.

## Resumo dos novos ensaios

Horários convertidos de UTC para America/Sao_Paulo (-03:00), 14/10/2026.

| Ordem e ID | Início local | Condição | RSSI celular médio / faixa | RSSI filtrado médio / faixa | Estimativa média / faixa | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| 1: 1792016012956-xmodza | 19:13:32 | Anotação antiga preservada; responsável relata início bom | -62,70 / -63 a -62 dBm | -62,40 / -63 a -62 dBm | 0,60 / 0,6 a 0,6 m | 30 seguro |
| 2: 1792016182112-srmlk7 | 19:16:22 | Bateria, caixa fechada, celular apoiado na mesa, sem braço | -76,33 / -83 a -67 dBm | -75,63 / -80 a -72 dBm | 1,90 / 1,3 a 2,7 m | 30 seguro |
| 3: 1792016324409-et0d28 | 19:18:44 | Mesma posição relatada, com braço e relógio na frente | -74,47 / -79 a -69 dBm | -74,20 / -76 a -71 dBm | 1,67 / 1,3 a 2,0 m | 30 seguro |

Pânico falso em todas as 90 amostras novas. Erro absoluto médio por ensaio, em relação ao 1 m informado: 0,40 m; 0,90 m; 0,667 m. Desvio-padrão populacional do RSSI do celular: 0,458; 4,331; 2,432 dB. O segundo não teve apenas sinal mais fraco: também foi mais variável.

Média do RSSI bruto da placa: -62,367; -76,333; -74,467 dBm. O campo celular não é tomado como idêntico ao da placa: houve 12 diferenças no primeiro (todas de 1 dB), nenhuma no segundo e três no terceiro (até 3 dB). A implementação monta o pacote de ensaio com a leitura mais recente do celular e a telemetria recebida da placa, assíncronas. Isso é documentado na tela; diferença isolada não demonstra corrupção ou congelamento. Usar o filtrado da placa para explicar o estado.

## Atualidade e continuidade das amostras

- 30 IDs RSSI distintos em cada ensaio. Primeiros/últimos IDs: 241/298, 578/636 e 862/920.
- Intervalos entre amostras: primeiro 987–1024 ms, segundo 947–1052 ms, terceiro 984–1027 ms. Aproximadamente uma amostra por segundo.
- Idade da leitura do celular na recepção: primeiro 17–528 ms, segundo 313–374 ms, terceiro 47–97 ms.
- Não há lacuna grande ou identificadores congelados nas séries exportadas. Isso não prova ausência de desconexão entre ensaios ou sincronismo exato entre cada leitura do celular e dado filtrado.
- Cada coleta inclui estabilização de cerca de 10 s antes das 30 amostras; a queda entre ensaios não foi exportada continuamente. Não afirmar instante exato da mudança, causa ou latência de alerta nesse intervalo.

## O que os dados permitem concluir

1. O relato de silêncio é coerente com os estados: não houve atenção/pânico nas 90 amostras novas. Nos três intervalos exportados, o filtrado ficou sempre acima de -82 dBm. No segundo, quatro leituras brutas do celular chegaram a -82/-83, mas não produziram sinal filtrado abaixo do limiar nem atenção sustentada. Não concluir que os alarmes foram desativados.
2. A piora entre primeiro e segundo é real no sinal disponível: média bruta do celular caiu 13,63 dB; a filtrada caiu 13,23 dB, ainda com 1 m informado. A fórmula de distância amplifica essa diferença em metros; não é evidência de deslocamento real.
3. O terceiro apresentou média filtrada 1,43 dB mais forte que o segundo, apesar do braço/relógio. Não se pode atribuir causalidade ao relógio, nem afirmar que ele ajuda. A equivalência de geometria, alimentação e ambiente precisa ser esclarecida.
4. O ajuste +4 dBm foi confirmado pelo controlador em captura anterior na conexão e nos checkpoints de 1,5/3 s. O CSV identifica a variante, mas não exporta potência atual. Não prova que o valor permaneceu +4 em cada minuto dos três ensaios; se as condições realmente não mudaram, uma consulta tardia/periódica somente leitura é diagnóstico adequado antes de culpar o ambiente ou aumentar novamente a potência.
5. A escala não está validada para radio4. Somente recalibrar referência para fazer o primeiro virar 1 m não resolveria os outros dois a 1 m, que apresentam RSSI muito diferente. Não ajustar fórmula/limiares a partir de uma única posição para aparentar precisão.

## Pendência antes do próximo ensaio

Foi perguntado se, entre primeiro e segundo, houve retirada do USB da caixinha ou mudança de posição/orientação, e se o primeiro também foi somente na bateria. Resposta ainda não recebida nesta análise. A alimentação do primeiro não deve ser inferida da anotação antiga genérica. Não solicitar outra campanha completa nem atribuir a diferença a relógio, perda de potência ou firmware sem evidência adicional.

Atualização: o responsável respondeu que não mudou nada, apenas manuseia o celular entre ensaios e o devolve ao lugar para coletar. Assim, não atribuir a diferença a troca intencional de alimentação/geometria. Não houve medição da orientação exata antes/depois desse manuseio. O relato não basta para demonstrar que a pequena movimentação causou a queda. A hipótese de alteração tardia da potência permanece não comprovada: será feito diagnóstico passivo periódico para verificar a configuração enquanto o sinal varia, sem reajustar potência/limiares automaticamente. O responsável confirmou espera e USB conectado antes da preparação da nova instrumentação.

M18 possui três novas execuções sem falso amarelo, mas permanece sem validação geral de estabilidade nas condições variáveis relatadas. M19 (escala/transições com radio4) continua pendente. Nenhuma potência, limite, fórmula ou versão foi alterada nesta análise.
