# Rodada de calibração RSSI de 1 a 10 m — radio4

## Direção do responsável

Em 15/10 o responsável pediu nova campanha até 10 m, antes do backup/pacote candidato/teste sem servidor. Reparo dos fios do botão foi adiado para segunda-feira. Esta rodada substitui a proposta mínima anterior de apenas complementar 2 e 5 m; não significa que os dados antigos serão apagados ou que a nova calibração já está aprovada. Não alterar potência, filtros, limites, fórmula ou firmware durante a campanha. Estado funcional atual esperado: `xiao-p5-r4`, conexão configurada em +4 dBm, conforme diagnóstico anterior; a tag sozinha não mede potência irradiada nem confirma a configuração de toda conexão futura.

## Antes de ligar ou coletar

- Testes entre adultos, sem criança. Não usar protótipo como garantia de supervisão.
- Fios soltos devem estar isolados individualmente e componentes firmes, sem risco de contato entre terminais. Isolar/manusear com alimentação desligada. Se não puder assegurar isso, adiar os ensaios físicos até o reparo. Não exigir operação com cobre exposto para cumprir prazo.
- Exportar o histórico atual antes da rodada: há limite de 100 ensaios, e arquivos antigos não devem ser apagados para limpar a análise.
- Usar Escolta Teste com a mesma placa/caixa fechada, somente na bateria, e celular sem cabo. Anotar percentual/tensão inicial e final, sem extrapolar autonomia a partir dos passos percentuais.
- Preparar linha de 1 a 10 m com trena, usando sempre os mesmos pontos de referência (por exemplo, centros dos dois dispositivos). Não medir pela estimativa do aplicativo ou pelo tamanho dos passos.
- Colocar caixa e celular em apoios não metálicos, na mesma altura efetivamente medida, preferencialmente próxima de 1 m. Não alternar chão/mesa/suporte entre pontos. Registrar altura real no campo do app.
- Manter orientação relativa dos dispositivos e da caixa constante, sem mão/braço/corpo atravessando a linha durante as amostras. Evitar mudar ambiente, portas, posição de móveis, alimentação, relógio próximo ou preferências durante a rodada. Registrar o ambiente real, sem inventar espaço aberto/ausência de obstáculos.

## Coleta e identificação

Sistema → Ensaio de proximidade. Proteção ativa, conexão e leitura recente; manter a tela do ensaio aberta. Não mudar o timeout do sistema por código nem presumir que a tela ficará ligada: o operador deve impedir bloqueio durante cada coleta, sem mover o celular. Se bloquear/sair, o app registra interrupção; não chamar ensaio incompleto de concluído.

Recomendação para separar ajuste e conferência, ainda não executada: duas passagens de 1 a 10 m (20 ensaios de 30 amostras, total planejado 600). Reservar a segunda passagem para validar o modelo escolhido com a primeira, antes de retocar parâmetros. Se resultados forem incompatíveis, relatar sobreposição/variabilidade em vez de selecionar só amostras favoráveis. Essa recomendação precisa ser confirmada com o responsável; não registrar 600 amostras como existentes.

1. Primeira passagem: 1, 2, 3, 4, 5, 6, 7, 8, 9 e 10 m. Na condição, usar prefixo `CAL15-R4-A;` seguido de ambiente, caixa fechada e alimentação. Exemplo somente se verdadeiro: `CAL15-R4-A; corredor; caixa fechada; bateria; apoios; mesma orientação; sem corpo entre aparelhos`.
2. Em cada marca, selecionar a distância real correta, iniciar, deixar os aparelhos assentados antes de terminar a contagem de 10 s, retirar a mão e permanecer fora da linha. Esperar conclusão de 30/30 antes de mover o celular. Não coletar caminhando.
3. Amarelo/vermelho não bloqueiam o próximo ensaio, não exigem reset e não congelam legitimamente o RSSI. Não desligar alarmes só para obter dados. Se for necessário parar por incômodo, interromper e guardar; não usar fones/tampar buzzer como alteração silenciosa da condição.
4. Se perder vínculo ou ficar sem dados novos, preservar o resultado incompleto e anotar a marca/ocorrência. Não registrar RSSI zero, distância artificial nem preencher ponto sem medição. Não é garantido concluir 10 m em qualquer ambiente.
5. Exportar CSV ao terminar A. Voltar para perto (cerca de 1 m), aguardar leitura segura e confirmar segurança na Central se houver emergência retida; não tentar limpar o alerta de longe. Essa ação não depende do botão físico danificado.
6. Segunda passagem: repetir 1 a 10 m, prefixo `CAL15-R4-B;`, mantendo a montagem. Exportar CSV ao terminar B. A exportação pode conter histórico antigo junto; IDs, horários e prefixos serão usados para separar, sem reescrever os ensaios antigos.
7. Enviar arquivo CSV/texto completo, não apenas prints das médias. Não é necessário copiar RSSI manualmente em cada posição. Relatar se algum ponto teve movimento, pessoa passando, reconexão ou outra alteração não registrada nas notas.

