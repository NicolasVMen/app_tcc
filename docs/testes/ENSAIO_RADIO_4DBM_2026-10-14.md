# Ensaio isolado de potência da conexão: +4 dBm

Estado atual: compilado e gravado em espera; controlador confirmou aplicação e manutenção de +4 dBm nos dois checkpoints. Comparação física de bloqueio/transições e validação da distância ainda pendentes.

O responsável confirmou Sentinela em espera e depois recarga do app pelo `r`, com permanência em espera e silêncio. O diagnóstico anterior leu potência atual 0 dBm, advertising 0 dBm e PHY TX/RX LE 1M. O máximo genérico 20 dBm não é capacidade física do nRF52840.

## Identificação e isolamento

- Variante de teste `xiao-p5-r4`, macros p4/p5, diagnóstico e `ESCOLTA_TESTE_RADIO_TX_DBM=4`.
- Somente potência da conexão é solicitada. Advertising permanece sem ajuste; não há solicitação de outro PHY, ganho automático, alteração de MTU/intervalo ou gravação direta em registradores de rádio.
- Portas/UUIDs/telemetria mantidos; a identificação distinta é registrada em novas exportações. As coletas antigas continuam identificadas como p5 anterior e não são reescritas.
- Fonte fora dos macros experimentais mantém o firmware p5 anterior. O APK oficial não foi instalado/substituído e seu fluxo de confirmação permanece no ramo legado.
- App reconhece exatamente `xiao-p5-r4` como variante com a mesma lógica de reset p5, somente no fluxo de validação de teste. Não aceita prefixos ou versões antigas e não dispensa leituras recentes, RSSI bruto/filtrado ou ACK real.

## Aplicação e falha

O controlador é consultado para obter a potência anterior da conexão efetiva; leitura inválida não autoriza alteração. Após solicitar +4, é feita leitura posterior. Sucesso exige retorno zero tanto da escrita quanto da leitura e valor exatamente 4 dBm. Se isso não ocorrer e o valor anterior não estiver confirmado, tenta retornar à potência anterior e registra retorno/leitura do rollback. Falha de rollback também é registrada; não é apresentada como sucesso.

Dois checkpoints de leitura após 1,5 e 3 segundos verificam persistência, sem reconfigurar adaptativamente. A sessão do ensaio é reiniciada nos eventos de conexão/desconexão, inclusive se ambos ocorrerem entre iterações do loop. LEDs, botão, modo de espera, retenção de emergência e filtro continuam com as regras p5.

## Limites da comparação

Neste primeiro ensaio, mantém-se entrada de amarelo -82 dBm, vermelho -90 dBm e confirmação de 4 segundos para isolar a variável de rádio. Isso NÃO torna os pontos físicos de alerta anteriores válidos para +4. Maior potência pode reforçar sinal perto e longe, ampliar a distância até alarmes e alterar a possibilidade de confirmação baseada em RSSI; não é comprovante de presença física da criança.

A fórmula de distância anterior é preservada, não recalibrada nem tratada como verdade durante o ensaio. Não avaliar sucesso apenas por metros menores ou por sumir o amarelo. Comparar RSSI/estados em cenário de bloqueio conhecido e em afastamento; reavaliar escala, confirmação e transições antes de qualquer promoção. Bancada/adultos apenas, sem uso como proteção real durante a experimentação.

## Verificação antes de gravação

- TypeScript aprovado.
- 124 testes JavaScript aprovados: incluem reconhecimento exato do perfil, recusa distante, ACK de segurança, contratos do ensaio, fallback e isolamento.
- 13 static_assert C++ da política de potência aprovados, mais parser e lógica de confirmação p5 aprovados.
- Bundle Android atualizado servido pelo Metro com HTTP 200 e identificação radio4 presente.
- Compilação completa aprovada: 334720 bytes de programa (41%) e 70056 bytes globais (29%).
- Pacote DFU SHA256 `19BB0B96112DC021B63124BD9347CACE2C3464EA05D963A3C548146FCF8AEA78`, em `.expo/radio-p5-4dbm-teste`.
- Identidade USB revalidada: XIAO Sense, serial 8BDE14575D4B412E, COM8. Gravação em espera via DFU COM9 concluída com `Device programmed`; aplicação retornou à COM8.
- A conclusão da gravação não foi usada como comprovação de potência; a captura de controlador descrita abaixo trouxe essa evidência posteriormente.

Pacotes de retorno preservados: p5 DFU original `F3715E869A2A2BFACC944F1D7ED61081FF671612F6824F975D47928422FEBA98` e diagnóstico somente leitura `D4C33465A7E6040D9BE5EF2EA04054E945986F724EFC6E48C90653C1C4F626B5`. Ambos mantêm potência de conexão padrão observada de 0 dBm após reinicialização, ainda sujeita à consulta para comprovar cada retorno.

