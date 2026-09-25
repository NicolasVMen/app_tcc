# Especificação do Protótipo Funcional — Escolta UNITAU

**Versão:** 1.0 — definição inicial  
**Data:** 29 de julho de 2026  
**Autores:** Nicolas Venciguerra Men e Rafael Gonçalves Dedini  
**Instituição:** Universidade de Taubaté — UNITAU  
**Curso:** Engenharia da Computação

## Documentos relacionados

- `FLUXOS_CENTRAL_SENTINELA.md` — máquina de estados, fluxos de conexão, reconexão, emergência e confirmação.

## 1. Visão do protótipo

O Escolta UNITAU é um sistema de proteção infantil por proximidade, composto por um aplicativo móvel e um dispositivo vestível conectado por Bluetooth Low Energy (BLE).

O protótipo deve ir além de uma demonstração visual: precisa apresentar funcionamento integrado e acabamento profissional, mantendo comunicação honesta sobre seu caráter acadêmico e sobre as limitações técnicas do RSSI, do Bluetooth, da internet e dos sistemas operacionais móveis. Ele não deve ser apresentado como produto comercial ou solução certificada de segurança.

### 1.1 Promessa central

> O responsável sabe claramente se a proteção está funcionando. Se o vínculo falhar, o Escolta tenta se recuperar. Se a recuperação não ocorrer, o sistema informa a emergência e orienta a resposta.

### 1.2 Posicionamento visual

O aplicativo combinará:

- central de segurança profissional;
- tecnologia futurista sóbria;
- acabamento premium para famílias;
- linguagem clara, acolhedora e responsável.

O visual tecnológico não deve depender de excesso de neon, efeitos ou informações técnicas. A percepção de tecnologia virá da precisão da interface, dos estados bem definidos, da resposta imediata e das animações funcionais.

## 2. Princípios do protótipo

1. **Segurança primeiro:** decisões críticas devem ser evidentes e protegidas contra acionamentos acidentais.
2. **Estado sempre compreensível:** o responsável deve saber se o sistema está procurando, protegido, em atenção, reconectando ou em emergência.
3. **Falhas visíveis:** erros de Bluetooth, internet, localização ou notificação não podem ser ignorados silenciosamente.
4. **Comunicação honesta:** distância é uma estimativa; localização do celular não é localização da criança.
5. **Recuperação automática:** a Sentinela tenta restabelecer o vínculo antes de declarar emergência.
6. **Redundância:** alarme local, vibração, buzzer, histórico e, futuramente, alertas remotos para contatos confiáveis.
7. **Privacidade por padrão:** apenas dados necessários devem ser coletados e compartilhados.
8. **Acessibilidade:** alto contraste, áreas de toque adequadas, textos legíveis e opção para reduzir animações.
9. **Identidade consistente:** nomes, cores, movimentos, mensagens e estados pertencem ao universo do Escolta UNITAU.
10. **Confiabilidade demonstrável:** o comportamento deve ser testado em situações reais, não presumido apenas pela aparência do aplicativo.

## 3. Escopo atual

### 3.1 Hardware disponível

- ESP32 DevKit V1 em protoboard;
- buzzer;
- comunicação BLE já implementada;
- aplicativo Android em React Native com Expo.

### 3.2 Prioridade de plataforma

- **Primária:** Android.
- **Desejada:** iOS, desde que as decisões de interface e arquitetura não inviabilizem compatibilidade futura.

### 3.3 Fora do escopo desta fase

- migração do firmware para Seeed Studio XIAO nRF52840 Sense;
- bateria do wearable final;
- motor de vibração no wearable;
- botão físico de pânico;
- indicador real de bateria do wearable;
- alterações dependentes do hardware ainda não entregue.

Esses itens não devem aparecer como recursos funcionais na interface atual.

## 4. Identidade e nomenclatura

### 4.1 Marca

O nome principal será sempre **Escolta UNITAU**.

