"""Procedimentos manuais explícitos; não executa nem aprova testes."""
PROTOCOLS = {}
NO_BOX = 'Caixinha desligada por meio seguro, sem monitoramento ativo; internet disponível, salvo quando o teste disser o contrário. Não desconecte bateria soldada.'
CONNECTED = 'Caixinha fechada em apoio não metálico, a cerca de 1 m do celular; mesmo adulto acompanha ambos. Bluetooth e permissões concedidos, proteção ativa, sem emergência anterior e com atualização recente.'
CONNECT = 'Abra a Central; aguarde a conexão automática ou toque PROCURAR AGORA quando disponível. Só prossiga após vínculo ativo e atualização recente; se estiver em espera, use RETOMAR PROTEÇÃO e confirme.'
CONFIRM = 'Após verificar presencialmente a caixinha neste ensaio entre adultos, abra Central → CONFIRMAR SEGURANÇA → Sim, está segura. Confira separadamente buzzer, som do celular, vibração e estado da tela.'
LOGOUT = 'Na aba Sistema, role até Sair da conta; toque e confirme Sair e encerrar. Não use Sair mesmo assim para contornar falha de desarme.'
RESTORE = 'Restaure todas as preferências e permissões alteradas. Ligue o Bluetooth; reconecte e confirme segurança apenas após verificar a caixinha. Aguarde atualização recente antes do próximo teste.'
OBSERVE = 'Anote mensagem exata, horário, estado/cor, se houve fechamento e tempo de recuperação. Fotografe o erro sem expor dados pessoais.'
OUTPUTS = 'Registre separadamente: buzzer da caixinha, som do celular, vibração, aviso do Android, cor/estado e tempo até cada saída. Uma saída funcionando não aprova as outras.'

def add(number, preparation, steps, cleanup, record=OBSERVE):
    assert number not in PROTOCOLS
    assert len(steps) >= 4
    PROTOCOLS[number] = dict(preparation=preparation, steps=steps, cleanup=cleanup, record=record)