## Próximas evidências

1. Gravação em espera e captura de `[RADIO_POWER]`, `[RADIO_DIAG]` e dois `[RADIO_POWER_VERIFY]` pelo USB.
2. Se aplicado e mantido, comparação física do cenário já conhecido, sem repetir toda a campanha de trena. Registrar firmware, condições e novos CSVs.
3. Se não aplicado/mantido, não aprovar ensaio; voltar ao pacote preservado com a placa em espera e apurar a falha.

## Captura após confirmação “conectado”

O leitor USB recebeu:

```text
[RADIO_POWER] profile=p5-r4 handle=0 before_status=0 before_dbm=0 requested_dbm=4 set_status=0 read_status=0 actual_dbm=4 applied=true
[RADIO_DIAG] build=p5-radio4 handle=0 tx_status=0 tx_dbm=4 max_status=0 max_dbm=20 phy_status=0 tx_phy=1 rx_phy=1 adv_status=0 adv_dbm=0
RSSI App: -62 | Filt: -62.0 dBm | ~0.6 m | seguro
[RADIO_POWER_VERIFY] profile=p5-r4 checkpoint=1 read_status=0 actual_dbm=4 retained=true
RSSI App: -62 | Filt: -62.0 dBm | ~0.6 m | seguro
RSSI App: -62 | Filt: -62.0 dBm | ~0.6 m | seguro
RSSI App: -62 | Filt: -62.0 dBm | ~0.6 m | seguro
[RADIO_POWER_VERIFY] profile=p5-r4 checkpoint=2 read_status=0 actual_dbm=4 retained=true
RSSI App: -62 | Filt: -62.0 dBm | ~0.6 m | seguro
```

Escrita/leitura retornaram zero; potência anterior reportada 0, posterior 4 dBm; ambos os checkpoints reportaram 4 dBm com status zero. PHY permaneceu LE 1M TX/RX e advertising 0 dBm. O máximo genérico 20 continua sem representar a capacidade do chip. São valores do controlador, não potência irradiada medida por instrumento externo.

As cinco leituras RSSI foram -62 dBm, todas seguras, com estimativa antiga de 0,6 m. Não foi informada distância real medida para esta captura; não se conclui precisão de 0,6 m. A captura anterior em 0 dBm tinha -68 a -66 dBm, mas não houve controle documentado de posição/orientação entre capturas; não chamar essa diferença de ganho físico medido causalmente de +4 dB.

Próxima comparação proposta: dois ensaios novos de 30 amostras a 1 m real, sem e com braço no cenário de mesa que causava atenção. Mesma posição, altura, orientação e alimentação entre os dois; preferir bateria para representar a caixa em uso, retirando somente USB após a captura. Não refazer toda a campanha de metragens nem recalibrar a fórmula apenas para o valor parecer correto.

## Ponto de retomada

O responsável pediu continuar mais tarde por indisponibilidade de créditos. Nenhum dos dois novos ensaios de 1 m foi iniciado neste chat antes da pausa. XIAO permanece com variante experimental `xiao-p5-r4`; controlador confirmou +4 dBm, mas falsos amarelos, escala e transições não foram aprovados. APK oficial preservado. Leitor USB encerrou normalmente após capturar potência/checkpoints; não há captura ou compilação pendente. Estado em espera ao guardar será solicitado ao responsável, não presumido nem acionado automaticamente. Retomar com comparação sem/com braço, sem gravar outra variante ou gerar APK antes de retomar a validação combinada.

O responsável retornou, pediu o comando do servidor, discutiu uma possibilidade de GPS e decidiu manter a arquitetura atual e seguir com os testes. GPS do celular permanece informação opcional do responsável, sem alteração de código/escopo nem uso como medidor de distância até a XIAO. Os dois ensaios a 1 m serão novamente orientados; ainda sem resultados ou CSVs novos recebidos nesta retomada. Verificar conexão no Escolta Teste antes da coleta e registrar condições distintas de braço, alimentação e apoio do celular. Não assumir servidor iniciado apenas por ter fornecido o comando.

Atualização após nova coleta: recebeu-se o anexo f26282f8-1c2a-4484-8803-01f19aef336e com três ensaios novos radio4, todos 30/30 seguro e sem bipes relatados. Filtrado médio -62,40, -75,63 e -74,20 dBm, a 1 m informado; estimativas médias 0,60, 1,90 e 1,67 m. A queda entre primeiro/segundo não foi causada comprovadamente pelo relógio e exige esclarecer alimentação/geometria. Ver `ANALISE_RADIO4_TRES_ENSAIOS_1M_2026-10-14.md`. Os parágrafos anteriores são o histórico da preparação, não declaração de ausência atual de resultados.
