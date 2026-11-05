# 4 DESENVOLVIMENTO

O desenvolvimento resultou em um conjunto composto pelo vestível montado em caixa impressa em 3D e pelo aplicativo Android instalado sem dependência do servidor de desenvolvimento. Este capítulo descreve a configuração usada na etapa mais recente: aplicativo Escolta UNITAU 1.0.1, código Android 2, e firmware identificado como xiao-p5-r4-d1-k2-w1. As variantes anteriores permaneceram preservadas para permitir comparação e reprodução dos ensaios.

## 4.1 ARQUITETURA E DIVISÃO DE RESPONSABILIDADES

O sistema foi dividido em três camadas: dispositivo, comunicação e aplicativo. A XIAO executa o tratamento do sinal recebido do telefone, a leitura do botão, a supervisão da comunicação, os indicadores luminosos, o buzzer e a leitura da bateria. No celular, a biblioteca BLE estabelece a conexão, recebe notificações e obtém o RSSI do enlace. O controlador de monitoramento transforma essas informações em estados da aplicação e coordena alarmes, reconexão e histórico. As telas apresentam esse estado e solicitam ações, mas não são as proprietárias da sessão de comunicação.

No Android, o controlador persistente trabalha em conjunto com um serviço nativo em Kotlin. O serviço mantém uma notificação de monitoramento, participa das rotinas de supervisão e executa recursos de alarme. Essa divisão foi adotada para que a saída de uma tela ou a minimização da interface não encerrasse, por si só, a proteção. Ela não torna o aplicativo independente do processo Android, nem permite garantir funcionamento depois de uma parada forçada pelo usuário ou pelo sistema operacional.

Firebase Authentication é usado para autenticar o acesso ao aplicativo. O envio opcional de e-mail usa um serviço externo. Nenhum deles é responsável por calcular a proximidade ou controlar diretamente a XIAO. Depois do acesso e da conexão, o monitoramento principal ocorre localmente; uma falha de internet não deve ser confundida com perda do enlace BLE.

[[ARQUITETURA]]

## 4.2 IMPLEMENTAÇÃO DO CIRCUITO

A migração do ESP32 para a XIAO nRF52840 Sense reduziu o conjunto de desenvolvimento e permitiu utilizar o carregamento e a leitura de bateria presentes na própria placa. A montagem externa utiliza bateria LiPo de 3,7 V e capacidade nominal de 180 mAh, buzzer ativo, transistor P2N2222A, resistores de 1 kΩ e 10 kΩ, diodo 1N4007 e botão tátil normalmente aberto. A capacidade nominal foi obtida da identificação da bateria, não de um ensaio de capacidade.

O circuito de referência liga D3 à base do transistor através do resistor de 1 kΩ. O transistor atua como chave de baixa lateral para o buzzer: o controle fica no GPIO, e a corrente da carga percorre o coletor e o emissor. O resistor de 10 kΩ entre base e emissor/GND ajuda a manter o transistor desligado quando não há acionamento definido. Esses resistores externos não formam o divisor usado para medir a bateria. O divisor de tensão da XIAO é outro circuito, integrado à placa.

O diodo foi montado em paralelo com a carga sonora, com o cátodo no lado positivo, como proteção prevista no estágio de acionamento. Entretanto, o modelo e a construção interna do buzzer não foram identificados por folha de dados. Assim, não foi comprovada experimentalmente a necessidade dessa proteção para o buzzer específico utilizado, nem medida a corrente de acionamento. O funcionamento sonoro observado não substitui essa caracterização elétrica.

O botão liga D1 ao GND e utiliza a entrada com pull-up interno. O contato aberto é lido em nível alto; a pressão fecha o circuito para o terra. O firmware aplica estabilização de contato e exige acionamento sustentado. A bateria é conectada aos terminais destinados a ela na XIAO, e não ao pino de saída de 3,3 V. O caminho de carga permanece sob responsabilidade do circuito integrado da placa, sem alteração de tensão de carga pelo aplicativo.

[[PLACA]]

## 4.3 CONTRATO DE COMUNICAÇÃO BLE