add(1, 'Tenha celular, caixinha e ficha. Não instale nem atualize nada.', [
 'Abra somente o Escolta que será ensaiado; copie o nome exato. Diferencie Escolta Teste de Escolta UNITAU.',
 'No Samsung, abra Configurações → Sobre o telefone → Informações do software; anote modelo e versão do Android.',
 'Anote a versão e origem do aplicativo pelas informações disponíveis. Se APK/bundle não puderem ser identificados, peça minha conferência; não invente a versão.',
 'No aplicativo, abra Sistema → Verificar prontidão, se existir; anote firmware, permissões e opções. Para ler firmware, conecte somente se for seguro.',
 'Fotografe a identificação e preencha os campos iniciais da ficha; marque Bloqueado se a versão executada continuar incerta.'
], 'Volte à Central sem alterar opções.', 'Nome, APK/bundle/origem, Android, firmware, alimentação, data e responsável. Certificado e bundle exigem conferência assistida.')
add(2, 'T001 identificado; oficial existente, sem instalação nova.', [
 'Desligue/encerre a outra versão do Escolta; mantenha apenas a versão de referência em uso.',
 'Liste os recursos que você já utilizou e que funcionam: login, conexão, botão, alarme, histórico e tampa.',
 'Anote quando e em qual versão esses resultados foram observados; lembrança sem versão/data fica como informação anterior, não aprovação desta ficha.',
 'Salve fotos e uma cópia dos registros que deseja conservar. Não reinstale, limpe dados ou troque o servidor/bundle para preparar a referência.'
], 'Nenhuma configuração precisa mudar.', 'Recursos previamente usados, versão, data aproximada e evidência disponível.')
add(3, NO_BOX + ' Sessão já autenticada.', [
 'Abra o app e permaneça na Central por 15 s.',
 'Entre nas abas Sistema e Registros; volte à Central. Observe imagens, ícones e resposta ao toque.',
 'Abra Recentes do Android, deslize somente este aplicativo para removê-lo; isso não é Forçar parada.',
 'Abra de novo pelo ícone e aguarde 30 s. Confira se continua na conta correta.',
 'Repita o ciclo completo três vezes; se não abrir, fotografe o erro e pare em vez de limpar dados.'
], 'Deixe o aplicativo aberto na Central.', 'Resultado de cada uma das três reaberturas; nome da conta, telas em branco ou fechamentos.')
add(4, NO_BOX + ' Sessão autenticada e T001 identificado.', [
 'Abra Sistema e copie os nomes de perfil e as opções atualmente ativadas, sem editar.',
 'Abra Registros; anote quantidade de ocorrências e fotografe exemplos.',
 'Se houver exportação, compartilhe o relatório para um destino próprio; não envie a terceiros.',
 'Anote quais dados devem continuar após eventual mudança de Firebase. Não execute Limpar ou Restaurar preferências.'
], 'Nenhuma alteração: volte à Central.', 'Dados que precisam ser preservados, evidência salva e destino próprio do backup.')
add(5, 'ASSISTIDO COMIGO. Apenas conferência; acesso autorizado ao Firebase. Não cadastrar SHA por adivinhação.', [
 'Abra o console Firebase e escolha escolta-unitau; confira o ID, não só o nome de exibição.',
 'Abra Configurações do projeto → Geral → Seus apps; localize o cadastro Android oficial.',
 'Compare o pacote com com.nicolasvmen.escoltaunitau. O cadastro com final .teste não substitui este.',
 'Solicite minha conferência do certificado da build exata; compare o SHA confirmado com o cadastrado.',
 'Em Authentication → Método de login, confira Google e E-mail/senha, conforme recursos mantidos. Não altere provedores para testar.',
 'Se pacote/certificado não estiverem confirmados, marque Bloqueado e aguarde configuração, sem instalar APK.'
], 'Feche apenas as telas de consulta; não apague cadastro/projeto.', 'Projeto, pacote, build/certificado confirmado e pendência; sem senha ou token.')
add(6, NO_BOX + ' Conta Google própria; versão com Google disponível.', [LOGOUT,
 'Na tela de acesso, toque Continuar com Google uma vez.',
 'Quando aparecer o seletor de contas, use Voltar para cancelar; não escolha conta.',
 'Aguarde 15 s; confira se ficou no login e se o botão voltou a responder.',
 'Repita uma vez. Só depois entre normalmente para recuperar sua sessão.'
], 'Entre novamente na conta usada no ensaio.', 'Resultado dos dois cancelamentos e eventual mensagem indevida.')
add(7, NO_BOX + ' T005 conferido para a build; conta Google própria e internet.', [LOGOUT,
 'Toque Continuar com Google; selecione a conta própria que deseja usar.',
 'Aguarde até 30 s sem tocar novamente. Caso fique carregando, anote o tempo e a tela; 30 s é janela de observação, não garantia de rede.',
 'Abra Sistema e compare o e-mail mostrado com o e-mail escolhido.',
 'Se tiver acesso ao console, abra Authentication → Usuários de escolta-unitau e confira sua conta, sem divulgar UID/e-mail de terceiros.'
], 'Mantenha sua conta conectada, sem ativar a caixinha.', 'Conta escolhida/correta, tempo de acesso, versão e confirmação do projeto; não copiar token.')
add(8, NO_BOX + ' Google disponível, internet e usuário fora da conta.', [
 'Abra a tela de acesso; confira que não existe seletor Google já aberto.',
 'Toque Continuar com Google três vezes rapidamente antes de o seletor aparecer; não mantenha toques indefinidos.',
 'Escolha uma conta apenas uma vez ou cancele; conte quantos seletores surgiram.',
 'Aguarde 15 s, volte ao app e observe se botão/carregamento ficaram presos.',
 'Se um segundo seletor surgir, registre antes de fechá-lo; não faça vários logins simultâneos.'
], 'Feche seletores restantes e entre uma vez normalmente.', 'Quantidade de seletores, acessos, erros e resposta posterior do botão.')
add(9, NO_BOX + ' Sem sessão; servidor de desenvolvimento pelo USB funcionando se esta versão depender dele.', [
 'Desative Wi-Fi e Dados móveis na barra rápida do Samsung; mantenha Bluetooth e, se necessário, USB/servidor de desenvolvimento ativos.',
 'Confira em outro app de internet que uma página nova não abre; não use uma página já em cache.',
 'No Escolta, toque Continuar com Google e observe até 30 s. Cancelar seletor é diferente de uma falha de internet; registre qual ocorreu.',
 'Reative Wi-Fi ou dados e confirme que uma página nova abre.',
 'Volte ao Escolta e tente Google uma vez; compare erro e recuperação.',
 'Se retirar internet também derrubou o servidor do app, marque Bloqueado por infraestrutura, não falha do Google.'
], 'Restaure as opções de rede originais e a conta.', 'Falha offline, tempo observado, recuperação online e como o servidor permaneceu acessível.')
add(10, NO_BOX + ' Conta já autenticada. Para app de desenvolvimento, USB/servidor precisam voltar após reiniciar.', [
 'Anote o e-mail em Sistema; remova o app de Recentes e abra novamente. Aguarde 30 s e compare a conta.',
 'Reinicie o celular pelo menu normal do Samsung; não use Forçar parada nem limpe dados.',
 'Se for versão de desenvolvimento, restabeleça a ligação USB/servidor com minha ajuda antes de interpretar erro de abertura.',
 'Abra o app e compare e-mail/perfil novamente.',
 'Agora desative Wi-Fi e dados, deixando Bluetooth e servidor por USB, se necessário; feche/reabra e confira sessão sem rede.',
 'Anote separadamente os três cenários: reabrir, reiniciar e reabrir offline.'
], 'Restaure internet e mantenha a sessão de teste.', 'Conta e resultado em cada cenário; distinguir erro de servidor de perda de autenticação.')
add(11, NO_BOX + ' Conta autenticada; saiba qual conta será usada para voltar.', [LOGOUT,
 'Confirme que voltou ao login; tente entrar em abas internas pelo botão Voltar, sem autenticar.',
 'Remova de Recentes e reabra; confira que ainda pede acesso.',
 'Entre na mesma conta e confira nome/e-mail e preferências.'
], 'Deixe a conta de teste conectada.', 'Logout confirmado, acesso sem login recusado e dados ao retornar.')
add(12, NO_BOX + ' Duas contas próprias A/B. Não usar conta de outra pessoa nem dados reais de criança.', [
 'Entre na conta A; em Sistema, registre nome fictício e uma preferência fácil de distinguir, como tema Claro.',
 'Fotografe perfil e quantidade de registros de A; saia pela opção Sair e encerrar.',
 'Entre em B; antes de editar, confira se não recebeu perfil/histórico/contato de A.',
 'Em B, escolha outro nome fictício e tema Escuro; fotografe e saia.',
 'Volte a A e compare com a primeira foto; depois volte a B e compare.',
 'Não limpe históricos para facilitar o teste; dados iguais sem origem clara exigem análise, não aprovação.'
], 'Retorne à conta principal; restaure nomes/preferências de ensaio se desejar, preservando evidências.', 'Conta em cada foto, dados antes/depois e quais itens se misturaram, se houver.')
add(13, NO_BOX + ' Conta Google autenticada; anote o nome atual.', [
 'Abra Sistema → Perfil e toque no nome do responsável.',
 'Troque temporariamente para um nome fictício distinguível, por exemplo Teste Nome Editado; salve.',
 'Volte à Central e depois ao Sistema; confirme a alteração.', LOGOUT,
 'Entre por Google na mesma conta e confira se o nome editado permaneceu.'
], 'Reponha o nome anterior e salve.', 'Nome antes, após edição e após login Google.')
add(14, NO_BOX + ' Formulário de cadastro, e-mail próprio ainda não cadastrado. Não enviar dados válidos até T015.', [
 'Abra Primeiro acesso? Criar conta. Preencha um conjunto de dados válido, mas deixe nome vazio; toque CRIAR CONTA e anote a orientação.',
 'Corrija o nome; deixe apenas e-mail inválido, como teste-sem-arroba; envie e anote.',
 'Corrija e-mail; coloque senha de teste com menos de oito caracteres e confirmação igual; envie e anote.',
 'Corrija para oito ou mais caracteres; deixe só confirmação diferente; envie e anote.',
 'Mude um erro por vez. Não inclua a senha real na ficha nem toque Enviar com tudo válido neste caso.'
], 'Volte ao login ou siga para T015; campos do cadastro não devem ter criado conta.', 'Mensagem e impedimento para cada erro isolado.')
add(15, NO_BOX + ' E-mail próprio novo com caixa de entrada acessível; não usar e-mail da conta Google existente.', [
 'Abra Primeiro acesso? Criar conta; informe nome fictício, e-mail próprio e senha de ensaio com oito ou mais caracteres.',
 'Repita a senha em Confirmar senha e toque CRIAR CONTA uma vez.',
 'Aguarde resultado; se aparecer Conta criada com nome incompleto, não repita cadastro: confira o perfil.', LOGOUT,
 'Digite o mesmo e-mail/senha na tela de login, toque ENTRAR e confira a conta em Sistema.'
], 'Guarde a senha de forma privada, fora da ficha; mantenha ou retorne à conta principal.', 'Criação única, mensagem, acesso e perfil; nunca escrever senha nas observações.')
add(16, NO_BOX + ' Conta própria e-mail/senha já criada; nenhuma vinculação Google neste caso.', [LOGOUT,
 'Abra cadastro e preencha o e-mail já cadastrado com dados de ensaio válidos; envie uma vez e anote a recusa.',
 'Volte ao login e digite o mesmo e-mail com uma senha deliberadamente incorreta; envie uma vez.',
 'Observe mensagem e liberação dos campos; não faça dezenas de tentativas, para não disparar bloqueio do Firebase.',
 'Use a senha correta e confira recuperação do acesso.'
], 'Retorne à sessão correta.', 'Mensagens de duplicidade e credencial incorreta, ausência de acesso indevido e recuperação.')
add(17, NO_BOX + ' Conta e-mail/senha própria, acesso à caixa de entrada. Não testar em conta exclusivamente Google.', [LOGOUT,
 'Digite o e-mail no login; toque Esqueci minha senha. Na confirmação, escolha Cancelar e aguarde um minuto; verifique se não chegou nova mensagem dessa tentativa.',
 'Repita e escolha Enviar. Anote horário e mensagem do aplicativo.',
 'Abra entrada e spam; aguarde até cinco minutos de observação. Sem chegada, registre Não recebido/Bloqueado e não declare entrega só porque o app aceitou.',
 'Abra apenas o link recebido do Firebase para sua conta e redefina a senha em particular. Nunca fotografe link/token/senha.'
], 'Guarde a nova senha em local privado e prossiga para T018.', 'Cancelamento, solicitação, horário de recebimento e funcionamento do link; sem expor URL de ação.')
add(18, NO_BOX + ' T017 concluído; conta própria e-mail/senha com senha antiga e nova conhecidas em privado.', [
 'No login, digite e-mail e senha antiga uma única vez; toque ENTRAR.',
 'Anote se acesso foi recusado e se os campos voltaram a responder.',
 'Substitua pela senha nova e toque ENTRAR uma vez.',
 'Confira e-mail/perfil em Sistema. Se senha antiga ainda entrar, registre e pare para análise.'
], 'Mantenha a nova senha; não tente restaurar a antiga por esta ficha.', 'Antiga recusada/nova aceita, versão e mensagem, sem senha nas evidências.')
add(19, NO_BOX + ' Sem sessão; conta Google própria e endereço garantidamente não cadastrado sob seu controle, ou usar exemplo.invalid sem dono real.', [
 'Deixe o e-mail vazio e toque Esqueci minha senha; registre orientação local.',
 'Informe um endereço não cadastrado, por exemplo teste@example.invalid, e confirme a solicitação. Não espere entrega para esse domínio.',
 'Repita com sua conta exclusivamente Google; não redefina nem vincule senha se não houver fluxo apropriado.',
 'Compare as mensagens para não cadastrado/Google; não transforme esse teste em pesquisa sobre contas de terceiros.'
], 'Entre novamente pela forma válida da conta principal.', 'Mensagens genéricas, ausência de fechamento e limite de recuperação da conta Google.')
add(20, NO_BOX + ' ASSISTIDO. Use conta de laboratório própria, não a conta principal. Sem autorização para vincular provedores.', [
 'Registre qual provedor já existe para o e-mail de laboratório: Google ou senha.',
 'Saia e tente o outro caminho com o mesmo e-mail apenas uma vez.',
 'Se surgir conflito de conta/credencial, copie a mensagem e pare; não exclua usuário no console para resolver.',
 'Se entrar ou unir provedores automaticamente, registre qual autenticação foi exigida e solicite minha análise da política de vinculação.',
 'Sem conta de laboratório ou sem forma de verificar o vínculo, marque Bloqueado.'
], 'Não altere provedores; volte à conta principal.', 'Provedor anterior, fluxo tentado, mensagem e autenticação exigida; sem token.')
add(21, 'ASSISTIDO COMIGO, SOMENTE quando a atualização oficial e preservação de dados tiverem autorização própria. Este roteiro não autoriza instalação.', [
 'Antes de atualizar, conclua T001/T004 e guarde evidências e cópia dos dados que precisam permanecer.',
 'Confira o plano de preservação e a assinatura da candidata comigo; se faltar isso, marque Bloqueado e não atualize.',
 'Após a atualização previamente autorizada, abra sem limpar dados; observe se pede novo login no Firebase atual.',
 'Entre na conta correta do projeto novo e compare perfil/histórico com o registro anterior.',
 'Se dados antigos estiverem inacessíveis, registre e pare; não atribua dados a outra conta nem apague armazenamento.'
], 'Não executar rollback ou desinstalação por conta própria; combinar recuperação se necessário.', 'Estado anterior, primeiro acesso, contas e dados após atualização; preservar evidência.')
add(22, NO_BOX + ' Tela de login; versões/menus de aparência podem variar. Anote tamanho de fonte original.', [
 'Com tema Claro configurado, saia e confira o botão Google; toque no G, cancele seletor e depois toque no texto e cancele.',
 'Entre, mude para tema Escuro em Sistema, saia e repita.',
 'No Samsung, procure Tamanho e estilo da fonte nas Configurações e aumente temporariamente um nível; volte ao login.',
 'Confira se símbolo/texto estão cortados, se os toques funcionam e se o botão indisponível parece diferente.',
 'Fotografe claro/escuro/fonte aumentada, sem mostrar conta de terceiros no seletor.'
], 'Restaure fonte/tema e entre na conta principal.', 'Legibilidade, área de toque, proporções e estado desabilitado em cada condição.')
add(23, NO_BOX + ' Confirme a versão pelo T001; sabe onde restaurar a permissão. Não testar revogação com criança ou proteção necessária.', [
 'Abra Configurações do Samsung → Aplicativos → escolha a versão exata do Escolta → Permissões → Dispositivos próximos.',
 'Selecione Não permitir; não use Limpar dados, Desinstalar ou Forçar parada.',
 'Abra o aplicativo pelo ícone; se pedir novamente autorização Bluetooth, escolha Não permitir.',
 'Permaneça 30 s, navegando Central/Sistema; observe fechamentos, mensagem e novos pedidos.',
 'Se o Android fechou o processo ao revogar a permissão, conte o teste a partir da reabertura, não desse encerramento esperado do sistema.'
], 'Restaure a permissão no T024 antes de qualquer teste da caixinha.', 'Reabertura, aviso, quantidade de diálogos em 30 s e versão exata.')
add(24, 'Permissão negada no T023; caixinha inicialmente desligada; mesma versão do aplicativo.', [
 'Abra Configurações → Aplicativos → Escolta correto → Permissões → Dispositivos próximos → Permitir.',
 'Volte ao app; se continuar preso na tela, remova somente de Recentes e abra pelo ícone. Não limpe dados.',
 'Ligue a caixinha pelo meio seguro definido nas instruções gerais.', CONNECT,
 'Observe por 30 s se continua autenticado e se não repete pedido Bluetooth.',
 'Compare perfil e estado com T023; uma nova conexão é necessária para aprovar recuperação.'
], RESTORE, 'Tempo de recuperação, conta preservada e dados recentes.')
add(25, CONNECTED + ' Volume de alarme moderado e nenhuma criança no ensaio.', [
 'Anote configuração original de notificações; no Samsung → Aplicativos → Escolta correto → Notificações, desligue Permitir notificações.',
 'Reabra o app, se o Android tiver encerrado; reconecte e observe se apresenta aviso de notificações bloqueadas.',
 'Com app visível, aperte botão físico por cerca de um segundo, solte e observe todas as saídas por 15 s.',
 'Anote separadamente que não haverá aviso do Android autorizado; isso não justifica sumiço da sirene interna.', CONFIRM
], RESTORE, OUTPUTS)
add(26, NO_BOX + ' Bluetooth autorizado; sem emergência ativa. Recurso de diagnóstico precisa existir.', [
 'No Samsung, abra Aplicativos → Escolta correto → Notificações e permita notificações.',
 'No app, abra Sistema → Verificar prontidão → Testar notificação.',
 'Aguarde até 15 s; puxe a central de notificações e procure Teste da Sentinela — Escolta UNITAU.',
 'Volte ao app, navegue por duas abas e remova/reabra de Recentes uma vez; observe estabilidade.',
 'Se não houver diagnóstico nessa versão, marque Não aplicável e peça um teste equivalente, sem instalar outro APK.'
], 'Restaure a preferência original de notificações; não tratar aviso de diagnóstico como emergência.', 'Aviso recebido/não recebido, banner, reabertura e mensagem de teste.')
add(27, CONNECTED + ' Notificações autorizadas; apenas esta versão monitora a placa.', [
 'Vá para Sistema; puxe a central Android e toque na notificação permanente de monitoramento.',
 'Confira nome da versão aberta e se mostra a Central.',
 'Volte a Sistema, provoque botão físico e aguarde a notificação crítica.',
 'Toque na notificação crítica; confira se abre a mesma versão e o alerta na Central.', CONFIRM
], RESTORE, 'Qual aplicativo abriu em cada toque; tela de destino e alerta preservado.')
add(28, CONNECTED + ' Anote a versão do Android; não retirar Dispositivos próximos.', [
 'Em Configurações → Aplicativos → Escolta → Permissões → Localização, selecione Não permitir.',
 'Deixe Bluetooth e Dispositivos próximos autorizados. Reabra/reconecte se o Android tiver encerrado o processo.',
 'No Android 12 ou superior, observe atualização por 60 s e acione botão físico uma vez.',
 'No Android anterior, se a descoberta exigir localização, registre essa limitação e não marque falha apenas por essa exigência.', CONFIRM
], RESTORE, 'Android, permissão retirada, vínculo/leitura e alerta sem confundir com revogação Bluetooth.')
add(29, NO_BOX + ' Conta própria; nenhum aviso por e-mail para terceiros. Recurso opcional precisa existir.', [
 'Anote opção Compartilhar localização deste celular e a permissão original do Android.',
 'No Android, retire só Localização. No app, mantenha compartilhamento desligado.',
 'Em Sistema, ative Compartilhar localização deste celular, confirme a intenção e negue a autorização do Android se aparecer.',
 'Observe mensagem e estado da opção por 15 s; navegue de volta à Central.',
 'Não habilite envio a contato de terceiro só para testar. Conferência de mensagem recebida é feita em T091.'
], 'Volte o compartilhamento e a permissão ao estado anotado; deixe e-mail experimental desativado se não estiver em teste.', 'Mensagem, opção após recusa e ausência de fechamento/coordenadas inventadas.')
add(30, CONNECTED + ' Ensaio supervisionado e uma permissão por vez; sem demanda de proteção real.', [
 'Fotografe estado conectado; escolha primeiro revogar Dispositivos próximos pelo Android.',
 'Reabra imediatamente o app e observe 30 s; registre desconexão/fechamento e qualquer alegação de proteção.',
 'Restaure Dispositivos próximos, reconecte e confirme/encerre alerta do ensaio; aguarde atualização recente.',
 'Só depois repita retirando notificações, sem retirar Bluetooth; reabra e observe mais 30 s.',
 'Registre cada subteste separado. O sistema pode matar processo na revogação; não exigir que evento seja enviado por um processo que não está rodando.'
], RESTORE, 'Permissão específica, momento da revogação, reabertura e recuperação em cada subteste.')
add(31, 'Caixinha alimentada com segurança, fechada a cerca de 1 m; Bluetooth/Dispositivos próximos autorizados; sem alerta anterior.', [
 'Abra somente a versão identificada; anote se Conexão automática está ligada.', CONNECT,
 'Confira Vínculo ativo e Atualizado agora, ou a leitura equivalente dessa versão. A palavra Conectado sozinha não prova recebimento de dados.',
 'Permaneça 60 s na Central sem pressionar botão nem mover os dispositivos.',
 'Anote se houve buzzer, vibração, mudança para amarelo/vermelho ou mensagem durante a conexão inicial.'
], 'Mantenha aparelhos na posição, sem alterar calibração.', 'Tempo de conexão e primeira leitura, estado estável e possíveis alertas na conexão.')
add(32, NO_BOX + ' Bluetooth autorizado e opção de conexão anotada.', [
 'Confirme ausência de alimentação na caixinha por método seguro; não basta desconectar USB se a bateria ainda alimenta.',
 'Abra Central e toque PROCURAR AGORA, se disponível, ou observe a busca automática.',
 'Observe por 30 s; anote erro e se aparecem valores antigos como atuais. Tentativas automáticas podem reiniciar busca; registre essa diferença.',
 'Navegue para Sistema e volte para conferir se o app responde.',
 'Ligue a caixinha com segurança e teste recuperação antes de terminar.'
], RESTORE, 'Duração, tentativas automáticas, mensagem e recuperação; sem pressupor timeout universal da rede.')
add(33, NO_BOX + ' Bluetooth inicialmente ligado; caixinha pode ser ligada depois com segurança.', [
 'Desligue só Bluetooth pela barra rápida do Samsung; deixe internet ativa.',
 'Abra Central e tente PROCURAR AGORA; observe mensagem por 15 s.',
 'Ligue Bluetooth e a caixinha; mantenha os dispositivos a cerca de 1 m.', CONNECT,
 'Compare perfil, mensagem e atualização antes/depois da recuperação.'
], RESTORE, 'Aviso Bluetooth desligado, tempo de recuperação e conta preservada.')
add(34, NO_BOX + ' Anote Conexão automática; caixinha desligada permite observar a busca.', [
 'Abra Central e toque PROCURAR AGORA três vezes rapidamente; se o botão sumir durante busca, registre, não force.',
 'Enquanto busca, vá a Sistema e Registros e volte à Central.',
 'Ligue a caixinha com segurança e aguarde até 30 s para observar conexão.',
 'Confira se existe só um estado de busca/conexão e se os dados atualizam por 60 s.'
], RESTORE, 'Cliques aceitos, estados duplicados, navegação e conclusão da busca.')
add(35, 'Caixinha com chave ou conector de alimentação removível seguro; não tocar em soldas. Bluetooth autorizado.', [
 'Comece uma busca na Central com a placa ainda disponível e próxima.',
 'Durante a indicação de busca/sincronização, desligue a caixinha pelo método seguro.',
 'Aguarde 15 s e anote o que o app mostrou; se a conexão já estava completa, registre que esse ciclo não atingiu a condição pretendida.',
 'Religue e aguarde recuperação; repita uma vez se necessário, sem confundir uma perda já conectado com falha durante busca.',
 'Se não houver meio seguro de desligar ou a janela for impossível de capturar, marque Bloqueado.'
], RESTORE, 'Momento do desligamento: busca, sincronização ou conexão completa; erro e recuperação.')
add(36, CONNECTED, [
 'Abra Central e anote hora da primeira leitura, RSSI e distância exibida.',
 'Deixe os dois imóveis por cinco minutos; a cada minuto, anote idade da atualização, RSSI, estimativa e estado.',
 'Se estimativa ficar igual, confira se horário/RSSI continuam novos: número estável não é, sozinho, congelamento.',
 'Se a idade da atualização crescer continuamente, fotografe e anote quando sumiu a indicação de dados atuais.',
 'Não mova a caixinha só para forçar mudança; isso acrescentaria outra variável ao ensaio.'
], 'Mantenha posição e energia; registre falha antes de reconectar.', 'Tabela dos minutos 0–5 com idade da leitura, RSSI, estimativa e estado.')
add(37, NO_BOX + ' Conexão automática disponível; método seguro para ligar caixinha.', [
 'Em Sistema → Conexão automática, ative; anote que foi uma alteração de ensaio.',
 'Abra a Central com a caixinha desligada e espere 15 s.',
 'Ligue a caixinha próxima e inicie cronômetro; não toque PROCURAR AGORA neste ciclo.',
 'Observe até 30 s se encontra e recebe dados. Se não, registre antes de tentar manualmente.',
 'Repita três vezes, limpando apenas alerta/estado do ensaio, não os dados do aplicativo.'
], RESTORE, 'Resultado e tempo de cada tentativa automática; separar resgate manual.')
add(38, CONNECTED + ' Prefêrencia original de conexão anotada.', [
 'Em Sistema, desligue Conexão automática e confirme a desativação.',
 'Interrompa o vínculo desligando Bluetooth; observe o alerta sem supor que esta preferência silencia emergência.',
 'Religue Bluetooth e aguarde 15 s sem tocar no app; registre se ele reconectou apesar da preferência.',
 'Na Central, toque PROCURAR AGORA e observe recuperação e dados atuais.', CONFIRM
], RESTORE, 'Comportamento sem reconexão automática, resposta manual e saídas de alerta.')
add(39, CONNECTED + ' Trena, apoios não metálicos e cronômetro. Não usar chão como referência se os outros ensaios serão elevados.', [
 'Meça centro a centro uma distância próxima de 1 m; fixe caixinha e celular na mesma altura, por exemplo 1 m do chão, e anote a altura real usada.',
 'Mantenha faces/orientação iguais e operador fora da linha entre eles; fotografe posição.',
 'Deixe o sistema estabilizar por 30 s; depois observe dez minutos sem mexer nos aparelhos.',
 'A cada minuto, registre cor, RSSI, estimativa e idade da atualização. Registre imediatamente qualquer bipe/vibração.',
 'Se aparecer alerta, anote início, duração e motivo antes de confirmar. Não suponha que todo vermelho foi por distância.'
], RESTORE, 'Minutos 0–10, posição/altura, RSSI e motivo de cada falso alerta possível.')
add(40, CONNECTED + ' Trena, marcações, trajeto livre e ajuda de outro adulto. Não alterar calibração ou firmware. Se cabo USB limita o percurso, combine servidor por rede comigo ou marque infraestrutura Bloqueada; não desconecte cabo supondo que a versão é autônoma.', [
 'Fixe a caixinha fechada em apoio não metálico; marque no percurso 1, 2, 3, 5, 7, 10 e 15 m centro a centro, até o espaço disponível.',
 'Use para o celular apoio na mesma altura da caixinha, mantendo a orientação. Não segure ambos de forma diferente em cada posição.',
 'Comece em 1 m. Se existir Sistema → Ensaio de proximidade, selecione 1 m, preencha altura/condição e toque INICIAR ENSAIO.',
 'Deixe a tela aberta e dispositivos parados: aguarde dez segundos de estabilização e trinta amostras novas, normalmente mais trinta segundos.',
 'Sem coletor nessa versão, aguarde dez segundos e anote RSSI/estimativa em seis momentos separados por cinco segundos; identifique como leitura manual.',
 'Só após concluir, mova o celular para a próxima marca e repita. Não colete caminhando nem use estimativa para escolher a marca real.',
 'Faça três coletas por ponto quando possível. Sem espaço para 15 m ou sem vínculo, encerre no último ponto válido e registre a limitação.',
 'Se alarme surgir, mantenha anotação: ele não exige encerrar coleta se vínculo e leituras continuam; para silenciar, interrompa/guarde antes e confirme na Central.'
], RESTORE, 'Para cada ponto: distância real, média/faixa estimada, RSSI, altura, orientação, repetição e interrupções. Exportar antes de perder dados.')
add(41, 'T040 concluído; mesmas marcas, altura, orientação e versão. Alerta anterior pode estar retido e deve ser anotado.', [
 'Comece na marca mais distante ainda com vínculo; identifique o percurso como volta.',
 'Faça uma coleta imóvel conforme T040, com a distância real selecionada corretamente.',
 'Mova apenas o celular para a próxima marca menor; repita até 1 m, sem girar aparelhos.',
 'Anote o ponto/tempo em que amarelo voltou ao estado seguro; vermelho retido não significa sinal ainda fraco.',
 'Compare ida/volta por ponto sem selecionar só a leitura mais favorável.'
], RESTORE, 'Percurso, ponto, média/faixa, tempos de retorno e estado retido do alerta.')
add(42, 'Conexão estável numa marca medida, por exemplo 3 m; trena e cronômetro. Não alterar a distância entre subtestes.', [
 'Observe trinta segundos na orientação inicial e anote RSSI/faixa estimada.',
 'Gire somente a caixinha cerca de 90 graus no mesmo lugar; aguarde dez segundos e observe trinta.',
 'Volte à orientação original; gire só o celular cerca de 90 graus e repita.',
 'Restaure orientação; coloque o corpo entre eles por trinta segundos e registre.',
 'Separadamente coloque o celular no bolso, sem caminhar; observe e registre. Não misture bolso, giro e aumento de distância no mesmo subteste.'
], RESTORE, 'Orientação/obstáculo de cada condição, RSSI/estimativa/estado e saídas de alerta.')
add(43, 'Marca próxima medida, porta não metálica disponível e operador seguro. Não usar obstáculos que prendam ou danifiquem os dispositivos.', [
 'Posicione aparelhos de cada lado da porta, na mesma altura; meça distância centro a centro e mantenha fixa.',
 'Com porta aberta, observe trinta segundos e registre RSSI/estimativa/estado.',
 'Feche apenas a porta; não mova aparelhos. Aguarde dez segundos e observe trinta.',
 'Reabra a porta, observe recuperação por trinta segundos e anote.',
 'Se comparar parede, registre como condição separada com distância/posição novas; não chamar a diferença de erro de metragem comprovado.'
], RESTORE, 'Material/espessura aproximada do obstáculo, distância fixa, estado antes/depois e recuperação.')
add(44, 'ASSISTIDO se não houver leituras filtradas/firmware confirmado. Não usar botão físico para provocar esse cenário.', [
 'Comece conectado, seguro e com leitura recente; anote firmware. Abra leitura de RSSI se disponível.',
 'Use posição/obstáculo onde o sinal enfraqueça sem perder vínculo. Faça uma exposição breve de cerca de um a dois segundos e retorne perto.',
 'Observe por trinta segundos; registre se houve atenção ou emergência e se o enlace caiu.',
 'Depois repita enfraquecimento sustentado por até vinte segundos, observando sinal filtrado e mantendo vínculo; marque início do sinal fraco sustentado, amarelo e vermelho.',
 'Se caiu Bluetooth, classifique como perda de enlace, não temporização de RSSI. Se não atingiu os limiares, não declare o filtro aprovado: marque condição não alcançada.',
 'Compare duração observada com a referência do firmware identificado; exposição física de quatro segundos não garante quatro segundos de RSSI filtrado fraco.'
], RESTORE, 'RSSI filtrado, começo/fim da exposição, manutenção do vínculo, amarelo/vermelho e condição realmente atingida.')
add(45, 'ASSISTIDO para interpretar RSSI. Vínculo contínuo, marca próxima de transição encontrada no T040; não recalibrar.', [
 'Escolha uma posição onde amarelo possa aparecer sem perda de Bluetooth; registre leitura filtrada e tempo.',
 'Permaneça trinta segundos até estabilizar. Mova o celular só alguns centímetros para frente e aguarde dez segundos.',
 'Volte alguns centímetros e aguarde dez segundos; faça três ciclos, sem tocar botão.',
 'Anote cada troca de estado e bipe, em vez de registrar só a tela final.',
 'Se a condição cruza os limites de retorno de fato, transição pode ser correta. Se não há leitura filtrada suficiente, registre análise pendente.'
], RESTORE, 'Posições, RSSI filtrado e tempos/quantidade de trocas e bipes; não exigir limite em metros.')
add(46, 'Vínculo ativo e T044 ou percurso medido disponível; sem emergência inicial.', [
 'Afaste/obstrua até atenção sustentada sem perder vínculo; anote amarelo e tempo.',
 'Retorne à marca de 1 m, na orientação original; observe trinta segundos sem confirmar segurança, registrando retorno do amarelo.',
 'Reponha condição segura; depois provoque emergência por enfraquecimento sustentado ou por botão físico, anotando claramente qual foi usado.',
 'Volte perto sem confirmar; observe trinta segundos e confira se emergência ficou retida.', CONFIRM
], RESTORE, 'Retorno do amarelo, retenção do vermelho, origem do vermelho e tempo até confirmação.')
add(47, CONNECTED + ' Cronômetro/segundo adulto para observar celular e caixinha.', [
 'Abra Central; confira atualização recente e ausência de alerta.',
 'Acione o botão físico por cerca de um segundo e solte. Inicie cronômetro no toque ou filme os dois, sem dados pessoais.',
 'Observe as quatro saídas por quinze segundos; não toque Confirmar imediatamente.',
 'Anote primeiro buzzer, depois alerta do celular e estado; não esperar metragem mudar para considerar o botão.', CONFIRM,
 'Após voltar ao estado seguro com leitura recente, repita o ciclo mais duas vezes.'
], RESTORE, OUTPUTS)
add(48, CONNECTED + ' Notificações autorizadas. Não remover de Recentes; testar minimizado e bloqueado separadamente.', [
 'Pressione Início do Android para minimizar; aguarde trinta segundos sem fechar o processo.',
 'Aperte botão físico por cerca de um segundo; observe quinze segundos sem trazer o app para frente, anotando som/vibração/notificação.',
 'Abra o app, confira alerta e confirme segurança presencialmente.',
 'Agora bloqueie a tela pelo botão lateral; aguarde trinta segundos e repita acionamento com a tela bloqueada.',
 'Só após anotar saídas/latência, desbloqueie, abra e confirme. Repita cada contexto três vezes, restaurando estado entre ciclos.'
], RESTORE, 'Registro separado de minimizado e bloqueado, três repetições e quatro saídas por contexto.')
add(49, CONNECTED + ' Estado seguro e botão sem defeito mecânico aparente.', [
 'Mantenha botão físico pressionado por três segundos, sem força excessiva; solte completamente.',
 'Observe quinze segundos, contando alertas/sons simultâneos e se o botão retornou.', CONFIRM,
 'Após estado seguro, aperte e solte cinco vezes, com cerca de meio segundo entre pressões; não esmagar prolongador.',
 'Observe outros quinze segundos e confirme. Se botão ficar preso, pare o teste mecânico e desligue por método seguro, sem forçar.'
], RESTORE, 'Retorno mecânico, eventos gerados e sons sobrepostos para pressão longa e sequência rápida.')
add(50, CONNECTED + ' Alerta será provocado por botão para não depender de RSSI.', [
 'Acione botão físico e confira emergência no celular; não confirme.',
 'Mantenha aparelhos perto por trinta segundos; veja se proximidade sozinha encerra alerta.',
 'Desligue Bluetooth do celular por dez segundos e religue; anote que essa perda foi intencional.',
 'Aguarde reconexão/dados atuais por até trinta segundos, sem confirmar.',
 'Registre se alerta ficou retido apesar de vínculo/sinal recuperados; só depois confirme presencialmente.'
], RESTORE, 'Emergência antes, perto, desconectada e reconectada; tempo e saídas.')
add(51, CONNECTED + ' Alerta por botão ativo; local verificado por adulto; não fazer confirmação fictícia em emergência real.', [
 'Confira buzzer, celular e estado crítico antes de qualquer clique.',
 'Na Central, toque CONFIRMAR SEGURANÇA e leia a confirmação.',
 'Escolha Sim, está segura somente neste ensaio após verificar o dispositivo; marque horário do clique.',
 'Observe buzzer, sirene, vibração, tela e notificação por trinta segundos, anotando quando cada um parou.',
 'Abra Registros e confira evento de confirmação; repita três ciclos a partir do botão, se o primeiro não apresentou falha.'
], RESTORE, 'Tempo de cada saída parar, resposta da placa, registro e eventual reativação.')
add(52, 'ASSISTIDO para condição de corrida. Alerta ativo, vínculo válido; um adulto pode operar Bluetooth enquanto outro observa.', [
 'Inicie alerta por botão e abra a confirmação, mas não aceite ainda.',
 'Combine tentativa: toque Sim, está segura e, imediatamente, desligue Bluetooth pela barra rápida.',
 'Observe mensagem e se a placa já tinha parado antes de o vínculo cair. Esse detalhe define se ocorreu falha de comando ou sucesso seguido de perda.',
 'Repita no máximo três vezes, restaurando vínculo/alerta entre elas. Não chamar de falha um ciclo cujo comando já foi confirmado.',
 'Se não capturou interrupção antes da resposta, marque condição não alcançada/Bloqueado e peça ensaio assistido; não modificar código para forçar timeout.'
], RESTORE, 'Ordem temporal: clique, resposta/buzzer parado, vínculo perdido e mensagem. Registrar corrida não reproduzida.')
add(53, 'Alerta por botão previamente recebido; adulto verificou fisicamente a caixinha. Não há demanda real de segurança.', [
 'Com alerta no app, desligue Bluetooth e mantenha desligado; confira estado sem vínculo.',
 'Abra Central → CONFIRMAR SEGURANÇA → Sim, está segura após a verificação presencial do ensaio.',
 'Observe por trinta segundos se saídas locais param e se a tela continua indicando falta de conexão.',
 'Confira que a caixinha pode continuar alertando: sem enlace não houve prova de reset remoto.',
 'Religue Bluetooth, aguarde vínculo/dados e, se placa continuar em pânico, confirme novamente com resposta válida.'
], RESTORE, 'Saídas locais/caixinha separadas, estado sem vínculo, retorno e reset posterior.')
add(54, CONNECTED + ' Alerta por botão ativo.', [
 'Na Central, toque CONFIRMAR SEGURANÇA.',
 'Na pergunta, escolha Continuar em alerta, não Sim, está segura.',
 'Aguarde quinze segundos e conte se surgiu um segundo áudio sobreposto; registre estado.',
 'Alterne Sistema/Registros e volte à Central; observe se alerta permaneceu.', CONFIRM
], RESTORE, 'Retenção do alerta, número de sons e navegação; escolha feita na confirmação.')
add(55, CONNECTED + ' Notificações e vibração originalmente ativas; volume moderado.', [
 'Anote configurações originais. Em Sistema, desligue Alertas de emergência e confirme a escolha.',
 'Com app visível, acione botão físico; registre som e ausência/presença de notificação do sistema. Confirme segurança.',
 'Restaure Alertas de emergência. Desligue apenas Vibração e confirme.',
 'Acione botão novamente; registre som, visual e se celular vibrou. Confirme.',
 'Não desligue ambas no mesmo subteste inicial; se comparar ambas desligadas, registre como terceiro cenário distinto.'
], RESTORE, OUTPUTS)
add(56, 'Caixinha ligada perto; Bluetooth do celular pode ficar desligado; nada deve depender de enlace inexistente.', [
 'Anote estado seguro antes. Desligue Bluetooth; aguarde até a tela reconhecer perda e registre eventual alerta do celular pela perda.',
 'Aperte botão físico e observe o buzzer local por quinze segundos. Alerta já disparado no celular pela perda não prova recebimento do botão.',
 'Religue Bluetooth e aguarde conexão/dados atuais.',
 'Confira o estado enviado pela placa: se ainda panico ativo, veja se app trata essa informação. Não exigir armazenamento de evento se firmware não o mantém.', CONFIRM
], RESTORE, 'Causa e horário de cada alerta, buzzer sem enlace e estado da placa na reconexão.')
add(57, CONNECTED + ' Faça primeiro T051; todas as saídas deveriam ter parado.', [
 'Confirme um alerta por botão com vínculo válido e anote o fim das saídas.',
 'Deixe aparelhos imóveis perto e aguarde trinta segundos sem apertar novamente.',
 'Anote qualquer alarme/aviso que reaparecer, verificando se o vínculo ou RSSI realmente mudaram.',
 'Abra Registros, compare horários e fotografe possível evento repetido.',
 'Repita três ciclos; se som reativar sem evento novo, pare para análise antes de testar outro comportamento.'
], RESTORE, 'Tempo de reativação ou ausência dela, vínculo/RSSI e registro com horário.')
add(58, CONNECTED + ' Só desligar caixinha se houver chave/conector removível seguro. Não mexer em soldas.', [
 'Abra Central e confira dados atuais; inicie vídeo/cronômetro com ajuda de outro adulto.',
 'Desligue a caixinha por método seguro; marque t0, horário da interrupção física.',
 'Observe quando app passa a sem vínculo: marque t1. Observe início de cada saída crítica: marque t2 para cada uma.',
 'Aguarde até trinta segundos se não houver alerta; esse é limite de observação, não aprovação automática.',
 'Calcule t1−t0 (detecção) e t2−t1 (tolerância/saída). Não exigir alarme exatamente cinco segundos após retirar energia.',
 'Religue, recupere vínculo/dados e confirme; repita três vezes. Sem método seguro de desligar, registre Bloqueado e use T062 como teste distinto.'
], RESTORE, 't0/t1/t2 para cada saída, contexto, referência do app e resultado das três repetições.')
add(59, CONNECTED + ' T058 conhecido; método seguro de energia. Não confundir minimizar com fechar aplicativo.', [
 'Pressione Início para minimizar e aguarde trinta segundos.',
 'Desligue a caixinha com segurança; registre interrupção e saídas sem trazer o app à frente.',
 'Após observar, abra e confira estado; religue, reconecte e confirme.',
 'Volte ao estado seguro, bloqueie tela e espere trinta segundos. Repita interrupção e registre com tela bloqueada.',
 'Só então desbloqueie e recupere. Faça três ciclos por contexto; registre detecção visual quando só puder observá-la após abrir.'
], RESTORE, 'Contexto e tempos observáveis; não inventar t1 quando tela estava apagada. Buzzer/energia e saídas do celular separados.')
add(60, CONNECTED + ' Cronômetro; nenhum botão físico. Manter caixinha ligada para evitar atraso de reinício do firmware.', [
 'Desligue Bluetooth do celular por cerca de um segundo e religue imediatamente; marque intervalo real.',
 'Observe trinta segundos a reconexão e primeira atualização recente; não tocar confirmar antes de registrar.',
 'Anote se a recuperação completa aconteceu antes de a tolerância vencer. Religá-lo não é o mesmo que restabelecer dados válidos.',
 'Repita três ciclos, esperando estado seguro entre eles.',
 'Se o Android demorou mais do que a tolerância para reconectar, não interpretar alerta como defeito do cancelamento; registrar condição não alcançada.'
], RESTORE, 'Intervalo Bluetooth desligado, retorno do vínculo/dados e alerta eventual, por ciclo.')
add(61, 'T058 gerou alerta crítico; caixinha desligada; adulto acompanha o dispositivo.', [
 'Religue a caixinha perto e inicie cronômetro.',
 'Aguarde vínculo e leitura recente até trinta segundos; não confirme segurança neste intervalo.',
 'Observe se alerta se mantém e anote diferença entre sinal recuperado e emergência retida.',
 'Depois confirme presencialmente na Central; confira resposta e fim das saídas.',
 'Observe outros trinta segundos para impedir falsa aprovação de uma parada momentânea.'
], RESTORE, 'Tempo de reconexão/dados, retenção e encerramento após confirmação.')
add(62, CONNECTED + ' Usar Bluetooth do celular para perda controlada, sem desligar energia da placa.', [
 'Desligue Bluetooth e deixe por dez segundos; observe alerta e registre.',
 'Religue, aguarde vínculo/dados atuais até trinta segundos e confirme segurança após verificar.',
 'Aguarde trinta segundos de estado estável.',
 'Repita mais duas vezes, anotando resultado de cada ciclo em separado.',
 'Se serviço/sons duplicarem ou aplicativo travar, interrompa e registre antes de qualquer resgate.'
], RESTORE, OUTPUTS)
add(63, CONNECTED + ' Baterias suficientes, nenhuma mudança de economia de energia durante este caso.', [
 'Anote ajuste de bateria do Android e estado pronto; mantenha a caixinha perto e fixa.',
 'Bloqueie a tela e cronometre quinze minutos; não desbloqueie para conferir a cada minuto.',
 'Ao final, pressione botão físico com a tela ainda bloqueada; registre quinze segundos de saídas.',
 'Desbloqueie, veja alerta e idade dos dados, confirme presencialmente.',
 'Em ciclo separado, repita quinze minutos e ao final provoque perda de vínculo; usar perda em vez do botão no mesmo ciclo confundiria causa.'
], RESTORE, 'Duração real, bateria/ajuste Android, contexto e saídas após os dois eventos separados.')
add(64, CONNECTED + ' Apenas teste adulto; remover de Recentes não é garantia de serviço vivo.', [
 'Anote estado pronto; abra Recentes e remova somente o Escolta com um deslize.',
 'Espere trinta segundos; veja se notificação permanente ainda existe, sem interpretar isso sozinho como prova de BLE.',
 'Aperte botão físico e registre saídas por quinze segundos.',
 'Abra pelo ícone; confira estado, idade da atualização e alerta, antes de confirmar.',
 'Depois restaure e, se necessário, faça um ciclo separado de perda. Registre a limitação quando o fabricante parar serviço.'
], RESTORE, 'Serviço/notificação após Recentes, alerta real e estado na reabertura; sem apagar dados.')
add(65, CONNECTED + ' Ensaio de limitação, não promessa de proteção com processo forçadamente parado. Sem criança.', [
 'No Android → Aplicativos → Escolta correto, toque Forçar parada e confirme. Não use Armazenamento/Limpar dados.',
 'Espere trinta segundos; pressione botão físico e anote que caixinha pode alertar sem processo do celular.',
 'Abra o app manualmente, restabeleça servidor se necessário, confira estado e reconecte; só depois confirme.',
 'Em ciclo separado e com estado estável, reinicie o celular; não interpretar o período desligado como monitoramento protegido.',
 'Restabeleça servidor de desenvolvimento se necessário e abra manualmente; confira vínculo, estado e registros.'
], RESTORE, 'Período sem processo, buzzer independente, reabertura e diferença entre parada forçada e reinício.')
add(66, CONNECTED + ' Anote ajuste original de economia/bateria; qualquer otimização não será alterada permanentemente.', [
 'Ative Economia de energia pela barra rápida ou Configurações → Bateria; registre o modo exato.',
 'Reconecte se o Android interrompeu o app; confira dados atuais e bloqueie a tela por cinco minutos.',
 'Pressione botão físico e anote saídas antes de desbloquear.',
 'Abra, confira estado e confirme. Faça ciclo separado de perda de vínculo sob o mesmo modo.',
 'Desative/restaure economia ao valor original e repita evento básico para conferir recuperação.'
], RESTORE, 'Modo de economia, intervalo de tela apagada, saídas, falha e recuperação fora do modo.')
add(67, CONNECTED + ' Opção de espera disponível. Pausa retira proteção: somente ensaio supervisionado.', [
 'Abra Sistema → Colocar Sentinela em espera.',
 'Na confirmação, escolha Manter proteção; volte à Central e observe trinta segundos de dados.',
 'Repita a solicitação e desta vez escolha Colocar em espera.',
 'Espere confirmação; registre estado da placa, tela, vínculo e saídas por trinta segundos.',
 'Se comando falhar, não declare modo de espera confirmado. Não use saída forçada para produzir o estado esperado.'
], 'Na Central/Sistema, use Retomar proteção e confira resposta da placa e dados atuais.', 'Cancelamento versus pausa confirmada, tempo e eventual emergência falsa.')
add(68, 'Espera confirmada no T067; método seguro de desligar/religar placa; opção original de reconexão anotada.', [
 'Confirme tela em espera; feche/reabra o app e veja se intenção de pausa persistiu.',
 'Desligue e religue a caixinha com segurança; registre que reiniciar firmware pode alterar estado próprio da placa.',
 'Observe trinta segundos no app sem Retomar; anote se iniciou conexão/alarme por conta própria.',
 'Solicite Retomar proteção explicitamente e confira se app/placa passam a concordar após resposta.',
 'Sem forma segura de reiniciar a placa, marque essa parte Bloqueada, sem retirar bateria soldada.'
], RESTORE, 'Estado de espera antes/depois de reabertura/reinício e resultado de retomada explícita.')
add(69, 'Espera confirmada, bateria suficiente e meio seguro para desligar caixinha.', [
 'Com placa ligada perto, toque RETOMAR PROTEÇÃO e confirme Retomar proteção; observe resposta e atualização.',
 'Reponha espera de forma confirmada, sem apagar dados.',
 'Desligue a placa com segurança e solicite Retomar outra vez; observe até trinta segundos.',
 'Registre mensagem e se apareceu verde/proteção antes de dados válidos.',
 'Religue e tente retomar novamente; registre recuperação. Sem recurso de espera nesta versão, Não aplicável.'
], RESTORE, 'Sucesso com placa, falha sem placa e recuperação, sem misturar os subtestes.')
add(70, CONNECTED + ' Saiba as credenciais de retorno; nenhum alerta anterior.', [
 'Anote estado pronto e saídas silenciosas; abra Sistema → Sair da conta.',
 'Escolha Sair e encerrar e aguarde resultado, observando se a placa confirma desarme.',
 'Se surgir erro de desarme, fotografe; escolha Cancelar, não Sair mesmo assim.',
 'No sucesso, confira tela de login, buzzer/áudio/vibração e notificação por trinta segundos.',
 'Entre novamente e veja intenção de espera/proteção antes de pressionar botão.'
], 'Recupere conta e retome proteção explicitamente quando necessário.', 'Resposta de desarme, sucesso/falha do logout e saídas após saída; nunca presumir reset remoto.')
add(71, NO_BOX + ' Credenciais de retorno; dois subtestes separados.', [
 'Com placa desligada, deixe busca em andamento e solicite Sair e encerrar.',
 'Observe trinta segundos no login; confirme ausência de conexão/tela tardia da conta anterior.',
 'Entre de novo; deixe sem vínculo, mas sem busca se a versão permitir, e repita logout.',
 'Entre novamente e ligue a caixinha perto; observe qual conta e estado são usados.',
 'Se a versão exige conexão para desarmar e recusa logout, registre a mensagem; não force saída para esconder o resultado.'
], RESTORE, 'Busca/cancelamento, estado atrasado e comportamento dos dois logouts.')
add(72, 'Adulto; bateria e USB adequados ao circuito existente. Não conectar/desconectar soldas ou usar fonte desconhecida.', [
 'Alimente pela bateria no circuito já montado; confirme conexão e anote telemetria inicial.',
 'Com tampa fechada, insira USB-C reto e suavemente; pare se plugue forçar a placa ou não encaixar.',
 'Espere um minuto, observando conexão e indicadores de USB/carregamento.',
 'Retire apenas o cabo USB; confira por um minuto se bateria mantém funcionamento.',
 'Repita três inserções/retiradas. Teste USB sem bateria somente se existir conector removível seguro e essa forma tiver sido previamente aprovada; caso contrário, marque Bloqueado.'
], 'Volte à alimentação usual e confira ausência de aquecimento anormal; se aquecer/inchar, pare o ensaio.', 'Encaixe, energia inicial/final, telemetria, reinícios e interrupções por ciclo.')
add(73, 'Circuito montado e estável; leitura é estimada. Não medir contatos energizados com instrumentos sem preparo.', [
 'Com caixinha conectada, anote percentual/voltagem e horário a cada dez minutos durante uso normal.',
 'Conecte USB-C aprovado e anote indicador de carregamento/USB e evolução durante trinta minutos.',
 'Retire USB e repita anotação após um e dez minutos, sem interpretar salto de tensão como capacidade exata.',
 'Verifique se valores continuam plausíveis e se ficam indisponíveis ao perder telemetria, em vez de atuais.',
 'Sem medição independente, descreva evolução/coerência; não chamar comparação de comprovação laboratorial da carga.'
], 'Recarregue normalmente quando necessário, sem abrir/soldar bateria.', 'Horário, percentual, tensão estimada, fonte e estado; nenhuma precisão independente inventada.')
add(74, 'Descarga natural supervisionada; não acelerar com curto/carga improvisada nem desativar proteção.', [
 'Use normalmente e acompanhe nível com dados recentes; registre antes/depois da faixa de 20%, quando ela ocorrer naturalmente.',
 'Observe avisos/histórico por cinco minutos sem recarregar ou mover; conte repetições.',
 'Se 10% for atingido naturalmente e for seguro, registre o aviso crítico e conecte carregamento aprovado imediatamente; não buscar descarga profunda.',
 'Observe se recarga/carregando limpa a condição de aviso sem apagar emergência de botão.',
 'Se não atingir limiares nesta sessão, registre Bloqueado/Não testado nesses pontos; não mudar firmware ou falsificar percentual.'
], 'Deixe em carga normal supervisionada; pare se houver calor/inchaço.', 'Leituras e horários de cruzamento, número de avisos, fonte e recuperação.')
add(75, 'Bateria carregada normalmente, adulto disponível e registro periódico. Escolher condição antes: monitoramento contínuo sem alertas, ou com reconexões/alertas documentados.', [
 'Retire USB e registre hora inicial, percentual/tensão e modo de uso; mantenha caixinha na bateria.',
 'Deixe monitoramento ativo nas condições escolhidas, anotando carga e vínculo a cada trinta minutos.',
 'Registre cada botão, perda, reconexão e interrupção, com horário; não omitir alarmes para melhorar autonomia.',
 'Encerre no primeiro ponto seguro escolhido, por exemplo aviso de 10%, e conecte carregador; não descarregar até zero para completar a ficha.',
 'Calcule horas entre início/fim; anote porcentagens e limite usado. Se interromper antes por agenda, marque ensaio parcial.',
 'Para comparar outro modo de uso, faça outro ciclo completo em outro dia, não extrapole este.'
], 'Recarregue com supervisão e guarde o relatório.', 'Duração real, faixa de carga, condição, eventos e motivo do término; não prometer 11 h gerais.')
add(76, 'Caixa montada/parafusada e botão acessível; sem criança. Retorno mecânico vem antes de repetir alerta.', [
 'Confira que botão externo não está já pressionando permanentemente a chave; fotografe repouso.',
 'Pressione/solte suavemente pelo centro cinco vezes e confira retorno após cada toque.',
 'Repita cinco vezes em posições perto das bordas, sem força lateral/excessiva; complete vinte ciclos variando centro/bordas.',
 'Se estiver conectada, registre alerta e confirme entre ciclos para distinguir novos acionamentos de pânico já retido.',
 'Se prolongador prender, trava soltar ou suporte ceder, pare; não lixe/cole/force para continuar o ensaio sem registrar.'
], 'Encerre alerta com resposta válida; se botão travou, pare uso e combine ajuste mecânico.', 'Posição, ciclo da falha, retorno, folga e fotos sem modificar peça durante teste.')
add(77, 'Caixinha inicialmente sem alimentação por método seguro; não abrir energizada para tocar bateria/soldas.', [
 'Inspecione tampa/parafusos externamente; veja LED/USB-C e saída de som sem inserir ferramenta nos furos.',
 'Se abertura for necessária e segura, retire tampa com cuidado; fotografe fixações e fios, sem descolar ou cortar abraçadeiras.',
 'Confira visualmente soldas livres de pressão, bateria sem compressão e fios sem cobre exposto; não apertar Li-Po para verificar firmeza.',
 'Feche normalmente, sem apertar parafuso além do necessário, e movimente suavemente a caixa nas mãos; não sacuda/derrube.',
 'Alimente/reconecte e confira LED, botão e saída sonora; registre qualquer peça deslocada ou falha antes de mexer.'
], 'Monte apenas como estava; não corrigir solda, mudar fixação ou substituir peça por este roteiro.', 'Fotos de fixação, movimento, acesso/LED/som e qualquer risco ou deslocamento.')
add(78, CONNECTED + ' Para desenvolvimento, mantenha servidor acessível por USB, não pelo Wi-Fi que será retirado.', [
 'Confira conexão/dados atuais; desative Wi-Fi e Dados móveis, mantendo Bluetooth ligado.',
 'Se o app depende de servidor, confirme comigo previamente a ligação USB; erro do servidor torna o caso Bloqueado, não falha BLE.',
 'Com a rede realmente ausente, aperte botão físico, observe quinze segundos e confirme com vínculo válido.',
 'Faça outro ciclo: desligue Bluetooth por dez segundos, observe perda/alerta, religue, reconecte e confirme.',
 'Não reative internet entre os dois eventos. Anote falhas de e-mail separadas das saídas locais.'
], RESTORE + ' Reative a rede original.', OUTPUTS)
add(79, CONNECTED + ' Anote redes originais; servidor via USB se desenvolvimento. Modo avião pode desligar Bluetooth.', [
 'Comece com Wi-Fi ativo; desligue só Wi-Fi e ative Dados móveis. Observe atualização por trinta segundos.',
 'Volte ao Wi-Fi e observe mais trinta segundos; não atribua troca de rede a perda Bluetooth sem conferir.',
 'Ative modo avião; anote se Bluetooth também desligou e se o app detectou perda.',
 'Com modo avião ainda ativo, religue manualmente Bluetooth se o Samsung permitir, mantenha internet desligada e observe reconexão.',
 'Desative modo avião, restaure rede, confira vínculo/dados e confirme alerta supervisionado.'
], RESTORE + ' Restaure Wi-Fi/dados/modo avião aos valores originais.', 'Estado de cada rádio e do enlace em cada etapa; mensagens, saídas e recuperação.')
add(80, CONNECTED + ' Nome fictício para edição; anote tema e nome originais.', [
 'Observe um minuto de conexão estável; anote idade da leitura.',
 'Vá a Sistema, mude tema Claro/Escuro e edite temporariamente nome fictício; salve.',
 'Passe por Registros e Protocolo, se existir, e volte à Central; confira idade/estado do vínculo.',
 'Bloqueie por trinta segundos, desbloqueie e veja se alterações e dados permanecem.',
 'Acione botão físico uma vez após navegação para verificar operação real, não só o desenho de Conectado; confirme.'
], RESTORE + ' Reponha nome e tema originais.', 'Antes/depois da navegação, dados recentes, preferências salvas e alerta real.')
add(81, NO_BOX + ' Anote tamanho da fonte e exibição originais do Samsung.', [
 'Procure Tamanho e estilo da fonte em Configurações; aumente um nível e depois teste um nível maior, separadamente.',
 'Abra Central, Sistema e Registros; role até opções finais e verifique textos/botões cortados.',
 'No login/cadastro, abra teclado e percorra nome/e-mail/senha/confirmação sem enviar cadastro válido neste caso.',
 'Confira se é possível rolar e alcançar ENTRAR/CRIAR CONTA/Google sem teclado esconder permanentemente ação.',
 'Fotografe problemas sem mostrar senha nem dados pessoais; fonte maior não deve obrigar tocar opção errada.'
], 'Restaure fonte/tamanho de exibição e sessão anteriores.', 'Nível de fonte, tela afetada e ação que ficou inacessível.')
add(82, CONNECTED + ' PRESERVAR histórico: só limpar com autorização específica e após guardar cópia verificável.', [
 'Gere um alerta por botão e confirme; faça uma perda supervisionada e recupere/ confirme.',
 'Abra Registros e confira horários, motivos e quantidade de cada evento; salve fotos/relatório para destino próprio.',
 'Remova/reabra de Recentes e confira se os mesmos registros continuam.',
 'Sem autorização específica para apagar, teste apenas Cancelar/Manter registros na confirmação de Limpar. Marque parte destrutiva Bloqueada.',
 'Se autorizado e backup conferido, toque Limpar e confirme; reabra e verifique que registros não voltaram. Não interpretar limpeza como desarme da caixinha.'
], RESTORE + ' Não há restauração automática de histórico apagado; por isso a parte de limpeza exige autorização e backup.', 'Eventos/horários, arquivo salvo, cancelamento ou limpeza autorizada e persistência após reabrir.')
add(83, NO_BOX + ' Nunca completar chamada de emergência para este ensaio.', [
 'Abra Sistema e localize botões de números de emergência.',
 'Toque um botão; leia o diálogo e escolha Cancelar. Confira que não houve ligação nem abertura automática do discador.',
 'Repita Cancelar no outro botão disponível.',
 'A parte de conferir discador só será feita comigo e com autorização específica; não escolha Ligar em número de emergência por esta ficha.',
 'Registre a parte não executada como Bloqueada, não como aprovada.'
], 'Volte ao app sem nenhuma chamada iniciada.', 'Confirmação, cancelamento e bloqueio explícito da etapa de chamada.')
add(84, CONNECTED + ' Volume confortável, adulto e configurações originais anotadas. Não depender do protótipo para alarme real.', [
 'Faça um ciclo de botão com volumes usuais; confirme e anote comparação básica.',
 'Pelas Configurações → Sons e vibração → Volume, reduza só Mídia; provoque novo botão, observe e confirme.',
 'Restaure Mídia e reduza só Alarme; repita. Não confundir baixo volume com falha de conexão.',
 'Restaure volumes; compare separadamente modo silencioso e Não perturbe, com um ciclo por condição.',
 'Em cada ciclo, registre se som foi audível, onde saiu, visual/vibração e restrições do Android; não prometer que o app contorna o sistema.'
], RESTORE + ' Reponha volumes, modo sonoro e Não perturbe imediatamente.', OUTPUTS)
add(85, CONNECTED + ' Fone/alto-falante externo próprio disponível; volume moderado. Sem aparelho extra, Não aplicável.', [
 'Sem fone, acione botão e registre onde o som sai; confirme.',
 'Conecte fone Bluetooth ou alto-falante externo já pareado ao Samsung; não mudar hardware da caixinha.',
 'Acione botão e ouça separadamente celular, fone/alto-falante e caixinha; confirme.',
 'Desconecte a saída externa e repita; confira se som retornou sem travar ou ficar duplicado.',
 'Se alarme só chegar ao fone e ficar imperceptível para responsável, registre risco, não aprovar só porque houve reprodução.'
], RESTORE + ' Desconecte saída externa se ela não era utilizada antes.', 'Saída do áudio por condição, audibilidade, latência e recuperação.')
add(86, CONNECTED + ' Música/contato comum próprio autorizados; nunca ligar para emergência. Sem chamada disponível, só parte de música.', [
 'Reproduza música em volume moderado em outro app; mantenha o Escolta minimizado, não fechado.',
 'Pressione botão físico; registre se alarme é percebido, se música abaixa/continua e se visual/vibração funcionam.',
 'Abra o Escolta e confirme; veja como música retoma após encerramento.',
 'Se houver autorização do contato comum, faça uma chamada normal previamente combinada e repita alerta supervisionado uma vez.',
 'Finalize chamada/música e confirme estado. Sem chamada realizada, registre explicitamente a parte não testada.'
], RESTORE + ' Encerre música/chamada de ensaio e restaure volume.', 'Foco de áudio, saídas, aplicativo de música/chamada e partes não executadas.')
add(87, CONNECTED + ' Apenas endereço próprio/autorizado; recurso de e-mail experimental precisa existir.', [
 'Abra Sistema → E-mail para alertas; anote configuração original e cadastre contato próprio, se ainda não houver.',
 'Mantenha Enviar avisos por e-mail DESLIGADO. Não mudar contatos reais de outra pessoa para simplificar.',
 'Pressione botão físico e observe alerta local; confirme após verificar.',
 'Verifique sua entrada/spam por cinco minutos, anotando ausência/presença de mensagem dessa tentativa e horário.',
 'Se mensagem chegar, compare horário/motivo para não confundir com teste antigo; não aprovar envio desligado caso haja mensagem nova correspondente.'
], RESTORE + ' Restaure contato/ativação anteriores; preserve evidência do envio indevido se houver.', 'Envio desligado, evento/horário, recebimento inesperado e saídas locais.')
add(88, NO_BOX + ' Dois endereços próprios A/B; recurso experimental presente. Não criar envio para terceiro.', [
 'No cadastro do contato, tente endereço inválido como sem-arroba; salve e registre recusa.',
 'Corrija para endereço próprio A; salve e habilite envio com consentimento.',
 'Edite contato para endereço próprio B e salve; não reative envio ainda.',
 'Confira estado de Enviar avisos por e-mail depois da troca: nova ativação deve exigir escolha explícita.',
 'Não gerar emergência neste caso se não estiver disposto a receber teste; foco é validação/consentimento, não entrega.'
], 'Restaure endereço/ativação originais de forma explícita; não deixar envio inadvertidamente ligado.', 'Recusa do inválido, endereço A→B e estado/consentimento após mudança.')
add(89, NO_BOX + ' Internet, e-mail próprio/autorizado e recurso de teste. Não contém nome/localização da criança.', [
 'Em Sistema → E-mail para alertas, confira endereço completo e ativação consentida.',
 'Toque Enviar e-mail de teste; primeiro escolha Cancelar e confira que não foi enviada nova solicitação.',
 'Repita e confirme Enviar teste uma vez; marque horário e copie mensagem de aceitação/falha.',
 'Abra entrada/spam e observe até cinco minutos; anote horário real de chegada, assunto e conteúdo, sem divulgar endereço de terceiros.',
 'Se app disser aceito mas mensagem não chegar, registre entrega não comprovada; não aprovar só pela confirmação de solicitação.'
], 'Restaure opção anterior de envio; não deixar contato experimental habilitado por engano.', 'Cancelar/confirmar, aceitação versus recebimento real, tempo e conteúdo do teste.')
add(90, CONNECTED + ' E-mail próprio ativado, internet e servidor via USB se desenvolvimento. Nenhuma emergência real.', [
 'Com internet ativa, acione botão uma vez e registre horário/saídas locais; confirme presencialmente.',
 'Procure mensagem recebida na entrada/spam por cinco minutos; registre conteúdo e quantidade, diferenciando de mensagens anteriores.',
 'Volte ao estado seguro; desative Wi-Fi/dados, mantenha Bluetooth e servidor por USB se necessário.',
 'Acione outro botão, marque horário e observe quinze segundos: falha de e-mail não deve impedir alerta local. Confirme.',
 'Restaure internet e verifique se algum envio atrasado apareceu; registre horário/motivo para avaliar duplicidade, sem prometer fila offline que não existe.'
], RESTORE + ' Restaure rede e consentimento de e-mail anteriores.', 'Dois eventos identificados por horário, quatro saídas, aceitação/entrega e mensagens atrasadas.')
add(91, CONNECTED + ' Endereço próprio autorizado, recurso opcional e permissão de localização. Não publicar coordenadas.', [
 'Deixe Compartilhar localização deste celular desligado; gere um botão de ensaio e confirme.',
 'Após receber e-mail correspondente, confira ausência de coordenadas/posição; se não recebeu, marque conferência de conteúdo Bloqueada.',
 'Ative compartilhamento com consentimento e permita localização do Android; aguarde disponibilidade sem inventar posição.',
 'Gere novo botão com horário distinto e confirme; compare a nova mensagem recebida.',
 'Se houver posição, confira que corresponde ao celular e é rotulada como tal, não criança. Não fotografar coordenadas em relatório público.'
], RESTORE + ' Restaure localização/consentimento originais e descarte publicamente dados pessoais.', 'Compartilhamento desligado/ligado, presença/rotulagem de posição e permissão, sem expor coordenadas.')
add(92, 'Diagnóstico disponível e Bluetooth autorizado. Não alterar firmware para fabricar ausência de telemetria.', [
 'Com caixinha desligada com segurança, abra Sistema → Verificar prontidão e anote itens aprovados/pendentes.',
 'Ligue e conecte; logo no início, abra diagnóstico se conseguir observar conexão ainda aguardando leitura. Registre o estado realmente alcançado.',
 'Depois de dados recentes, toque Executar novamente e compare a lista.',
 'Confira campos que exigem avaliação manual, como bateria/segundo plano: não podem aparecer como comprovados só por uma consulta.',
 'Se conexão sem dados foi rápida demais para observar, marque esse subcenário Bloqueado, sem simular desconexão como equivalente.'
], RESTORE, 'Lista por cenário real: ausente, sem primeira leitura se alcançado e dados atuais.')
add(93, CONNECTED + ' Trena e recurso de Ensaio. Use apenas marcas realmente medidas, sem mover durante coleta.', [
 'Na marca de 1 m, abra Sistema → Ensaio de proximidade; selecione 1 m, altura/condição e INICIAR ENSAIO.',
 'Mantenha tela aberta e aparelhos parados: espere dez segundos de estabilização e trinta amostras; anote conclusão.',
 'Na mesma marca, faça outra coleta, espere pelo menos dez segundos mais algumas amostras e toque INTERROMPER E GUARDAR.',
 'Confira motivo incompleto e contagem real; inicie nova coleta completa, sem apagar a interrompida.',
 'Repita numa marca que naturalmente esteja em atenção/alerta com vínculo e leitura nova; se não houver tal condição, marque essa parte Bloqueada.',
 'Não aperte botão físico para fingir atenção por RSSI; marque origem do alerta. Coleta pode continuar sob alerta; para silenciar, primeiro conclua/interrompa e confirme na Central.'
], RESTORE + ' Exporte as coletas antes de qualquer limpeza.', 'ID/distância, contagem, completa/interrompida, motivo, estado e firmware em cada coleta.')
add(94, 'T093 com pelo menos uma coleta completa e uma incompleta; destino próprio disponível.', [
 'Abra Sistema → Ensaio de proximidade e toque COMPARTILHAR HISTÓRICO CSV.',
 'Salve o conteúdo/arquivo em destino próprio; cancelar o compartilhamento não comprova exportação.',
 'Abra arquivo no Excel/importador: UTF-8 e separador ponto e vírgula, se necessário; preserve a cópia original.',
 'Compare uma coleta completa com a tela: distância real, estimada, firmware, condição, horários e número de amostras.',
 'Compare também a interrompida; ela não pode virar coleta completa. Anote problemas de acento/separação ou campo perdido.'
], 'Guarde CSV original e não remova ensaios do celular neste caso.', 'Nome/destino do arquivo, casos comparados, contagens e divergências, sem dados pessoais.')
add(95, 'ASSISTIDO COMIGO. Apenas auditoria; não autoriza instalar, compilar ou substituir a oficial.', [
 'Separe identificação exata do APK/bundle oficial atual de T001 e lista de mudanças autorizadas.',
 'Peça minha comparação da candidata com a referência: Firebase, autenticação e botão Google são o escopo novo autorizado.',
 'Solicite conferência da assinatura instalada e da candidata; igualdade de nome/versão não comprova certificado igual.',
 'Registre qualquer diferença de BLE, alarme, notificações, permissões, layout fora do login ou firmware como fora do escopo.',
 'Se não for possível isolar mudanças/certificado, marque Bloqueado e NÃO instale por cima nem desinstale para contornar.'
], 'Nenhuma alteração no aparelho/instalação.', 'Referência, lista de diferenças, certificado compatível ou pendência e autorização futura.')
add(96, 'ASSISTIDO COMIGO. T004 salvo; transição Firebase pode exigir outra sessão/UID. Não copiar contas por conta própria.', [
 'Liste quais contas existem no projeto antigo e quais já têm acesso no escolta-unitau, sem registrar senhas.',
 'Defina comigo o que ficará preservado localmente e o que exige recuperação explícita; mantenha projeto antigo intacto.',
 'Combine backup, identificação da build e plano de retorno antes de qualquer futura atualização.',
 'Quando instalação tiver autorização separada, execute T021 e compare dados; se faltar acesso/backup, não prossiga.',
 'Registre o resultado real da transição, inclusive dados inacessíveis, em vez de afirmar migração automática.'
], 'Não apagar Firebase antigo, usuários, dados locais ou APK de referência.', 'Plano aprovado, backup, contas/projetos e pendências de recuperação, sem credenciais privadas.')
add(97, 'Somente futura build final autônoma previamente autorizada. Escolta de desenvolvimento que exige Metro não satisfaz este caso.', [
 'Confirme comigo que APK final contém código/configuração e foi identificado/registrado no Firebase; caso contrário, marque Bloqueado.',
 'Após instalação autorizada, desconecte USB do celular e não deixe servidor Metro disponível; não mexer na alimentação da caixinha por engano.',
 'Abra pelo ícone, confira sessão/telas e conecte à caixinha com Bluetooth; teste botão e confirmação.',
 'Reinicie o celular, mantenha sem computador, abra e repita conexão.',
 'Teste também abertura com Wi-Fi/dados desligados e sessão já válida, preservando Bluetooth; não exigir novo Google online sem internet.'
], RESTORE + ' Reconecte o computador só depois de registrar resultado autônomo.', 'Identidade do APK, independência do servidor, reabertura, sessão e evento físico.')
add(98, 'Candidata previamente autorizada/identificada; referência original preservada; nenhuma aprovação de outra build será copiada.', [
 'Filtre a ficha por prioridade Crítico e veja quais recursos realmente existem na candidata.',
 'Execute cada roteiro aplicável desta ficha e a matriz de contextos; registre versão, data e repetições por evento.',
 'Compare com evidências da referência sem inventar resultados antigos que não tenham versão/data.',
 'Se falhar um caso crítico, registre, pare aquele fluxo e solicite diagnóstico antes de alterar código.',
 'Só emitir avaliação após conferir casos aprovados, bloqueados, não aplicáveis e limitações. Bloqueado não conta como aprovado.'
], 'Preserve a candidata e evidências; não promover/reverter versões por este roteiro.', 'IDs executados, falhas, bloqueios, diferenças da referência e decisão pendente.')
add(99, 'Outro Android próprio/autorizado se disponível. Não usar celular alheio sem consentimento; mesma caixinha e versão.', [
 'Anote modelo/Android do segundo aparelho e confirme comigo se a instalação da build nele está autorizada; não instalar por conta própria.',
 'Garanta que o primeiro aparelho não monitora a placa; teste apenas um celular de cada vez.',
 'No segundo, repita identificação, permissão, conexão, botão, perda, minimizado e bloqueado seguindo os mesmos roteiros.',
 'Compare horários/saídas e registre diferenças sem assumir que o Samsung garante todos os Androids.',
 'Sem segundo aparelho, marque Não aplicável ou Bloqueado por disponibilidade e mantenha limitação de validação em um modelo.'
], 'Deixe só o aparelho principal em uso e restaure ajustes do segundo.', 'Modelo/Android, versão, IDs repetidos e diferenças/limitação explícita.')

