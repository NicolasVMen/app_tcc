# Autonomia em uso — protocolo e coletor propostos

Data: 04/11/2026. **Planejamento, não teste executado nem coletor implementado.**

Atualização posterior (05/11): o coletor A1 foi implementado e testado no código,
mas ainda depende de build, instalação e validação física. Ver
[implementação A1 e roteiro de validação](COLETOR_AUTONOMIA_A1_2026-11-05.md).
Esta nota não representa ensaio de autonomia executado.

## Objetivo e alcance

Medir o tempo observado de funcionamento do vestível alimentado pela bateria,
na configuração atual, e relacionar a duração a alertas, desconexões, espera e
recargas. Não estimar corrente média, capacidade entregue em mAh ou vida útil da
célula a partir da porcentagem visual. O registro não mede a bateria do telefone.

Telemetria existente: `bateria_v`, `bateria_pct`, `carregando`,
`usb_conectado`, `estado`, `panico_ativo` e `fw`, em `src/services/bleApi.ts`.
Porcentagem por tensão, com indicação visual de 100% próxima ao topo: não é
prova de carga completa nem escala linear de energia restante.

## Projeto do registro, a implementar separadamente

- Ativação explícita pelo responsável; desativado por padrão e sem coleta após encerrar.
- Consumir a telemetria existente, sem aumentar a frequência BLE ou alterar firmware,
  limiares, watchdog, potência, intervalos de conexão, alertas ou localização.
- Uma amostra por minuto, somente com dado novo e válido; identificar perda de
  dados sem repetir valores antigos como se fossem novas medições.
- Acrescentar eventos relevantes: início/fim, espera/retomada, atenção/emergência,
  confirmação, desconexão/reconexão, USB/carga, interrupção/reinício do registro.
- Persistir incrementalmente e manter dados após reinício, com escrita serializada
  por conta, sessão identificada e erro de gravação visível. Nunca sobrescrever
  registros ilegíveis nem misturar contas.
- Registrar horário civil com fuso e tempo decorrido monotônico durante cada
  execução; marcar reinícios/mudança de relógio para não inventar duração contínua.
- Integração com controlador persistente, não com o ciclo de vida de uma tela.
  Tela bloqueada/retorno do app devem ser ensaiados. Ausência de dados não prova
  desligamento da placa; morte do processo pode interromper o coletor.
- Sem nomes, e-mails, localização ou identificadores pessoais no CSV.
- Exportação manual ao final; nenhum upload ou envio de e-mail automático.
- Testes de erro de armazenamento, dados inválidos, ausência de telemetria,
  mudança de conta, reinício, recarga, relógio e exportação antes de uso prolongado.

Campos mínimos: sessão, evento, recebido_em, decorrido_ms, firmware, versão_app,
origem_da_amostra, bateria_v, bateria_pct, usb_conectado, carregando,
estado, panico_ativo, monitoramento_ativo, conectado e observação.
Campos indisponíveis permanecem vazios, nunca zero ou estado seguro inventados.

O registro usa processamento/gravação no telefone, mas não se presume efeito
nulo no consumo do vestível: confirmar que não cria operações extras BLE,
evidenciar a versão instrumentada e não equipará-la à oficial sem ressalva.
Para instrumentar a oficial, preservar APK/código e usar versão candidata
identificada; não esconder a mudança sob a mesma versão. Instalar apenas após
confirmar espera/silêncio. O registro não depende do servidor Expo durante o ensaio.

## Primeiro ciclo — passo a passo após validar o coletor

1. Verificar montagem, fios isolados e ausência de aquecimento ou deformação da bateria.
   Não comprimir a célula para fechar a caixa. Realizar o ensaio com adultos,
   sem confiar o cuidado de uma criança ao protótipo.
2. Carregar pelo método já usado e registrar tensão/indicadores; 100% visual
   sozinho não comprova fim de carga. Não modificar o carregador para este teste.
3. No celular carregado, iniciar o registro e retirar o USB da caixinha. A primeira
   telemetria válida indicando USB ausente marca o início observável em bateria.
   Registrar eventual atraso desse primeiro pacote.
4. Manter proteção ativa e usar o celular normalmente. Anotar os períodos de
   espera e eventos intencionais. Não mudar filtros/potência durante o ciclo.
5. Manter os alertas habilitados conforme as preferências documentadas. Não
   provocar uma emergência sonora prolongada para gastar bateria. Eventos naturais
   ou breves verificações supervisionadas devem constar no registro.
6. Ao receber o aviso de 20%, conferir que o vestível continua comunicando e que
   houve aviso conforme permissões/preferências. Registrar horário/tensão.
7. Encerrar o ciclo operacional no aviso de 10% e recarregar. Se houver comportamento
   anormal ou aquecimento, interromper antes. Não forçar descarga até o corte da proteção.
8. Exportar o CSV, conferir início/fim e lacunas e preservar o original.
   Se acabar por desligamento/perda de conexão, descrever a causa como não
   confirmada até inspeção; registrar o último dado válido e a confirmação humana.

O telefone pode ser recarregado durante o ensaio, anotando essa condição; o
vestível não deve receber USB durante o intervalo que será contado como descarga.
Caso isso ocorra, dividir o registro em segmentos e não somar como ciclo contínuo.

## Análise e comunicação dos resultados

- Resultado principal: duração observada até o limite operacional escolhido
  (10% estimados), com tensão inicial/final e condições. Não chamar de autonomia
  integral até desligamento. Declarar o critério e sua imprecisão.
- Calcular tempos observados por estado e trechos sem dados separadamente;
  lacunas não são tempo comprovado em protegido ou em silêncio.
- Contar eventos, recargas e interrupções; não inferir duty cycle do buzzer ou
  energia consumida apenas do estado de emergência.
- Comparar com o ciclo de setembro somente reconhecendo diferenças de firmware,
  filtro, potência, bloqueio de saídas e indicadores. Não atribuir diferenças a uma
  única mudança sem experimento controlado.
- Se possível, repetir dois ou três ciclos comparáveis para informar variação.
  Se houver apenas um, apresentá-lo como estudo de caso preliminar, sem precisão estatística inventada.
- Corrente, eficiência e capacidade em mAh exigem instrumentação apropriada
  de consumo; um coletor no app não substitui essa medição.

## Pendências

- [ ] Implementar coletor isolado e seus testes, sem mudar regras de proteção.
- [ ] Confirmar espera antes de instalar uma candidata identificada.
- [ ] Validar gravação com tela bloqueada e recuperação/exportação após reinício.
- [ ] Executar ciclos reais e verificar arquivos originais.
- [ ] Consolidar resultados no TCC; manter limitação caso o ensaio não ocorra.