O dispositivo anuncia o nome ESCOLTA_BLE e fornece um serviço GATT próprio. O aplicativo procura o periférico esperado, estabelece conexão, descobre as características, assina as notificações de estado e inicia o envio periódico de RSSI. A presença do nome e dos UUIDs é usada na integração, mas não deve ser interpretada como autenticação criptográfica de um produto comercial.

As características foram separadas por finalidade, conforme o Quadro 3. O serviço possui UUID e5c1f4a0-1234-4b5c-9abc-def012345678. Na tabela, cada sufixo completa a mesma base de UUID; os identificadores integrais permanecem no código-fonte. Essa divisão permitiu testar comandos e telemetria separadamente, sem mudar o aplicativo inteiro a cada revisão do firmware.

[[GATT]]

O firmware possui intervalo de notificação de 1 s, enquanto a rotina de processamento do sinal utiliza uma referência temporal de 500 ms. A leitura da bateria é atualizada aproximadamente a cada 5 s. Esses são intervalos programados, não garantias de recebimento em tempo real pelo celular: agendamento, comunicação e carga de execução podem introduzir atrasos.

Entre os campos transmitidos estão identificação do firmware, estado de proximidade, pânico, monitoramento ativo, RSSI bruto e filtrado, distância estimada, tensão, percentual, presença de USB e indicação de carregamento. O aplicativo valida a estrutura e a atualidade dos dados. Um valor ausente ou antigo não é substituído por distância zero nem por uma confirmação artificial de segurança.

## 4.4 FILTRAGEM, ESTIMATIVA E CLASSIFICAÇÃO

O tratamento de sinal passou por diferentes etapas. Perfis anteriores utilizaram mediana de cinco leituras e média móvel exponencial com coeficiente 0,30. Na variante K2-W1, a suavização é feita por um filtro de Kalman escalar aplicado ao RSSI bruto. O parâmetro de processo é proporcional ao tempo entre amostras, com Q = 1 dB²/s, e o parâmetro de observação é R = 4 dB². Esses valores são escolhas experimentais do modelo, não variâncias medidas por uma caracterização completa do rádio.

Em termos de implementação, a incerteza prevista cresce pelo produto entre Q e o intervalo transcorrido. O ganho é obtido pela relação entre essa incerteza e sua soma com R. A estimativa é então corrigida pela diferença entre a amostra recebida e o sinal previsto. Essa operação reduz a influência de variações instantâneas, mas não recupera informação física que não está presente no RSSI. Um sinal estável e enviesado pode continuar produzindo uma estimativa incorreta de metros.

O classificador exige uma janela inicial de cinco amostras e pelo menos três amostras candidatas antes de confirmar uma transição. Uma lacuna superior a 2,5 s reinicia o tratamento das leituras; tempo sem amostra não é contado como evidência de afastamento contínuo. A política final de limiares e temporização está resumida no Quadro 4.

[[LIMITES]]

A distância exibida utiliza a expressão d = 10^((A − r)/(10n)), na qual r é o RSSI filtrado, A é o intercepto de referência e n é o coeficiente de propagação ajustado. Na variante D1, A = −63,386376 dBm e n = 3,377961. O número de casas decimais identifica o ajuste empregado, não a precisão física do resultado. Esses coeficientes foram obtidos por ajuste inverso ponderado de log10 da distância em função do sinal, com peso total igual por distância.

O ajuste usou 12 séries completas, com 360 amostras da campanha de 15 de outubro, incluindo as duas séries de 4 m e as duas de 5 m. A estimativa não possui teto artificial de 7 ou 15 m; fora do intervalo ensaiado, os valores são extrapolações. A classificação dos alarmes é feita pelos limites de RSSI e pelo histórico temporal, não por comparação direta com o número arredondado mostrado na Central. Assim, não é correto interpretar a cor verde como certificação de uma distância física máxima.

## 4.5 EMERGÊNCIA, BOTÃO E CONFIRMAÇÃO DE SEGURANÇA

O firmware distingue afastamento por sinal crítico, perda de conexão, ausência de atualizações e acionamento manual. Para o botão, foram programados 50 ms de debounce e pressão sustentada de 1.500 ms. Um toque curto não inicia a emergência. O acionamento depende de monitoramento ativo; no modo de espera ele é ignorado, e um botão já pressionado precisa ser solto antes de um novo acionamento válido após a retomada.