def matrix_protocol(event, state, internet):
    """Cada combinação recebe execução própria, não apenas nome de contexto."""
    steps = [CONNECT, 'Anote estado seguro e idade da leitura; confirme que não há emergência anterior.']
    if internet.startswith('Sem'):
        steps += ['Desative Wi-Fi e Dados móveis, mantenha Bluetooth ligado; se app depende do servidor, confirme antes a ligação USB. Sem esse acesso, marque Bloqueado por infraestrutura.']
    else:
        steps += ['Mantenha internet disponível e confira rede; não altere Bluetooth nem preferências entre os ciclos.']
    if state == 'App minimizado':
        steps += ['Pressione Início do Android e aguarde trinta segundos; não remova de Recentes nem abra o Escolta durante observação das saídas.']
    elif state == 'Tela bloqueada':
        steps += ['Bloqueie pelo botão lateral e espere trinta segundos; mantenha tela apagada durante observação inicial das saídas.']
    else:
        steps += ['Deixe a Central visível, sem outra tela/diálogo por cima.']
    if event == 'Botão físico':
        steps += ['Pressione botão físico por cerca de um segundo e solte; cronometre saídas durante quinze segundos.']
    elif event == 'Perda prolongada BLE':
        steps += ['Peça ao segundo adulto desligar a caixinha apenas por chave/conector seguro; NÃO desbloqueie ou abra ajustes do celular para desligar Bluetooth, pois isso mudaria o contexto. Sem desligamento seguro, marque Bloqueado.', 'Observe saídas por até trinta segundos. O segundo adulto religa a caixinha; aguarde vínculo/dados sem mudar estado da tela. Só depois abra/desbloqueie para registrar detalhes; não invente instante visual que não observou.']
    elif event == 'Retorno após emergência':
        steps += ['Peça ao segundo adulto apertar botão físico e aguarde alerta; depois volte à posição de 1 m, sem confirmar.', 'Se quiser comparar reconexão, faça ciclo separado de perda/retorno em vez de misturar causas neste. Observe por trinta segundos se emergência ficou retida ao aproximar.']
    else:
        steps += ['Use ponto medido já identificado com sinal de atenção e vínculo contínuo, sem botão físico; permaneça até vinte segundos e anote início do amarelo e saídas.', 'Retorne à marca de 1 m e observe trinta segundos. Se perdeu vínculo ou virou perigo, registre condição diferente e não aprove atenção isolada. Sem posição reproduzível, marque Bloqueado.']
    steps += ['Somente após anotar, abra/desbloqueie e confira estado/Registros; confirme segurança presencialmente se houver emergência.', 'Restaure estado seguro e repita a combinação três vezes; anote cada repetição, não só a melhor.']
    return dict(preparation=CONNECTED + ' Cronômetro e segundo adulto; volume moderado. ' + internet + '; ' + state + '.',
                steps=steps, cleanup=RESTORE + ' Restaure rede original.', record=OUTPUTS)

assert set(PROTOCOLS) == set(range(1, 100)), 'Todos os 99 casos precisam de procedimento explícito.'