O app atual aguarda 10 s, registra 30 notificações espaçadas com leitura nova, aceita alerta ativo e interrompe ao sair do primeiro plano, entrar em espera, perder vínculo ou exceder lacuna. São instantâneos por notificação, não todas as leituras de 500 ms. RSSI da placa exportado é arredondado; leitura do celular e telemetria são assíncronas. Não alegar sincronismo/precisão inexistentes.

## Análise depois de receber os dados

Atualização após recebimento: o responsável decidiu dispensar a segunda passagem completa. Foram recebidos dez ensaios completos, 300 amostras novas, condição `Teste 1`, sem prefixo A/B e sem altura preenchida. Ver `ANALISE_CALIBRACAO_RADIO4_1_A_10M_2026-10-15.md`. A passagem pode embasar ajuste provisório; não existe conjunto B reservado. Substituir a repetição integral por conferência física curta depois do ajuste, especialmente 4/5 m, pois houve inversão importante entre esses pontos. Os passos de duas passagens acima ficam como plano original, não como execução concluída.

- Conferir firmware, distâncias, altura/notas, integridade de 30 amostras, atualidade/IDs/lacunas e separação A/B. Não misturar campanha anterior à potência atual no ajuste principal.
- Comparar mediana/média/dispersão por ponto e sobreposição entre faixas, particularmente 1/2 m e 4/5/6 m. Não impor monotonicidade artificial aos dados medidos.
- Ajustar referência/expoente ou avaliar alternativa simples com a passagem A; comparar erro e classificação na B reservada. Não retocar o modelo repetidamente na B e ainda chamá-la de validação independente. Coletas da mesma campanha não demonstram generalização a outros ambientes/celulares.
- Faixas pretendidas: verde perto de até 2 m, amarelo aproximadamente 2–5 m, vermelho a partir de aproximadamente 5 m. Convencionar fronteiras sem sobreposição e derivar limites de uma mesma política de conversão, mantendo confirmação temporal/histerese e margem de retorno explícitas. Não tratar metros estimados como trena.
- Rever juntos firmware, apresentação, fallback legado e confirmação de segurança do app se os limiares mudarem; não deixar `SAFE_SIGNAL_MIN_RSSI` ou versão aceita divergentes. Não alterar apenas o número em metros para acompanhar uma cor.
- Depois de gravar variante autorizada em espera/USB, fazer regressão curta real de verde/amarelo/vermelho, retorno, confirmação próxima e tela bloqueada. Botão físico só após reparo; isso continua condição da aceitação final, mesmo que candidato seja gerado antes.

## Pulseira informada nesta etapa

Descrição enviada pelo responsável: nylon, velcro, 22 mm de largura, 26 cm de comprimento, 7 g, pinos separados. Os pinos não serão usados na caixa. Página de anúncio não pôde ser carregada pela ferramenta; não foram confirmados fotos, dimensões da ponta/terminal, espessura ou identidade do vendedor nesta verificação.

CAD local `hardware/case_3d/escolta_case_v2.scad`: `strap_slot_length=22`, `strap_slot_width=2.8`, corte atravessando a alça. Logo abertura nominal em planta 22 × 2,8 mm, sem folga nominal de largura para fita de 22 mm. A peça impressa pode diferir; não garantir que nylon flexível ou ponta dobrada/velcro/terminal passem. Medir a abertura real e a seção que precisa atravessá-la. Uma fita de 20 mm oferece folga lateral nominal maior, mas o terminal e espessura também precisam caber. Comprimento útil deve considerar percurso pelas alças/caixa, pulso e sobreposição de velcro; 26 cm anunciados sozinhos não certificam ajuste/conforto/retenção. Não alterar o CAD nem orientar forçar/cortar alças nesta etapa.

Anúncio fornecido: https://produto.mercadolivre.com.br/MLB-4091933687-pulseira-compativel-garmin-fenix-8-7-6-5-velcro-nylon-22mm-_JM?variation=188337812397