No alcance reduzido, a configuração permite bipe lento no vestível; a vibração do celular acompanha a entrada no estado, conforme a preferência habilitada, e não foi projetada como vibração contínua a cada bipe. Quando o sinal retorna à faixa de recuperação pelo tempo necessário, o estado de atenção pode retornar automaticamente a protegido. Esse comportamento é diferente do pânico: depois de iniciada uma emergência, a melhora do sinal não basta para encerrá-la.

A confirmação de segurança exige uma variante reconhecida, monitoramento ativo e leituras recentes. Na configuração K2-W1, o aplicativo exige RSSI bruto e filtrado acima de −77 dBm e aguarda resposta compatível da placa, com estado seguro e pânico desativado. A XIAO também verifica suas condições internas antes de aceitar o encerramento. Se não há vínculo ou resposta válida, o aplicativo mantém o alerta. Essa regra evita o encerramento apenas por um clique, mas usa a intensidade do sinal como aproximação: não constitui prova física ou identificação da presença da criança.

Na perda do enlace, existe uma tolerância programada de 5 s para recuperação antes da emergência no aplicativo. A XIAO também possui tratamento local para desconexão. Para uma situação diferente, em que o vínculo aparenta continuar mas deixam de chegar atualizações de RSSI, a variante W1 acrescenta um watchdog de 8 s. Esse temporizador é desarmado em espera intencional. Os tempos representam mecanismos diferentes e não devem ser somados ou tratados como uma única latência garantida de alarme.

## 4.6 APLICATIVO E EXECUÇÃO EM SEGUNDO PLANO

O aplicativo foi desenvolvido em React Native, Expo SDK 54 e TypeScript, com módulos nativos Android. A navegação possui Central, Protocolo, Registros e Sistema. A Central reúne o estado de monitoramento, a estimativa de distância e a bateria. Protocolo apresenta orientações; Registros mantém o histórico; Sistema reúne perfil e preferências. Ferramentas internas de ensaio foram mantidas no código com ativação explícita de desenvolvimento e ficaram indisponíveis no APK de uso.

O controlador persistente é associado à conta autenticada e não ao componente visual de uma tela. A desmontagem da interface remove a assinatura da tela, mas não encerra automaticamente a sessão. O módulo Android foi configurado para manter o serviço ao remover a atividade dos Recentes. Ainda assim, permissões, políticas de energia, encerramento do processo e ações do usuário continuam relevantes, conforme as restrições de comunicação BLE em segundo plano descritas pelo Android Developers (2026a).

Ao retornar ao primeiro plano, o sistema verifica novamente a atualidade dos dados. Uma indicação breve de retomada ou sincronização não deve ser substituída por um estado verde com informação antiga. Foram incluídos limites de tempo nas operações, recuperação de sessão e isolamento de callbacks para reduzir condições em que uma conexão antiga continuava interferindo em uma nova tentativa.

O modo de espera é uma ação explícita. Primeiro, o aplicativo solicita a pausa e aguarda a confirmação da placa; depois cancela saídas locais, encerra o vínculo e interrompe a supervisão persistente. Fechar a interface enquanto a proteção está ativa não equivale a essa pausa. O modo de espera também não desliga eletricamente a bateria do vestível.

O acesso pode ser feito por e-mail/senha ou conta Google. Preferências e registros locais são separados por conta, evitando que uma troca de usuário apresente o perfil anterior como se fosse do novo responsável. O envio de e-mail é opcional e depende de endereço configurado, autorização e internet. A resposta HTTP do provedor confirma aceitação da solicitação, não entrega na caixa de entrada. A localização opcional é do celular responsável, nunca uma coordenada medida na criança.

## 4.7 ALIMENTAÇÃO E INDICAÇÃO DA BATERIA

A aquisição da bateria usa o divisor interno da XIAO e o ADC do nRF52840. A implementação calcula a média de 16 leituras e suaviza a tensão com média móvel exponencial de coeficiente 0,20. Na variante instalada, o tempo de aquisição foi solicitado em 40 µs, para tratar a alta impedância do divisor. Essa EMA pertence à leitura de bateria e não deve ser confundida com o filtro de Kalman do RSSI.