Assinatura sugerida:

> Tecnologia de proteção infantil

### 4.2 Navegação principal

| Área | Finalidade |
| --- | --- |
| **Central** | Estado da proteção, distância estimada e resposta a eventos. |
| **Protocolo** | Orientações de uso, segurança e resposta. |
| **Registros** | Linha do tempo de ocorrências e mudanças de estado. |
| **Sistema** | Perfil, criança, contatos, dispositivo e preferências. |

### 4.3 Termos da experiência

| Conceito técnico ou anterior | Nome no produto |
| --- | --- |
| Reconexão automática / cão de guarda | **Sentinela** |
| Conectado | **Vínculo ativo** |
| Seguro | **Protegido** |
| Atenção | **Alcance reduzido** |
| Tentativa de reconexão | **Reconectando** |
| Pânico | **Emergência** |
| Resetar alarme | **Confirmar segurança** |
| Histórico de alertas | **Registros** |
| Manual | **Protocolo** |
| Laboratório | **Telemetria** |

## 5. Arquitetura da informação

### 5.1 Central

A Central é a tela de maior prioridade. Deve apresentar somente informações úteis para uma decisão imediata.

Elementos principais:

- marca Escolta UNITAU;
- nome da criança;
- estado atual da Sentinela;
- núcleo de proteção animado;
- distância estimada em metros;
- horário da última comunicação;
- mensagem contextual;
- ação principal, quando necessária.

Exemplo em condição normal:

> **PROTEGIDO**  
> Sofia está por perto  
> Distância estimada: ~4 m  
> Sentinela ativa

#### Distância

- Deve aparecer para o usuário comum.
- Será exibida como um valor aproximado, por exemplo `~4 m`.
- A palavra **estimada** deverá estar sempre visível.
- Não deverão ser usadas casas decimais que transmitam falsa precisão.
- O RSSI em dBm não aparecerá na Central.

#### Núcleo de proteção

O radar direcional será substituído por um núcleo abstrato que representa estado e proximidade, sem sugerir direção ou localização exata.

Comportamentos visuais:

- **Procurando:** varredura azul;
- **Protegido:** pulsação verde lenta;
- **Alcance reduzido:** pulsação amarela mais frequente;
- **Reconectando:** pulso azul interrompido ou movimento de busca;
- **Emergência:** pulso vermelho forte e inequívoco;
- **Animações reduzidas:** cores e textos permanecem, mas os movimentos são suavizados.

### 5.2 Protocolo

O Protocolo substituirá o manual puramente descritivo por orientações práticas:

- checklist antes de sair;
- como funciona a proteção;
- significado de cada estado;
- o que fazer em Alcance reduzido;
- o que fazer em Reconectando;
- o que fazer em Emergência;
- como posicionar o dispositivo;
- limitações da distância estimada;
- cuidados com Bluetooth, volume e bateria do celular;
- explicação de que o sistema complementa, mas não substitui, a supervisão humana.

### 5.3 Registros

Os eventos serão apresentados em linha do tempo.

Eventos previstos:

- proteção iniciada;
- vínculo ativo;
- alcance reduzido;
- vínculo perdido;
- tentativa de reconexão;
- emergência iniciada;
- notificação externa enviada;
- falha no envio externo;
- vínculo restabelecido;
- segurança confirmada.

Cada registro deve conter, quando aplicável:

- data e horário;
- nome da criança;
- descrição clara;
- duração do evento;
- distância estimada;
- estado do envio aos contatos.

### 5.4 Sistema

Seções propostas:

1. Perfil do responsável;
2. Criança monitorada;
3. Contatos de confiança;
4. Dispositivo vinculado;
5. Preferências;
6. Privacidade e localização;
7. Ajuda;
8. Versão.

O conteúdo acadêmico e a Telemetria ficarão fora da navegação comum. A área acadêmica poderá ser aberta por uma interação discreta no número da versão, como múltiplos toques.

