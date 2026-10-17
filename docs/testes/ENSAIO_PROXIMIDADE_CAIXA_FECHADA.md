# Ensaio de proximidade — caixa fechada

## Objetivo e referência

A distância real é medida com trena. A estimativa BLE é o resultado sob avaliação,
nunca a referência de distância. Não foram alterados os limites nem a calibração
do firmware nesta preparação. O código salvo usa referência de −71 dBm a 1 m,
expoente 2,5, atenção em −70 dBm e perigo em −86 dBm. Isso corresponde apenas
na fórmula a cerca de 0,9 m e 4 m, respectivamente. Confirmar o firmware gravado
antes de atribuir esses parâmetros a um ensaio físico.

Esse parágrafo descreve o firmware anterior usado na preparação das coletas.
A revisão posterior `xiao-p1` mudou a filtragem e o limite de atenção, sem
forçar uma nova escala em metros. Ver [revisão de proximidade p1](REVISAO_PROXIMIDADE_P1.md)
e registrar a identificação do firmware antes de comparar novos ensaios.

A revisão atual `xiao-p2` também ajusta experimentalmente a escala em metros.
Ver [calibração e limitações p2](REVISAO_DISTANCIA_P2.md). Os resultados já
coletados não foram recalculados nem substituídos por simulações.

## Procedimento inicial

1. Usar adultos e um ambiente controlado, sem criança. Manter o botão acessível.
   Os alertas reais continuam habilitados; rever as preferências antes de começar.
2. Caixa fechada, alimentada pela bateria, e celular em apoios não metálicos,
   na mesma altura. Registrar modelo do celular, ambiente e orientação nas notas.
3. Medir centro a centro com trena e marcar de 1 até 15 m, de metro em metro,
   até onde houver espaço disponível. Não mudar a orientação ao mover o celular
   entre as marcas. Manter o operador fora do caminho. Se não houver espaço,
   encerrar no último ponto medido: os ensaios anteriores continuam guardados.
   Se perder a conexão, registrar a distância e a interrupção, sem inventar uma
   estimativa para o trecho sem vínculo. Não há alcance mínimo de 15 m garantido.
4. No aplicativo: **Sistema → Ensaio de proximidade**. Deixar a caixa fixa e
   afastar o celular metro a metro. Parar na marca e selecionar a distância real
   antes de cada coleta. Não medir enquanto caminha entre as marcas.
5. Começar em 1 m. Iniciar ensaio; aguardar 10 s de estabilização e 30 amostras
   novas, normalmente mais 30 s. Não mover os aparelhos nem minimizar o aplicativo.
6. Ao concluir, registrar/exportar. Repetir três vezes por posição, de preferência
   em percursos de ida e volta. Identificar repetição e percurso nas notas.
7. Se houver alarme, a coleta não é silenciada e pode continuar registrando.
   O alerta não impede iniciar o ensaio seguinte nem exige confirmação de
   segurança entre as posições. Basta haver vínculo, proteção ativa e leitura nova.
   Para encerrá-lo, interromper a coleta e voltar à Central para confirmar segurança.
   Guardar os ensaios interrompidos como tais, sem misturá-los aos completos.
8. Exportar o histórico CSV pelo compartilhamento e enviar o texto/arquivo ao
   pesquisador. Não exporta automaticamente para nuvem ou GitHub. São retidos
   os últimos 100 ensaios no aparelho; exportar antes de limpar dados/reinstalar.

## O que é registrado

Distância real, notas, horários, RSSI bruto lido pelo celular, último RSSI bruto
informado pela placa (quando disponível), RSSI filtrado da placa, estimativa
recebida sem arredondamento extra para metros inteiros, estado e pânico ativo.
São instantâneos por notificação (~1 s), não todas as leituras de RSSI de 500 ms.
O celular registra uma sequência e um horário após a leitura e a escrita BLE
confirmada; uma leitura repetida não é contada novamente. Uma notificação só é
aceita com leitura de até 2 s. Os dados da placa e do celular são assíncronos:
o RSSI bruto da placa pode se referir à leitura anterior. O firmware atual não
envia sequência de processamento, portanto não se alega sincronização exata.

A coleta é marcada incompleta ao perder vínculo, entrar em espera, sair do
primeiro plano, ficar mais de 5 s sem leitura nova ou ser interrompida. O estado
de pânico é retido até confirmação humana: amostras em pânico não são número de
disparos e não identificam a causa. Observar e anotar o momento do primeiro
disparo e se ocorreu por botão, sinal fraco ou desconexão quando isso for conhecido.

## Análise posterior

Comparar média, mediana e dispersão do RSSI em cada distância; erro absoluto
médio e faixa mínimo–máximo da estimativa. Ajustar referência e expoente com
parte das repetições e avaliar com repetições separadas, não apenas aquelas
usadas para o ajuste. Separar o ensaio de precisão do ensaio de tempo de alerta:
este último exige trajetórias e tempos conhecidos, após definir os limites.

Depois repetir em condições de uso: mudança de orientação, corpo entre os
aparelhos e obstáculos. Não calibrar automaticamente a cada conexão: conectar
longe poderia ser interpretado indevidamente como a referência de perto.
Não alegar distância exata nem aprovação do protótipo para supervisão infantil.