A tensão convertida alimenta uma tabela de estimativa percentual, apresentada em passos de 5%. A indicação de 100% próxima de 4,10 V foi adotada como convenção visual solicitada durante os testes, sem alterar a tensão regulada pelo carregador. Logo, 100% na tela não comprova fim de carga nem capacidade nominal efetivamente disponível. O símbolo de carregamento é derivado do estado elétrico de carga combinado com presença de USB.

No aplicativo, os avisos por faixa ocorrem aproximadamente em 20% e 10%, conforme preferências e permissões. A existência e os testes de código dessas regras não demonstram, por si só, o comportamento durante uma descarga real completa. A configuração conserva a seleção de aproximadamente 50 mA no circuito de carga da placa; não foi medida uma curva de corrente de carga nem caracterizado o envelhecimento da célula.

## 4.8 CAIXA, FIXAÇÃO E MONTAGEM DO BOTÃO

A estrutura foi modelada em OpenSCAD com base nas medidas do conjunto soldado. A base nominal possui 61 × 46 mm e altura de 28 mm, conforme o CAD atual; a face externa da tampa tem 2,4 mm de espessura. Essas são dimensões de projeto, e não medições certificadas de cada peça impressa. A disposição preserva a abertura USB-C, a janela do LED e a saída sonora, considerando também a altura das soldas e dos fios.

Os apoios da placa foram reforçados depois de quebrarem durante a montagem. Os passantes de abraçadeira receberam folgas maiores para acomodar a impressão real. O berço da bateria foi deslocado e simplificado, mantendo uma passagem inferior para prender o corpo da célula. O suporte do conector branco e guias desnecessárias de fios foram retirados. O buzzer permanece elevado sobre a região ocupada pelo circuito externo.

O acionamento externo utiliza um prolongador impresso, retido por uma trava em C, enquanto o botão eletrônico se apoia em abas integradas à tampa. No projeto da tampa, o furo tem 4,8 mm e a haste possui folga de passagem. A trava preservada tem 1,0 mm de espessura, diâmetro externo de 5,6 mm e interno de 3,6 mm. A folga de repouso prevista sobre o atuador é de 0,5 mm; ela não é a medida do curso elétrico do botão.

O kit digital consolidado reúne base V2.6, tampa V2.8, prolongador V2.7 e trava C V2.5. As versões distintas indicam revisões preservadas por peça. A tampa recebeu apoios para impedir que a carcaça do botão recuasse ao pressionar. O conjunto foi impresso e montado, e o funcionamento do botão após reparo dos fios foi confirmado no acompanhamento do projeto. Não foram realizados ensaios normatizados de impacto, vedação, tração da pulseira ou durabilidade de acionamento.

## 4.9 DISTRIBUIÇÃO E REPRODUTIBILIDADE

A versão Android 1.0.1 foi gerada como APK com o código JavaScript incorporado e assinatura compatível com a instalação oficial anterior. O login Google foi configurado para a identidade oficial. O aplicativo foi instalado no Samsung do projeto e utilizado sem Expo/Metro. Assim, o computador deixou de ser necessário para executar o monitoramento dessa versão.

Foram preservados o APK anterior, os fontes, o pacote de firmware e os registros da compilação. O GitHub reúne o código e a documentação versionada; credenciais e artefatos privados não devem ser tratados como parte de uma entrega pública. A versão da biblioteca, a identificação do firmware e a etapa do ensaio precisam acompanhar os resultados, pois parâmetros de uma variante não podem ser atribuídos retrospectivamente a outra.

# 5 TESTES E RESULTADOS

Os resultados foram organizados em três grupos de evidência: medições exportadas ou registradas, verificações automatizadas de código e testes funcionais acompanhados por relato. Essa separação evita apresentar uma aprovação verbal como medição instrumental ou um teste automatizado como validação de distância no mundo real. O telefone de referência da etapa final foi um Samsung Galaxy S24 Ultra, modelo SM-S928B, com Android 36. Não foi concluída uma matriz equivalente de validação em outros modelos nem no iOS.

## 5.1 TESTES AUTOMATIZADOS E CONTRATOS DE INTEGRAÇÃO