## 6. Sentinela

A Sentinela é o mecanismo responsável pela conexão automática, vigilância do vínculo e tentativa de recuperação.

### 6.1 Estados

1. Iniciando proteção;
2. Procurando dispositivo;
3. Protegido;
4. Alcance reduzido;
5. Reconectando;
6. Emergência;
7. Segurança confirmada.

### 6.2 Conexão inicial

- Ao abrir o aplicativo autenticado, a busca pelo dispositivo começa automaticamente quando a conexão automática estiver habilitada.
- O usuário não precisa tocar em “Ativar proteção”.
- O estado de busca deve ser visível e explicativo.
- Se o Bluetooth estiver desligado ou sem permissão, o aplicativo deve informar exatamente como corrigir.

### 6.3 Perda de vínculo

Fluxo aprovado:

1. O vínculo BLE é perdido.
2. A interface entra em **Reconectando**.
3. A Sentinela executa uma tentativa imediata de reconexão.
4. Existe uma janela inicial sugerida de cinco segundos para recuperação.
5. Se a tentativa falhar, o aplicativo declara **Emergência**.
6. A busca continua durante a emergência.
7. Se o dispositivo reaparecer, o sistema informa o restabelecimento e solicita confirmação humana.

### 6.4 Confirmação humana

Após o restabelecimento:

> O vínculo foi restabelecido. A criança está segura?

Ações:

- **Sim, está segura**;
- **Continuar em alerta**.

Uma reconexão momentânea não deve encerrar silenciosamente uma emergência.

## 7. Preferências e explicações contextuais

As configurações importantes não serão apresentadas como interruptores sem contexto.

Cada preferência deverá usar, conforme o risco:

1. título claro;
2. explicação curta abaixo da opção;
3. informação adicional quando necessária;
4. confirmação antes de alterações de segurança ou privacidade;
5. mensagem de resultado após a alteração.

### 7.1 Preferências previstas

| Preferência | Padrão | Observação |
| --- | --- | --- |
| Conexão automática | Ligada | Desligar exige confirmação e explicação do impacto. |
| Notificações | Ligadas | Deve detectar bloqueio pelo Android. |
| Vibração | Ligada | Controla avisos compatíveis. |
| Sons informativos | Ligados | Não silencia o alarme crítico. |
| Tema | Escuro | Opções Escuro, Claro e Sistema. |
| Manter tela ativa | A definir | Apenas durante monitoramento, com explicação sobre bateria. |
| Compartilhar localização | Desligada | Ativação voluntária e explicada. |
| Avisos de atenção aos contatos | Desligados | Emergências continuam prioritárias. |
| Reduzir animações | Desligada | Mantém cores, textos e estados. |

### 7.2 Confirmações obrigatórias

- desativar conexão automática;
- remover contato de confiança;
- desvincular dispositivo;
- limpar registros;
- encerrar emergência;
- sair da conta durante proteção ativa;
- restaurar configurações.

A confirmação deve explicar a consequência. Evitar mensagens genéricas como “Tem certeza?”.

## 8. Localização e privacidade

A localização compartilhada é a do **celular do responsável**, não a posição exata da criança.

### 8.1 Regra aprovada

- Compartilhamento desligado por padrão.
- O usuário poderá ativá-lo em Privacidade e localização.
- A posição será capturada somente depois que a tentativa de reconexão falhar e a emergência for declarada.
- Apenas contatos de confiança autorizados receberão a informação.
- A mensagem identificará explicitamente a origem da posição.

Texto recomendado:

> Localização do celular responsável no início da emergência.

### 8.2 Explicação da preferência

> Durante uma emergência, os contatos de confiança receberão a posição deste celular. Essa não é a localização exata da criança.

## 9. Rede de proteção

Funcionalidade futura do aplicativo, independente da migração de hardware.

### 9.1 Responsável principal

