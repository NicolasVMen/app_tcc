# Comparação offline de alarmes com alvo 3/5 m — 17/10/2026

## Escopo e conclusão

Responsável atualizou o alvo para amarelo a aproximadamente 3 m reais e emergência a aproximadamente 5 m reais, sem disparos por picos. Autorizou primeiro a comparação nas coletas existentes. **Não alterados aplicativo, firmware, fórmula de distância, potência ou dispositivo.** Criado somente um programa de análise e este relatório.

Há candidato retrospectivo melhor, mas **nenhuma solução validada para separar 3/5 m**: Kalman escalar Q=1 dB²/s, R=4 dB², amarelo -77 dBm/vermelho -85 dBm, confirmação 4 s, teve melhor compromisso nas séries comparadas. Na conferência de 17/10 manteve 1/2 m verdes, 3/4 m amarelos e 7/10 m vermelhos, **mas manteve 5 m verde**. Não recomendar promoção à oficial nem prometer resolução do requisito por esse resultado. Q/R são hipóteses de modelagem, não parâmetros medidos do sensor.

## Fontes e separação

- Ajuste: 12 séries completas/360 amostras de 15/10, IDs explícitos já selecionados em `tools/calibrar-distancia-radio4.cjs`. Distâncias 1 a 10 m, incluindo ambas as séries de 4 e de 5 m. Nada desfavorável foi excluído.
- Comparação cronológica: 7 séries completas/210 amostras de 17/10, 1/2/3/4/5/7/10 m, D1. A D1 alterou conversão para metros, não filtro/limites originais.
- Controle de proximidade: quatro séries completas/120 amostras de 1 m em 14/10 com tag `xiao-p5-r4`, incluindo condição declarada com braço. IDs `1792016012956-xmodza`, `1792016182112-srmlk7`, `1792016324409-et0d28`, `1792017373986-hr6ipq`.
- Interrompidos e firmware anterior ao experimento +4 não misturados ao ajuste. Os ensaios iniciais continuam preservados e comparados em `VALIDACAO_D1_COMPARACAO_HISTORICA_2026-10-17.md`: já indicavam ambiguidade entre distâncias. Não atribuir efeito causal à potência comparando ambientes diferentes.

Total 690 amostras em 23 séries. Não são 690 experimentos independentes. Todos os dados já tinham sido vistos; esta é comparação retrospectiva, não validação cega/prospectiva.

## Método e limitações da reprodução

1. Reaplicar filtros ao **RSSI bruto exportado**, não ao RSSI já filtrado (evita dupla filtragem).
2. Comparar mediana5+EMA0,30 atual, oito Kalman escalares (Q=0,1/0,5/1/2 e R=4/16) e dois mediana5+Kalman (Q=0,5/2; R=16).
3. Usar timestamps originais; reiniciar filtro/candidato em lacunas superiores a 2,5 s. Inicializar estado verde e filtro sem histórico separadamente em cada série. A emergência fica retida depois do primeiro vermelho simulado; não inventar confirmação humana.
4. Preservar janela inicial de cinco amostras, confirmação 4 s, mínimo de três amostras candidatas, histerese +5 dB no amarelo/+4 dB no vermelho e retorno 2 s. Não otimizar o tempo com dados estacionários: esses dados não medem cruzamento dos limites durante caminhada.
5. Buscar amarelo de -90 a -65 dBm, vermelho de -100 até um dB abaixo do amarelo (585 pares por filtro), apenas nas séries de ajuste. Critério: maior proporção da cor-alvo nos últimos 10 s de cada série, pesos iguais por distância e divididos entre repetições; empate favorece menos subalerta e depois proximidade dos limites atuais.
6. Alvos convencionados: <3 m verde; de 3 a <5 m amarelo; >=5 m vermelho. A contagem começa na primeira amostra exportada, não quando o usuário cruzou uma distância. Os dados exportados são ~1 Hz; o firmware processa leituras mais frequentes (~2 Hz). Não há amostras intermediárias nem pré-histórico suficientes para reproduzir exatamente o firmware ou seus estados gravados.