Na preparação da distribuição foram consolidados 211 testes Node, novamente executados em 4 de novembro de 2026, sem falhas, casos ignorados ou pendências marcadas na suíte. A verificação de tipos TypeScript também terminou sem erros. Os testes abrangem contratos BLE, telemetria, regras de confirmação, isolamento entre contas, recuperação, exportação, permissões, notificações e separação das ferramentas internas da interface de uso.

Parte das verificações examina contratos e estrutura do código; outras executam utilitários e cenários simulados. Cabeçalhos C++ específicos também receberam verificações separadas durante o desenvolvimento. Essas aprovações ajudam a evitar regressões conhecidas, mas não constituem uma auditoria exaustiva, não eliminam possíveis falhas e não demonstram comportamento idêntico em todos os aparelhos Android.

## 5.2 ENSAIOS DE RSSI E DISTÂNCIA ESTIMADA

As campanhas foram feitas com distâncias marcadas fisicamente e dispositivo montado. Houve séries iniciais no chão, séries elevadas e novas coletas após mudança de potência e fórmula. As campanhas não são experimentos controlados do efeito exclusivo da potência: posição, ambiente, orientação e configuração variaram. A ausência de altura numérica em parte dos CSVs impede reconstruir integralmente a geometria dos ensaios.

Na campanha D1 de 17 de outubro foram obtidas sete séries completas, de 30 amostras cada, em 1, 2, 3, 4, 5, 7 e 10 m. O firmware dessas coletas era xiao-p5-r4-d1, anterior ao K2-W1. As leituras exportadas apresentaram identificadores crescentes e novos dados durante cada janela. Os valores do Quadro 5 não devem ser atribuídos ao filtro Kalman final.

[[DISTANCIAS]]

O erro absoluto médio das 210 estimativas exportadas foi de aproximadamente 1,26 m nesse conjunto. O resultado mostra por que estabilidade e exatidão devem ser avaliadas separadamente: a 5 m reais, a indicação permaneceu entre 2,4 e 2,5 m. Nesse ponto, 27 das 30 amostras foram registradas em estado seguro e três em atenção. Portanto, não basta suavizar o sinal para corrigir uma estimativa estável, porém enviesada.

[[GRAFICO]]

A comparação com a fórmula anterior, usando os mesmos valores inteiros de RSSI exportados, resultou em erro médio de aproximadamente 1,31 m para a fórmula legada e 1,25 m para D1. Essa comparação é aproximada, porque o CSV arredonda o RSSI, enquanto o firmware opera com ponto flutuante. Houve melhora em alguns pontos e piora em outros. Não foi demonstrada precisão métrica universal nem separação exata das faixas por distância real.

Uma análise retrospectiva comparou filtros e limiares usando campanhas anteriores, sem eliminar séries desfavoráveis. O candidato Kalman Q1/R4 orientou a revisão, mas o melhor desempenho naquele replay não foi tomado como aprovação física. A primeira configuração K1 ainda produziu emergência relatada a 4 m; em seguida, K2 retornou o limiar vermelho a −90 dBm. Os testes focalizados posteriores em 4 e 5 m foram aprovados por relato, sem novo CSV ou cronometração desses disparos. Os pontos anteriores de 1 e 3 m foram observados com K1 e não são novas repetições com K2.

## 5.3 ALERTAS, RECONEXÃO E SEGUNDO PLANO

Os roteiros funcionais incluíram conexão próxima sem alarme, modo de espera, retorno da atenção para protegido, emergência retida, recusa de confirmação sem placa e recuperação após reconexão. Também foram verificadas as preferências de vibração e notificações, o acesso por conta Google e o histórico. O Quadro 6 apresenta uma síntese, distinguindo o aceite funcional da medição quantitativa.

[[FUNCIONAIS]]

Durante os testes, uma emergência iniciada com a tela bloqueada chegou a perder a sessão BLE ao abrir pela notificação. Também foi observado encerramento local indevido antes da confirmação da placa. As correções passaram a exigir telemetria atual, sinal dentro das condições aceitas e reconhecimento do dispositivo para encerrar o pânico. A repetição dos roteiros confirmou a manutenção da emergência sem vínculo e o encerramento somente após reconexão e resposta válida, nas condições ensaiadas.

