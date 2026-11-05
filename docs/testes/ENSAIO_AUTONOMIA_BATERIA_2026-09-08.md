# Ensaio preliminar de autonomia da bateria

> Nota de interpretação adicionada em 04/11/2026: este é um registro histórico,
> anterior à variante W1 e ao APK oficial 1.0.1. O tempo observado entre os
> indicadores inicial/final não demonstra capacidade entregue em mAh, corrente
> média ou autonomia integral. As projeções de 13,7 mA e 13 horas abaixo foram
> estimadas a partir da capacidade nominal e de percentuais por tensão, não
> medidas com instrumento; não utilizá-las como resultados experimentais no TCC.
> O efeito do bloqueio de alertas sobre consumo também não foi quantificado.
> Na redação final, informar apenas 11 h 10 min naquele ciclo e condições,
> sem generalizar para uso diário, configuração atual ou todos os aparelhos.

## Identificação

- Protótipo: Escolta UNITAU
- Placa: Seeed Studio XIAO nRF52840 Sense
- Bateria: LiPo 3,7 V / 180 mAh com proteção PCM/BMS
- Aplicativo: versão 1.0.0 em Samsung Galaxy S24 Ultra
- Início: 08/09/2026 às 19:52
- Encerramento conservador: 09/09/2026 às 07:02

## Condições

O dispositivo permaneceu alimentado somente pela bateria, conectado por BLE ao
celular e executando o monitoramento contínuo. As saídas automáticas de alerta
foram temporariamente bloqueadas para que o ensaio pudesse ocorrer sem disparos.
O buzzer permanece naturalmente desligado durante o estado protegido, portanto
esse bloqueio não altera de forma relevante o consumo esperado nesse estado.

A porcentagem é uma estimativa baseada na tensão da célula e não deve ser
interpretada como medição laboratorial de carga acumulada.

## Registros

| Momento | Horário | Percentual estimado | Tensão | Tempo decorrido |
|---|---:|---:|---:|---:|
| Início válido após reprogramação | 08/09 19:52 | 90% | 4,09 V | 00h00 |
| Bateria baixa | 09/09 05:56 | 10% | 3,58 V | 10h05 |
| Encerramento conservador | 09/09 07:02 | 5% | 3,54 V | 11h10 |

## Resultado preliminar

O protótipo funcionou por aproximadamente **11 horas e 10 minutos** entre 90%
e 5%. Considerando a capacidade nominal de 180 mAh e a variação indicada, o
consumo médio preliminar é da ordem de 13,7 mA e a autonomia integral projetada
fica próxima de 13 horas.

Para a comunicação acadêmica, o resultado deve ser apresentado de forma
conservadora como **autonomia superior a 10 horas em monitoramento contínuo**.
Não foi realizado descarregamento forçado até o corte da proteção da bateria.

## Próximos ensaios

1. Repetir o monitoramento contínuo por mais dois ciclos.
2. Calcular média, mínimo, máximo e variação entre os ciclos.
3. Medir separadamente o consumo/autonomia no modo de espera.
4. Restaurar as saídas de alerta e medir o consumo durante emergências em
   intervalos curtos e supervisionados.

## Encerramento do modo de ensaio

Em 17/09/2026, o bloqueio temporário das saídas foi removido. O aplicativo e o
firmware da XIAO voltaram à operação normal, com buzzer, sirene, vibração e
notificações habilitados conforme os estados e as preferências do sistema. Os
próximos ensaios de alerta devem ser curtos e supervisionados.