O escore abaixo representa **cor na cauda dos replays aproximados**, não precisão da distância, taxa de detecção física generalizável, probabilidade de segurança ou nota de aprovação. Tempos de disparo simulados após partida fria (~9–11 s nos exemplos) não substituem medição da latência real caminhando. Parâmetros de produção não são escolhidos somente por esse escore.

## Resultados

| Configuração simulada | Ajuste 15/10 | Comparação 17/10 | Controles de 1 m |
|---|---:|---:|---:|
| Mediana5+EMA0,30, limites atuais -82/-90 | 78,0% | 59,7% | 100% |
| Mesmo filtro, limites -77/-85 | 95,0% | 71,4% | 97,5% |
| Kalman Q1/R4, limites -77/-85 | 95,0% | 85,7% | 100% |
| Kalman Q2/R4, limites -77/-85 | 87,0% | 85,7% | 100% |

Separar efeitos: Kalman Q1/R4 com **limites atuais -82/-90** obteve 62,3% na comparação de 17/10, contra 59,7% do filtro atual. Portanto, não atribuir toda a melhora de 59,7 para 85,7% ao filtro. Também não confundir 100% nos quatro controles estacionários com ausência de falsos alarmes em qualquer ambiente.

A busca nas séries antigas selecionou -77/-85 para o filtro atual (95%); selecionou -78/-85 para Kalman Q1/R4 (95%), que ficou em 79,2% na conferência de 17/10. O perfil Kalman Q1/R4 -77/-85 acima é uma **comparação exploratória com limites comuns**, identificada após ver os resultados novos. Não chamá-lo de seleção independente. O programa imprime todas as 11 variantes, inclusive as desfavoráveis.

| Distância de 17/10 | Alvo | Mediana+EMA -77/-85, final | Kalman Q1/R4 -77/-85, final |
|---:|---|---|---|
| 1 m | Verde | Verde | Verde |
| 2 m | Verde | Verde | Verde |
| 3 m | Amarelo | Amarelo | Amarelo |
| 4 m | Amarelo | Vermelho antecipado | Amarelo |
| 5 m | Vermelho | **Verde: falha** | **Verde: falha** |
| 7 m | Vermelho | Vermelho | Vermelho |
| 10 m | Vermelho | Vermelho | Vermelho |

O controle de 1 m com celular na mesa teve amarelo ao fim do replay mediana+EMA -77/-85; trocar somente os limites reintroduz o incômodo de proximidade que motivou os ajustes anteriores. Kalman Q1/R4 não o fez nesses quatro controles. Nenhum dos 11 perfis com seus limites selecionados nas séries antigas resolveu o 5 m de hoje: a medição nessa distância é estável e forte, não um pico isolado. O primeiro 4 m de 15/10 também continua com vermelho antecipado no candidato, apesar de a repetição de 4 m ficar amarela. Não esconder esse erro do conjunto de ajuste.

## Decisão e próxima validação possível

Não gravar automaticamente o melhor escore como solução pronta. O requisito de emergência aproximadamente aos 5 m continua aberto. Se aprovado preparar um candidato experimental, preservar rollback e confirmar espera/USB antes de gravar; comparar especialmente falso alerta próximo e resposta a 3/4/5 m, incluindo mudança de orientação. Não repetir toda a campanha de 1–10 m como rotina. O ponto de 5 m precisa de conferência física focalizada, pois nenhum ajuste demonstrado corrigiu essa condição; uma repetição não garante funcionamento em todos os ambientes.

Kalman não muda potência, não habilita Channel Sounding e não transforma RSSI em distância real medida. Exibir faixas aproximadas também não corrige a classificação de alerta.

## Reprodução e verificações

`node tools/comparar-alarmes-3-5m.cjs`

Somente leitura de CSVs; imprime JSON, não grava APK/firmware nem acessa ADB/USB. Checagens incluídas: limites de classe 2/3/5 m; verde constante; primeira confirmação após janela+4 s; rejeição de duas quedas isoladas pelo filtro atual; lacuna que não completa confirmação; retenção de pânico; sinal constante em todos os filtros; integridade de tempos/RSSI/contagens; constantes do perfil atual. Checagem sintática e todas essas verificações passaram. Não é teste compilado da implementação C++ nem certificação física.