Outra falha ocorreu ao remover o aplicativo dos Recentes: o vínculo retornava apenas ao reabrir a interface. A persistência foi revista e o cenário repetido. Na distribuição oficial sem servidor, o roteiro de dois minutos com tela bloqueada após remover dos Recentes foi aprovado por relato. Isso não comprova execução indefinida, sobrevivência a parada forçada ou comportamento equivalente sob todas as políticas de economia de energia.

O botão físico teve fios soltos durante o desenvolvimento. Seu reparo e funcionamento na oficial foram confirmados no acompanhamento de 4 de novembro, em resposta ao roteiro com aplicativo aberto e tela bloqueada. A data exata de realização e a latência instrumental não foram registradas. Esse aceite encerra a pendência funcional, mas não corresponde a ensaio de durabilidade da peça ou do contato elétrico.

## 5.4 SUPERVISÃO DE ATUALIZAÇÕES DE RSSI

Para avaliar o watchdog W1 sem confundi-lo com desconexão, foi utilizado um modo controlado de desenvolvimento. Ele suspendeu temporariamente o envio de RSSI, manteve notificações de estado e adiou a recuperação automática por RSSI antigo somente durante a janela de injeção. A supervisão de ausência de telemetria e a interpretação do pânico continuaram ativas. Essa opção não ficou disponível no APK de uso.

O diagnóstico registrou 18 notificações válidas durante a janela, primeiro pânico informado após 8.256 ms, retomada da escrita RSSI e nenhuma interrupção registrada pelo próprio ensaio. O tempo foi medido entre o início da injeção e o recebimento da primeira notificação de pânico, não entre dois instantes instrumentados dentro da XIAO. O resultado é compatível com o temporizador programado de 8 s, acrescido dos atrasos de execução e notificação.

O acionamento sonoro nos dois lados foi confirmado por relato. Depois que as escritas retornaram, a emergência permaneceu até a confirmação de segurança; o encerramento e o retorno a protegido também foram relatados. Trata-se de uma verificação focalizada do caminho de falha de comunicação, não de garantia de resposta para toda falha possível do telefone ou do rádio.

## 5.5 BATERIA E AUTONOMIA PRELIMINAR

O ensaio histórico de autonomia começou em 8 de setembro de 2026, às 19h52, e terminou em 9 de setembro, às 7h02. O intervalo observado foi de 11 h 10 min entre as indicações de 90% e 5%. O vestível estava alimentado pela bateria e conectado ao celular, com saídas automáticas de alerta temporariamente bloqueadas. Essa configuração é anterior à variante de rádio e filtros utilizada no encerramento do projeto.

[[AUTONOMIA]]

Não houve descarga forçada até o corte da proteção, medição de corrente acumulada ou ensaio de capacidade real em mAh. Por isso, o tempo entre dois percentuais por tensão não permite calcular com confiança a corrente média, extrapolar uma autonomia integral ou garantir a mesma duração em uso diário. As indicações de 100%, tensão e carregamento também não comprovam, isoladamente, o término do carregamento.

Nas comparações posteriores relatadas com multímetro, foram observados, por exemplo, 4,12 V no aplicativo frente a 4,16 V com USB e 4,15 V sem USB; após a revisão da aquisição, 4,13 V no aplicativo e 4,15 V no instrumento foram informados com e sem USB. As leituras não foram acompanhadas de certificado de calibração, série de repetição ou análise completa de incerteza. Portanto, não é adequado declarar erro fixo corrigido nem calibração metrológica concluída.

Na data de fechamento desta revisão, ainda não foi realizado um novo ciclo completo na configuração atual nem validada a chegada aos avisos de bateria baixa por descarga real nessa versão. Foi proposto um coletor opcional no aplicativo para registrar tensão, estados, recargas e lacunas em uso cotidiano. Ele ainda não foi implementado ou executado e não integra os resultados aqui apresentados.

## 5.6 MONTAGEM E AVALIAÇÃO DA CAIXA

A impressão revelou diferenças entre o encaixe previsto e o obtido: passantes estreitos, apoios frágeis da placa, restrição de espaço para a bateria e dificuldade de passagem da trava do botão. As revisões ampliaram folgas, reforçaram os apoios e modificaram o berço e o alojamento. O retorno da peça física foi usado para decidir as correções, em vez de considerar apenas a visualização CAD.