- vincula o dispositivo BLE;
- monitora uma criança;
- adiciona até três contatos de confiança;
- controla o compartilhamento da localização do próprio celular;
- confirma o encerramento da emergência.

### 9.2 Contato de confiança

- instala o Escolta UNITAU;
- aceita um convite temporário;
- recebe emergências por push;
- recebe a posterior confirmação de segurança;
- pode confirmar que visualizou o alerta;
- não precisa estar conectado ao wearable.

### 9.3 Política de notificações

- Emergências são enviadas aos contatos ativos.
- Eventos de atenção não são enviados por padrão.
- Cada contato poderá optar por receber avisos de atenção.
- Após a confirmação humana, os contatos recebem o encerramento da ocorrência.
- Falhas no envio devem aparecer nos Registros do responsável principal.

## 10. Dados pessoais

### 10.1 Cadastro inicial recomendado

- nome do responsável;
- e-mail;
- senha.

### 10.2 Configuração posterior

- nome da criança;
- contatos de confiança;
- preferências de comunicação.

CPF não possui atualmente função operacional na autenticação, na conexão BLE ou nos alertas. Sua remoção é recomendada para reduzir atrito e exposição de dados pessoais. Telefone deverá ser solicitado somente quando existir uma finalidade concreta e informada.

## 11. Área técnica e acadêmica

### 11.1 Telemetria

A tela atual de laboratório será retirada temporariamente da experiência comum, mas não apagada.

Requisito de implementação futura:

- controlar a disponibilidade por flag ou rota interna;
- evitar grandes blocos de código comentado;
- permitir reativação simples para experimentos do TCC;
- manter RSSI, amostras, média e desvio padrão nessa área.

### 11.2 Sobre o TCC

A área acadêmica será acessada discretamente por múltiplos toques no número da versão.

Conteúdo:

- autores;
- curso e instituição;
- orientador;
- versão;
- descrição técnica resumida;
- acesso à Telemetria quando habilitada.

## 12. Sistema visual

### 12.1 Cores funcionais

- Azul ou ciano: tecnologia, busca e ações neutras;
- Verde: proteção confirmada;
- Amarelo: alcance reduzido;
- Vermelho: emergência real;
- Azul-marinho escuro: base visual principal.

As cores não devem ser o único meio de comunicar estados. Todos os estados precisam de texto e ícone.

### 12.2 Tema

- Escuro será o tema padrão e a principal identidade visual.
- Claro será uma composição própria, não apenas inversão de cores.
- Sistema acompanhará a preferência do aparelho.

### 12.3 Responsividade

O redesenho deverá considerar:

- celulares Android pequenos e grandes;
- recortes, barras do sistema e áreas seguras;
- orientação retrato;
- escalas de fonte do sistema;
- textos maiores sem sobreposição;
- áreas de toque adequadas;
- teclado sem cobrir campos;
- animações adaptadas ao desempenho do dispositivo;
- preparação para áreas seguras e comportamentos do iOS.

## 13. Mensagens contextuais

### Procurando dispositivo

> A Sentinela está procurando o Escolta próximo. Mantenha o Bluetooth ativado.

### Protegido

> Sofia está por perto e o vínculo está estável.

### Alcance reduzido

> O sinal está enfraquecendo. Aproxime-se de Sofia e observe o ambiente.

### Reconectando

> O vínculo foi interrompido. A Sentinela está tentando restabelecê-lo antes de iniciar a emergência.

### Emergência

> Não foi possível restabelecer o vínculo. Verifique Sofia imediatamente.

### Vínculo restabelecido

> O dispositivo voltou a responder. Confirme se Sofia está segura.

## 14. Requisitos de confiabilidade

Antes de afirmar que o aplicativo é robusto, deverão ser testados:

- conexão inicial;
- perda e recuperação do vínculo;
- múltiplas perdas consecutivas;
- falsos alertas por oscilação de RSSI;
- Bluetooth desligado durante a proteção;
- permissão de Bluetooth negada;
- tela apagada;
- aplicativo em segundo plano;
- aplicativo encerrado pelo usuário;
- economia de bateria do Android;
- ausência de internet;
- falha no envio de notificação externa;
- localização negada ou indisponível;
- reinicialização do celular;
- diferentes tamanhos e versões do Android;
- persistência de preferências e registros;
- acessibilidade com fontes ampliadas.

O sistema deve distinguir claramente:

- proteção local funcionando;
- serviço externo indisponível;
- monitoramento interrompido;
- emergência ativa.

## 15. Critérios iniciais de aceitação do redesenho

1. O estado de proteção é compreendido em poucos segundos sem conhecimento técnico.
2. RSSI não aparece na experiência comum.
3. A distância é identificada como estimada.
4. Nenhuma tela sugere conhecer a direção ou localização exata da criança.
5. A perda de vínculo possui etapa de reconexão visível antes da emergência.
6. O usuário entende as consequências antes de alterar preferências críticas.
7. A localização permanece desativada por padrão e é explicada corretamente.
8. A Telemetria não aparece na navegação comum.
9. A área acadêmica permanece acessível de forma discreta.
10. A interface funciona em diferentes tamanhos de tela e escalas de fonte.
11. Estados não dependem apenas de cor.
12. Falhas externas são registradas e comunicadas.

## 16. Sequência recomendada de trabalho

1. Validar esta especificação com Nicolas e Rafael;
2. Mapear os fluxos completos da Central e da Sentinela;
3. Definir o sistema visual e os componentes reutilizáveis;
4. Produzir wireframes das quatro áreas principais;
5. Revisar textos e confirmações;
6. Definir o plano de migração da interface atual;
7. Implementar primeiro a estrutura visual e a responsividade;
8. Implementar estados e preferências;
9. Implementar e testar a nova lógica da Sentinela;
10. Validar em dispositivos Android reais;
11. Planejar Rede de Proteção e notificações push como fase própria;
12. Revisar compatibilidade com iOS.

## 17. Pontos ainda abertos

- decisão final sobre manter a tela ativa durante proteção;
- duração definitiva da janela de reconexão, inicialmente sugerida em cinco segundos;
- comportamento exato do aplicativo quando encerrado pelo sistema operacional;
- estratégia de backend para Rede de Proteção;
- processo de convite e expiração de contatos confiáveis;
- política de retenção e exclusão dos Registros;
- comportamento dos alertas quando o celular está no modo silencioso ou Não Perturbe;
- validação experimental da fórmula de distância;
- requisitos mínimos de Android e iOS.

## 18. Diagnóstico e confiabilidade operacional

A área **Verificação de prontidão** reúne condições observáveis que influenciam o funcionamento do protótipo:

- vínculo com o dispositivo Escolta;
- permissões de Bluetooth;
- autorização de notificações;
- reconexão automática;
- disponibilidade da sirene local;
- identificação da criança;
- localização opcional do celular;
- canal externo experimental;
- orientação sobre bateria e execução em segundo plano.

O diagnóstico oferece testes controlados separados de uma emergência real:

- notificação visual identificada como teste;
- sirene e vibração locais por aproximadamente 2,5 segundos;
- nenhum envio de e-mail ou abertura de ocorrência;
- confirmação prévia antes do teste sonoro.

O relatório compartilhável registra versão, plataforma, horário, última telemetria e resultado das verificações. O próprio documento deve declarar que representa condições observáveis do protótipo e não uma certificação de segurança.

### 18.1 Limites do diagnóstico

- A otimização de bateria depende do fabricante e requer revisão manual nos ajustes do Android.
- Um arquivo de sirene carregado não comprova, sozinho, que o volume físico estava audível; o usuário confirma o teste.
- A disponibilidade de um canal externo não altera o estado da proteção BLE local.
- O resultado pode mudar após alterações de permissão, Bluetooth, bateria ou conexão.