A caixa consolidada foi montada e parafusada com os componentes dentro. O prolongador e a trava final foram mantidos após aprovação do encaixe, enquanto a tampa recebeu abas de apoio para o botão eletrônico. O funcionamento relatado após o reparo confirma o acionamento na montagem usada; não foram medidos índices de proteção, resistência mecânica normalizada, conforto prolongado ou adequação a diferentes faixas etárias.

## 5.7 DISCUSSÃO E LIMITAÇÕES

Os testes mostram integração funcional entre dispositivo, comunicação, aplicativo e saídas de alerta. A combinação de confirmação temporal, histerese, filtragem e reconhecimento da placa reduziu problemas encontrados no desenvolvimento e permitiu repetir os principais fluxos. Entretanto, os mecanismos não anulam os efeitos de propagação, nem transformam a intensidade do sinal em medida direta de posição.

As limitações mais relevantes são a concentração da validação final em um telefone, a ausência de repetição ampla entre ambientes e orientações, a autonomia ainda preliminar e a falta de certificações do conjunto. O vínculo BLE também necessita de evolução de autenticação e análise de segurança antes de uma oferta comercial. Autenticar o usuário no Firebase não autentica automaticamente a comunicação do vestível. Um RSSI alto tampouco prova que a criança esteja segura ou fisicamente a uma distância específica.

Os resultados são, assim, compatíveis com uma prova de conceito acadêmica. O protótipo não foi avaliado quanto à prevenção de desaparecimentos, não substitui supervisão humana e não constitui rastreador geográfico. Informar essas restrições faz parte da interpretação dos resultados, e não deve ser substituído por uma promessa de segurança baseada apenas em uma cor do aplicativo.

# 6 CONCLUSÃO

O trabalho atingiu o objetivo de desenvolver e avaliar uma implementação integrada de vestível e aplicativo Android para acompanhar condições experimentais de proximidade por BLE. Foram construídos o circuito e a caixa, implementados o firmware e o aplicativo e verificados os fluxos principais de conexão, alerta, reconexão, modo de espera e acionamento manual. A distribuição final executa sem servidor de desenvolvimento, e o botão reparado recebeu aceite funcional na montagem utilizada.

O desenvolvimento iterativo foi importante porque parte dos problemas apareceu somente no conjunto real. Oscilações do RSSI, interrupções ao remover a interface dos Recentes, encerramento de emergência sem resposta do dispositivo e interferências mecânicas do botão exigiram revisões e repetição dos roteiros. A separação entre o estado visual e a confirmação recebida da placa tornou o encerramento do alerta mais coerente com a comunicação disponível.

O objetivo de apresentar uma referência de proximidade foi alcançado com limitações. A campanha quantitativa revelou erro e inversões entre distâncias, inclusive leitura estável abaixo da distância real a 5 m. Os ajustes posteriores tiveram aprovação funcional no cenário acompanhado, mas não demonstram alarmes em metros exatos para qualquer ambiente. A conclusão não é que o RSSI passou a medir distância com precisão, e sim que pode apoiar uma indicação experimental de proximidade quando suas restrições são explicitadas.

O ciclo histórico de 11 h 10 min fornece uma observação preliminar de funcionamento em bateria, sob condições específicas. Ele não comprova autonomia da versão final em uso cotidiano. Permanecem necessários novos ciclos, avaliação de bateria baixa real e medições de consumo apropriadas. A implementação de coleta de autonomia, a validação em outros celulares e ambientes e a análise de segurança do enlace são continuidades diretamente relacionadas às limitações encontradas.

Como trabalhos futuros, podem ser estudados eletrônica própria, redução das dimensões, ergonomia, maior proteção mecânica e soluções de localização diferentes da estimativa RSSI. GPS, infraestrutura de receptores ou outras técnicas de medição devem ser avaliados em projetos próprios, com impacto em alimentação, custo e privacidade. Essas possibilidades não integram o desempenho demonstrado neste TCC. O resultado apresentado permanece um protótipo acadêmico funcional, complementar à supervisão de um responsável e sem certificação para uso comercial como equipamento de segurança.
