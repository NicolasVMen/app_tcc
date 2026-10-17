"""Ficha manual enxuta baseada em telas montadas e integrações não simuláveis."""
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from protocolos_validacao import PROTOCOLS, NO_BOX, CONNECTED, CONNECT, CONFIRM, LOGOUT, RESTORE, OUTPUTS

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs' / 'testes'
OUT.mkdir(parents=True,exist_ok=True)
CASES = []

def custom(preparation, steps, cleanup=RESTORE, record=OUTPUTS):
    return dict(preparation=preparation,steps=steps,cleanup=cleanup,record=record)

def old(number):
    p=PROTOCOLS[number]
    return dict(p,steps=list(p['steps']))

def add(code,title,path,why,expected,protocol,conditional=False):
    CASES.append(dict(code=code,title=title,path=path,why=why,expected=expected,protocol=protocol,conditional=conditional))

add('M01','Sessão salva: reabrir, reiniciar e abrir sem internet','Firebase Auth → abertura do App',
 'Persistência real do SDK/Android e entrega do bundle não são reproduzidas no armazenamento simulado.',
 'Conta/perfil permanecem após reabertura e reinício. Sessão já válida permite abrir offline; falta de Metro é problema de infraestrutura distinto.',old(10))
add('M02','Sair da conta e cancelar o seletor Google','Sistema → Sair da conta / login → Continuar com Google',
 'Logout real e cancelamento do Credential Manager dependem do SDK nativo; o Google básico já foi relatado como funcionando nesta build.',
 'Logout volta ao login; cancelar Google não entra nem trava. Retorno à conta funciona apenas após escolher/autenticar. Não precisa um teste separado de Google básico.',old(6))
add('M03','Cadastro e entrada reais por e-mail/senha','Login → Primeiro acesso? Criar conta → SDK Firebase',
 'Validações de formulário já são automatizadas; aqui interessa a conta criada no serviço remoto e a sessão no app.',
 'Conta própria criada uma vez, acesso por senha e perfil corretos; falha remota tem mensagem e não pede recriar conta já criada.',old(15))
p=old(17)
p['steps'] += ['Após redefinir, tente a senha antiga uma única vez; depois a nova. Confira a conta em Sistema e não registre nenhuma senha na ficha.']
p['cleanup']='Guarde a nova senha em local privado e volte à conta principal.'
add('M04','Recebimento e uso da recuperação de senha','Login → Esqueci minha senha → e-mail de ação do Firebase',
 'Não é possível comprovar entrega/link válido usando mock HTTP ou validação local.',
 'Cancelar não envia; solicitação confirmada chega à própria caixa, link redefine senha; antiga recusada e nova aceita. Só para conta e-mail/senha.',p)
p=old(12)
p['steps'][0]='Entre na conta A; em Sistema salve nomes fictícios distintos para responsável e criança, e tema Claro. Confira o nome da criança na Central quando for mostrado.'
p['steps'][3]='Em B, salve outros nomes fictícios para responsável/criança e tema Escuro; confira que não recebeu contato ou histórico de A. Fotografe e saia.'
add('M05','Perfil e preferências ligados à conta correta','Sistema → Perfil → accountStorage → Central e onAuthStateChanged',
 'Isolamento das chaves está testado; associação da sessão real às telas/assinantes precisa desta única passagem de integração.',
 'A/B não misturam perfil, nome da criança, contato, registros ou preferências; ao voltar, cada conta recupera seus próprios dados.',p)
add('M06','Bluetooth negado e depois permitido — regressão da falha','Android → Dispositivos próximos → blePermissions → Sentinela',
 'O código de recusa está testado, mas houve crash real ao iniciar o serviço: a integração Android deve ser confirmada.',
 'Reabre sem ciclo de fechamento, mostra limitação e não repete diálogos; permitir pelas configurações recupera conexão e dados sem apagar sessão.',custom(NO_BOX,[
 'No Samsung → Configurações → Aplicativos → Escolta exato → Permissões → Dispositivos próximos, selecione Não permitir; não limpe dados.',
 'Abra o app; se pedir Bluetooth novamente, negue. Navegue Central/Sistema e aguarde trinta segundos.',
 'Registre erro e quantidade de pedidos. Encerramento do processo pelo Android ao revogar permissão é diferente de crash ao reabrir.',
 'Volte à mesma permissão e selecione Permitir; reabra se necessário e ligue a caixinha com segurança.',CONNECT,
 'Observe trinta segundos com leitura recente e confira a conta. Não precisa repetir o mesmo caso de validação no código.'
]))
add('M07','Notificação de diagnóstico, recusa e recuperação','Sistema → Verificar prontidão → Testar notificação → Android',
 'Configuração de canal está automatizada; exibição real, permissão e retorno do Android não estão.',
 'Negada: aviso claro sem crash. Permitida: mensagem de TESTE na central de notificações, sem emergência falsa; app reabre e responde.',custom(NO_BOX,[
 'Anote configuração original; no Android → Aplicativos → Escolta → Notificações, desligue Permitir notificações.',
 'No app → Sistema → Verificar prontidão → Testar notificação; negue eventual pedido e registre a orientação.',
 'Permita notificações nas configurações do Android, volte e repita Testar notificação.',
 'Puxe a central do Android, confira o aviso de teste e navegue de volta ao app; observe por quinze segundos.',
 'Remova/reabra de Recentes uma vez. Não testar apresentação do aviso criando uma emergência artificial.'
]))
add('M08','Botão real Testar sirene: cancelamento e som/vibração','Sistema → Verificar prontidão → Testar sirene → Audio/Vibration',
 'É função existente: o teste usa áudio local por 2,5 s. Mock não prova audibilidade nem atuação do motor de vibração.',
 'Cancelar não toca. Iniciar toca e vibra conforme preferência por aproximadamente 2,5 s e para sozinho; não cria emergência/e-mail.',custom(NO_BOX+' Conta conectada, som pronto e volume moderado.',[
 'Em Sistema, anote a preferência Vibração e deixe ligada para o primeiro subteste.',
 'Abra Verificar prontidão → Testar sirene; na confirmação própria, toque Cancelar e veja que não houve som.',
 'Repita e toque Iniciar teste; cronometre som/vibração e observe o encerramento automático.',
 'Volte a Sistema, desligue só Vibração e repita Iniciar teste; som deve continuar sem vibração.',
 'Compare estado/Registros antes/depois: teste não é pânico real. Se houver alerta real ativo, encerre com segurança antes; o botão de teste deve recusar esse estado.'
]))
add('M09','Encontrar a caixinha e receber dados atuais','Central → PROCURAR AGORA / automático → bleApi → status Notify',
 'UUID/parser/timeouts foram conferidos; rádio, firmware instalado e Notify real precisam de integração.',
 'Sem placa: busca/mensagem clara, sem metros antigos como atuais. Placa próxima: conecta ao Escolta e atualiza; conexão inicial não dispara alerta falso.',custom(NO_BOX+' Bluetooth permitido; meio seguro para ligar a caixinha.',[
 'Abra Central com a caixinha realmente desligada; anote se a conexão automática está ativa e observe até trinta segundos.',
 'Confira mensagem, ausência de dados atuais e resposta da navegação; busca automática pode repetir, registre esse fato.',
 'Ligue a caixinha fechada a cerca de 1 m; não basta tirar USB se bateria ainda alimenta.',CONNECT,
 'Observe por um minuto: vínculo, idade da leitura, RSSI, bateria e estado. A palavra Conectado sozinha não prova recebimento.',
 'Sem desligamento seguro, não improvisar: registre parte inicial bloqueada e execute apenas conexão próxima.'
]))
add('M10','Conexão automática versus PROCURAR AGORA','Sistema → Conexão automática → efeito do monitor → BLE',
 'A decisão lógica está testada; o acionamento da preferência na UI e reconexão do rádio ainda não.',
 'Com automático desligado, não reconecta por conta própria; botão manual recupera. A opção não desativa alarmes de perda.',old(38))
add('M11','Botão físico com app visível e confirmação da placa','Chave física → JSON panico → hook/Sentinela → CHAR_RESET_UUID',
 'Nenhum teste local prova contatos/soldas, recebimento físico, som ou resposta de reset da placa gravada.',
 'Evento físico dispara no dispositivo e celular; confirmação válida para as saídas e permanece encerrada. Não há sons duplicados ou novo alerta atrasado.',old(47))
add('M12','Mesmo botão físico minimizado e com tela bloqueada','Botão → BLE → serviço Android em segundo plano',
 'É comportamento distinto e crítico: Android pode suspender JS ou áudio mesmo com lógica correta.',
 'Alerta chega nos dois contextos; ao abrir continua ativo e pode ser confirmado. Registrar cada saída, não aprovar tudo só porque a caixa apitou.',old(48))
add('M13','Perda real do vínculo e reconexão nos três contextos','BLE disconnect → tolerância → serviço nativo/fallback → reconexão',
 'O temporizador de cinco segundos está automatizado; detecção do sistema e execução nativa com tela apagada não.',
 'Mostra interrupção e alerta após tolerância detectada; retorno de dados não apaga emergência sem confirmação. Não exibe metros congelados como leitura atual.',custom(CONNECTED+' Segundo adulto e chave/conector removível seguro da caixinha; não puxar soldas.',[
 'Comece visível, com leitura recente. Grave/cronometre interrupção física, detecção mostrada e início de cada saída.',
 'O outro adulto desliga a caixinha com segurança. Observe até trinta segundos; registre detecção e tolerância separadamente.',
 'Religue e aguarde dados; antes de confirmar, veja se a emergência permanece. Só então confirme presencialmente e restaure.',
 'Repita em ciclo separado após Início do Android (minimizado), esperando trinta segundos antes da perda.',
 'Restaure e repita com tela bloqueada. NÃO desbloqueie para desligar Bluetooth: isso mudaria o contexto; a caixinha é desligada pelo outro adulto.',
 'Nas primeiras execuções, um ciclo por contexto identifica falhas; se todos passarem, faça duas repetições adicionais por contexto. Não repetir um cenário já falho antes de análise.',
 'Sem modo seguro de desligar, marque os contextos bloqueados para ensaio assistido. Nunca inventar instante de detecção visual não observado na tela apagada.'
]))
add('M14','Confirmar segurança sem vínculo, sem prometer proteção','Central → CONFIRMAR SEGURANÇA → estado SEM COBERTURA',
 'Regra lógica está testada; comunicação visual e saídas reais durante falha do rádio precisam ser verificadas.',
 'Pode encerrar saídas do celular após verificação presencial, mas permanece sem vínculo; não afirma reset remoto da caixinha desconectada.',old(53))
add('M15','Preferências de notificação e vibração durante emergência','Sistema → Alertas de emergência / Vibração → hook e serviço Android',
 'Mocks comprovam intenção; canais persistidos e vibração/audio efetivos são do aparelho.',
 'Desligar aviso visual não silencia sirene crítica. Desligar vibração remove vibração, sem remover som crítico; cada opção é testada separadamente.',old(55))
add('M16','Pausa confirmada e retomada explícita','Sistema → Colocar Sentinela em espera / Retomar proteção → CHAR_CONTROLE_UUID',
 'Comandos e predicados correspondem no código; precisamos conferir aceitação/desarme real e tela após resposta.',
 'Cancelar conserva proteção; pausa confirmada desarma sem emergência falsa. Espera persiste ao reabrir; retomada só fica pronta com resposta/dados da placa.',custom(CONNECTED,[
 'Abra Sistema → Colocar Sentinela em espera; escolha Manter proteção e confira dados por quinze segundos.',
 'Repita e escolha Colocar em espera; observe confirmação e estado por trinta segundos. Falha não é pausa aprovada.',
 'Remova/reabra de Recentes; veja se continua EM ESPERA, sem busca indesejada.',
 'Na Central, toque RETOMAR PROTEÇÃO e confirme Retomar proteção; aguarde vínculo e leitura recente.',
 'Com retorno válido, pressione botão uma vez para comprovar proteção retomada, não só desenho verde; confirme presencialmente.'
]))
add('M17','Sair da conta enquanto a placa está protegendo','Sistema → Sair e encerrar → pausar placa → Firebase signOut',
 'Coordenação física de desarme e logout não é comprovada por teste isolado de signOut/storage.',
 'Placa confirma desarme antes de saída; não sobra buzzer/sirene/serviço. Se falhar, orienta e não afirma sucesso remoto.',old(70))
add('M18','Falso amarelo ao lado e frescor da leitura','RSSI físico → firmware → Central',
 'Filtro matemático foi verificado; corpo, caixa, antena e ambiente não podem ser aprovados em simulador.',
 'Na posição próxima documentada, não há alerta sustentado injustificado; idade da leitura não cresce como se fosse atual. Anotar cada falso aviso.',old(39))
add('M19','Estimativa e transição de estados em poucos pontos medidos','Sistema → Ensaio de proximidade → RSSI/estado/estimativa da placa',
 'Não repetir cálculo da fórmula: interesse é leitura real da montagem e comportamento no ambiente do usuário.',
 'Leituras continuam novas ao afastar/retornar; registrar metros reais versus estimados e transições. RSSI não promete metragem exata.',custom(CONNECTED+' Trena e apoios não metálicos; servidor por rede conferido comigo se o cabo limita movimento.',[
 'Fixe a caixinha e marque apenas 1, 3, 5 e 7 m possíveis, medidos centro a centro; mesma altura e orientação. Não precisa repetir todo percurso até 15 m agora.',
 'Em cada ponto imóvel, abra Sistema → Ensaio de proximidade, selecione distância real, altura/condição e INICIAR ENSAIO.',
 'Aguarde dez segundos de estabilização e trinta leituras novas, cerca de mais trinta segundos; não minimizar durante coleta.',
 'Guarde cada coleta e passe ao próximo ponto. Observe início do amarelo/vermelho e se vínculo foi perdido; não chamar perda de enlace de limiar RSSI.',
 'Faça o retorno até 1 m, observando estado; amarelo pode recuperar, emergência retida precisa confirmação presencial.',
 'Se os pontos não reproduzirem atenção/perigo, registre condição não alcançada, não force o botão para fingir RSSI fraco. Não reestimar coeficientes manualmente.',
 'Coletas atuais já concluídas em versão/firmware/condição correspondentes podem ser reutilizadas; não coletar novamente só para preencher a ficha.'
]))
add('M20','Telemetria de energia e acesso USB-C','Firmware bateria/USB/carga → cabeçalho e Central',
 'Parser não comprova ADC, carregador, alimentação e encaixe real do cabo.',
 'Bateria sustenta uso ao retirar USB; inserir/retirar não trava. Indicadores seguem leituras recentes e não confundem corrente real medida com carga estimada.',old(72))
add('M21','Uma passagem de interface, perfil e preferências','Abas montadas + Sistema → Perfil/Tema/Reduzir animações/Restaurar preferências',
 'Não pedir testes para texto estático; falta confirmar renderização dos ícones, teclado e botões no aparelho.',
 'Abas/ícones legíveis, nomes refletidos, temas e opção visual funcionam; restaurar afeta preferências, não apaga conta/perfil/histórico.',custom(NO_BOX+' Anote nomes/tema e preferências originais; use dados fictícios.',[
 'Abra Central, Protocolo, Registros e Sistema uma vez; confira ícones/textos e botões, sem testar texto estático como função nova.',
 'Em Perfil, edite nomes fictícios de responsável/criança e salve; confira nome na Central e iniciais no cabeçalho quando exibidos.',
 'Troque tema Claro/Escuro/Sistema e ative Reduzir animações; alterne abas. Observe contraste/movimento, sem medir duração exata manualmente.',
 'Na tela de login do M02, confira o G do Google e se teclado permite alcançar campos/ações; não refazer validações de senha/e-mail já automatizadas.',
 'Em Restaurar preferências, teste Cancelar. Só se puder repor as opções anotadas, confirme Restaurar; veja se perfil e registros não foram apagados.',
 'Se não quiser alterar preferências originais, deixe restauração pendente em vez de declarar que foi executada. Reponha nomes/opções no fim.'
]))
add('M22','Registros e compartilhamento real do relatório','Registros → ícone compartilhar → prévia → Share do Android',
 'Geração/armazenamento lógico não prova folha de compartilhamento nem arquivo/conteúdo recebido.',
 'Eventos dos testes aparecem com motivo/horário; cancelar prévia não envia; compartilhar entrega conteúdo legível ao destino próprio. Não apagar histórico.',custom(NO_BOX+' Use ocorrências já geradas por M11/M13; não criar novos alertas só para exportar.',[
 'Abra Registros e compare pelo menos botão e perda com os horários anotados; anote duplicações.',
 'Toque ícone de compartilhar no cabeçalho; leia a prévia e escolha Cancelar uma vez.',
 'Abra novamente, escolha Compartilhar e salve em destino próprio pelo Android; não basta abrir a folha para aprovar entrega.',
 'Abra o conteúdo salvo e compare motivo, data, nomes fictícios e quantidade. Não toque lixeira nem limpe histórico para este teste.',
 'Feche/reabra e confira manutenção dos registros; não repetir testes de serialização ou estatística na mão.'
],record='Nome/destino do conteúdo, horários comparados, legibilidade e divergências; sem informações pessoais.'))
add('M23','Diagnóstico ligado ao estado real e retorno dos ajustes','Sistema → Verificar prontidão → Executar novamente / Compartilhar relatório técnico / Revisar bateria',
 'São três ações existentes de consulta/Share/Linking. Não há motivo para testar menus imaginados ou antigos.',
 'Consulta distingue sem placa de dados recentes; relatório salvo corresponde ao estado; ajustes Android abrem e retorno não derruba app. Aviso informativo não é certificação.',custom(NO_BOX,[
 'Abra Verificar prontidão sem placa; anote conexão/permissões. Ligue/conecte e toque Executar novamente após leitura recente; compare.',
 'Toque Compartilhar relatório técnico e salve em destino próprio; confira estado/firmware/hora do documento.',
 'Toque Revisar bateria e segundo plano e escolha Agora não; depois repita e escolha Abrir ajustes.',
 'Confira que abriu tela de ajustes Android; NÃO mudar otimização neste caso. Volte pelo Android e observe aplicativo por trinta segundos.',
 'Não exigir que diagnóstico aprove bateria/segundo plano sem ensaio físico. Não tentar fabricar JSON faltante: essa rejeição já foi automatizada.'
]))
add('M24','Ensaio ao vivo: interrupção e CSV realmente exportado','Sistema → Ensaio de proximidade → AppState / Notify / Share',
 'Contagem, frescor e CSV estão testados; início/saída de tela, amostras reais e compartilhar ainda dependem do app/placa.',
 'Conclui trinta novas leituras; sair do primeiro plano ou interromper guarda incompleto; CSV real preserva distância/estado/contagem. Sem recalcular média manualmente.',custom(CONNECTED+' Coleta completa de M19 pode ser reutilizada; trena e destino próprio para arquivo.',[
 'Use a coleta completa de M19, se existir. Caso contrário, em 1 m real, inicie e espere estabilização/trinta leituras sem sair da tela.',
 'Inicie outra coleta na mesma marca; após estabilizar e contar algumas amostras, pressione Início por cinco segundos e volte.',
 'Confira que ficou incompleta por sair do primeiro plano; a interrupção não é erro de distanciamento.',
 'Inicie outra breve coleta e use INTERROMPER E GUARDAR para verificar botão. Isso não testa novamente estatística interna.',
 'Toque COMPARTILHAR HISTÓRICO CSV, salve em destino próprio e abra o conteúdo; compare uma completa e uma incompleta.',
 'Se em M19 existir coleta com alerta ativo e vínculo válido, reutilize. Só ensaiar esse estado ao vivo novamente se faltou evidência; não repetir a regra interna de trinta amostras em toda distância.'
],record='IDs/contagens/motivos reais e nome do CSV; etapa de compartilhamento concluída ou cancelada.'))

add('E01','Entrega do e-mail de teste — somente se usar o canal','Sistema → E-mail para alertas → Enviar e-mail de teste → EmailJS',
 'Resposta HTTP simulada não confirma serviço/template nem entrega. O botão de teste só precisa endereço válido; não exige ativar alertas automáticos.',
 'Cancelar não envia. Confirmar recebe mensagem TESTE no contato próprio; aceitação e recebimento são registrados separadamente.',custom(NO_BOX+' Endereço próprio/autorizado e internet; Enviar avisos por e-mail pode permanecer desligado.',[
 'Cadastre/confira próprio endereço em Sistema → E-mail para alertas, sem dados de terceiros.',
 'Toque Enviar e-mail de teste; escolha Cancelar e anote. Repita e confirme Enviar teste uma vez.',
 'Anote horário e mensagem de aceitação/falha; abra entrada/spam e observe até cinco minutos.',
 'Compare conteúdo recebido: teste não tem posição/nome real de criança. Sem chegada, não declarar entrega só porque HTTP foi aceito.'
],record='Aceitação, recebido/não recebido, horário, assunto e conteúdo sem dados pessoais.'),True)
add('E02','Aviso de emergência por e-mail e consentimento','Perfil/consentimento → hook de emergência → EmailJS',
 'Payload e bloqueio local estão automatizados; destino real, template e não bloquear som durante falha externa não estão.',
 'Envio desligado não tenta aviso automático; ligado envia para contato escolhido. Falha de internet não impede alerta local; não misturar teste de e-mail com mudança de notificação.',custom(CONNECTED+' Endereços próprios A/B, consentimento, internet e servidor via USB se desenvolvimento.',[
 'Com Enviar avisos por e-mail desligado, use um evento já planejado do M11 e anote ausência de aviso correspondente; não gerar evento adicional se já documentado.',
 'Ative Enviar avisos por e-mail com consentimento e provoque um botão com horário distinto; confirme e confira mensagem recebida/saídas locais.',
 'Troque temporariamente contato para próprio endereço B; confira que envio automático voltou a desligado e exige nova ativação. Não usar e-mail de terceiro.',
 'Restaure contato autorizado, ative e, com Wi-Fi/dados desligados mas Bluetooth/servidor acessíveis, provoque um evento; confira som local e aviso externo não confirmado.',
 'Recupere rede/configuração. Se E01 já falhou, a parte de entrega é Bloqueada: não desperdiçar vários disparos procurando o mesmo erro do serviço.'
]),True)
add('E03','Localização do celular na mensagem — permissão no momento certo','Sistema → Compartilhar localização → emergência com e-mail ativo → expo-location',
 'No código real, ligar a opção só salva preferência. A autorização é solicitada apenas durante emergência com contato/envio ativo.',
 'Desligada: mensagem sem coordenadas. Ligada e negada/indisponível: texto claro sem travar sirene. Permitida: posição identificada como celular, não criança.',custom(CONNECTED+' E01 entrega confirmada; contato próprio, envio consentido ativo e sem criança real.',[
 'Com compartilhamento desligado, use um evento do E02 e confira ausência de coordenadas na mensagem correspondente.',
 'Anote permissão original; retire só Localização do Android. Em Sistema, ligue Compartilhar localização deste celular: NÃO espere um pedido neste clique.',
 'Provoque alerta por botão com e-mail ativo. Se pedido de localização aparecer nesse momento, negue; observe saídas locais e texto recebido.',
 'Restaure permissão/forneça autorização e realize outro evento com horário distinto; confirme e examine mensagem recebida, sem publicar coordenadas.',
 'Se não houver leitura/entrega real, marque essa parte Bloqueada. Não chamar o link da posição do celular de GPS da criança. Restaure opções ao final.'
]),True)

assert len(CASES)==27 and sum(not c['conditional'] for c in CASES)==24
NOTES=[
 'USE ESTA FICHA ENXUTA no próximo passe. Substitui os 99 casos anteriores; arquivos/anotações antigos foram preservados. Resultados começam vazios e não significam aprovação.',
 '24 roteiros de integração + 3 de e-mail/localização somente se usar esses recursos. Não repetir login Google básico já confirmado na mesma build. Logout/reentrada e novo pacote/certificado são situações diferentes.',
 'A fonte atual monta Central, Protocolo, Registros, Sistema, diagnóstico e Ensaio de proximidade. Se um desses controles não existir no APK executado, pare e informe nome/versão/print: não invente função nem instale outra versão só para preencher.',
 'Eu executei 85 testes automatizados e 33 verificações C++: regras locais, fórmulas, UUIDs, parser, contagem/CSV e controle de callbacks saíram da lista humana. Isso não prova integração real com rádio, SDKs, armazenamento do Android, som ou serviços externos.',
 'Cada roteiro explica POR QUE ainda é manual e QUAL caminho tela→serviço/placa verifica. Siga preparação e passos, registre esperado versus observado e restaure antes do próximo.',
 'Preparação única: anotar app/versão/bundle, firmware, Android, alimentação e preferências. Testar um app por vez, adultos sem criança, volume moderado. Não reinstalar, limpar dados, alterar firmware ou fazer chamada de emergência.',
 'Se desenvolvimento depende de Metro, desligar internet pode cortar o servidor: combine USB para offline e servidor por rede para percursos limitados pelo cabo. Falha dessa infraestrutura torna o subteste bloqueado, não falha BLE/Firebase.',
 'Só desligar caixinha por chave/conector removível seguro; não tocar em soldas. Sem meio seguro, marcar perda por energia bloqueada. Para tela bloqueada, outro adulto desliga a placa: desbloquear para desligar Bluetooth mudaria o contexto.',
 'Primeira rodada: um ciclo por contexto identifica falhas. Se todos passarem, confirmar botão/perda com mais duas repetições, sem nova ficha duplicada. Aproveitar eventos/CSV já produzidos para histórico, e-mail e ensaio.',
 'Localização: a opção não pede permissão ao ligar; solicitação só ocorre numa emergência quando envio por e-mail e contato válido estão ativos. E-mail de teste funciona sem ativar alertas automáticos.',
 'Termos de observação 15/30 s não prometem latência universal. Registrar detecção da perda separada do atraso do alarme. Sem condições atingidas, marcar Bloqueado/Parcial. Nunca copiar aprovação de outra versão.',
 'Certificado/cadastro da oficial, migração, assinatura, compilação final, proteção sem servidor e atualização ficam no relatório técnico para minha conferência; não são tarefas para você executar no celular agora.',
 'Nenhum teste real foi aprovado automaticamente. Excluir autonomia, DND/fone/segundo modelo neste passe não comprova essas condições: elas serão ensaios adicionais somente quando necessárias ao uso/relato acadêmico.',
]
headers=['ID','Funcionalidade real','Caminho no app','Por que precisa de celular/placa','Passo a passo','Esperado','Resultado','O que aconteceu','Tempos / saídas / repetição','Data / versão','Evidência']
wb=Workbook(); intro=wb.active; intro.title='Leia primeiro'
intro.append(['ESCOLTA — VALIDAÇÃO ESSENCIAL — 13/10/2026'])
for label in ['App/versão/bundle','Android/modelo','Firmware/energia','Responsável/data']:
    intro.append([label,''])
for note in NOTES:intro.append([note])
intro.column_dimensions['A'].width=110;intro.column_dimensions['B'].width=35
for row in intro:
    intro.row_dimensions[row[0].row].height=75
    for cell in row:cell.alignment=Alignment(wrap_text=True,vertical='top')
intro['A1'].font=Font(size=16,bold=True,color='102A43')
ws=wb.create_sheet('Testes — preencher');ws.append(headers)
details=wb.create_sheet('Passo a passo')
for col in 'ABCDEFGH':details.column_dimensions[col].width=13
def line(text,height=65,heading=False):
    r=details.max_row+1 if details.cell(1,1).value else 1
    details.merge_cells(start_row=r,start_column=1,end_row=r,end_column=8)
    cell=details.cell(r,1,text);cell.alignment=Alignment(wrap_text=True,vertical='top')
    cell.font=Font(size=11,bold=heading,color='FFFFFF' if heading else '102A43')
    cell.fill=PatternFill('solid',fgColor='102A43' if heading else 'FFFFFF')
    details.row_dimensions[r].height=height
    return r
line('ROTEIRO MANUAL — clique no ID da tabela; preencha somente campos amarelos',40,True)
for r,c in enumerate(CASES,2):
    p=c['protocol'];steps='\n'.join(f'{i}. {v}' for i,v in enumerate(p['steps'],1))
    procedure=f"PREPARAÇÃO: {p['preparation']}\n\n{steps}\n\nAO TERMINAR: {p['cleanup']}\nANOTAR: {p['record']}"
    title=c['title']+(' [SÓ SE USAR]' if c['conditional'] else '')
    ws.append([c['code'],title,c['path'],c['why'],procedure,c['expected'],None,None,None,None,None])
    start=line(f"{c['code']} • {title}",40,True)
    ws.cell(r,1).hyperlink=f"#'Passo a passo'!A{start}"
    line('Caminho real: '+c['path'],55)
    line('Por que precisa de ensaio: '+c['why'],75)
    line('Preparação: '+p['preparation'],100)
    for i,step in enumerate(p['steps'],1):line(f'{i}. {step}',70)
    line('ESPERADO: '+c['expected'],85)
    response=line('REGISTRAR O QUE ACONTECEU — voltar à tabela de resultados',40,True)
    details.cell(response,1).hyperlink=f"#'Testes — preencher'!G{r}"
    line('Anotar: '+p['record'],70);line('Ao terminar: '+p['cleanup'],85);line('',20)
for col,width in zip('ABCDEFGHIJK',[9,42,55,55,90,65,20,65,40,28,40]):ws.column_dimensions[col].width=width
for row in ws:
    ws.row_dimensions[row[0].row].height=400 if row[0].row>1 else 36
    for cell in row:
        cell.alignment=Alignment(wrap_text=True,vertical='top')
        if cell.row==1:
            cell.font=Font(bold=True,color='FFFFFF');cell.fill=PatternFill('solid',fgColor='102A43')
        elif cell.column>=7:cell.fill=PatternFill('solid',fgColor='FFF7D6')
ws.freeze_panes='E2';ws.auto_filter.ref=ws.dimensions
validation=DataValidation(type='list',formula1='"Aprovado,Falhou,Parcial,Bloqueado,Não aplicável,Não testado"',allow_blank=True)
ws.add_data_validation(validation);validation.add('G2:G28')
intro.append(['Clique no ID para o cartão vertical Passo a passo e use o link do cartão para voltar aos campos amarelos. A célula longa da tabela pode ficar cortada pelo limite de altura do Excel.'])
intro.cell(intro.max_row,1).alignment=Alignment(wrap_text=True,vertical='top');intro.row_dimensions[intro.max_row].height=65
technical=wb.create_sheet('Já conferido por código')
technical.append(['Conferência local','Resultado/limite'])
for name,limit in [
 ('TypeScript','Aprovado; não é prova física.'),
 ('85 testes do aplicativo','Aprovados; SDKs/radio/storage são simulados quando exigem hardware.'),
 ('33 verificações C++','Aprovadas; cálculo/temporização dos headers reais, sem gravar placa.'),
 ('UUIDs/nome/comandos/JSON','Correspondem no frontend/firmware salvo e exemplos; firmware gravado ainda precisa ser identificado.'),
 ('Backend','Firebase Auth + EmailJS; perfis/histórico locais; proteção por BLE, não servidor REST próprio.'),
 ('Fora de rota','PatrolScreen/Modo Laboratório não é montado. Não pedir teste desse arquivo antigo.'),
 ('Fora da UI','Som por comando, modo casa e opções legadas sem controle visível não são funções a apertar.'),
 ('Oficial final','Pacote/certificado e transição são pendências técnicas; não foram instalados ou aprovados aqui.'),
]:technical.append([name,limit])
technical.column_dimensions['A'].width=36;technical.column_dimensions['B'].width=100
for row in technical:
    technical.row_dimensions[row[0].row].height=55
    for cell in row:cell.alignment=Alignment(wrap_text=True,vertical='top')
xlsx=OUT/'Ficha_Testes_Escolta_ESSENCIAL.xlsx';wb.save(xlsx)

doc=Document();sec=doc.sections[0]
sec.top_margin=sec.bottom_margin=Inches(.65);sec.left_margin=sec.right_margin=Inches(.7)
doc.styles['Normal'].font.name='Calibri';doc.styles['Normal'].font.size=Pt(10)
doc.styles['Normal'].paragraph_format.space_after=Pt(5)
doc.styles['Heading 2'].font.size=Pt(11)
doc.add_heading('Escolta — testes essenciais',0)
doc.add_paragraph('13/10/2026 • 24 roteiros de integração + 3 condicionais de e-mail/localização')
for label in ['App/versão/bundle','Android/modelo','Firmware/alimentação','Data/responsável']:
    doc.add_paragraph(label+': __________________________________________________')
doc.add_heading('Leia antes de testar',1)
for note in NOTES:doc.add_paragraph(note,style='List Bullet')
doc.add_paragraph('Resultado: Aprovado / Falhou / Parcial / Bloqueado / Não aplicável / Não testado.\nSe a função não existe na versão aberta, informar a diferença e parar aquele roteiro.')
for c in CASES:
    p=c['protocol'];doc.add_heading(c['code']+' — '+c['title'],2)
    if c['conditional']:doc.add_paragraph('CONDICIONAL: executar somente se usar esse canal; sem entrega E01, as conferências de conteúdo E02/E03 ficam bloqueadas.')
    doc.add_paragraph('Caminho real: '+c['path'])
    doc.add_paragraph('Por que ainda é manual: '+c['why'])
    pp=doc.add_paragraph('Preparação: '+p['preparation']);pp.paragraph_format.keep_with_next=True
    pp=doc.add_paragraph('Passo a passo');pp.runs[0].bold=True;pp.paragraph_format.keep_with_next=True
    for i,step in enumerate(p['steps'],1):doc.add_paragraph(f'{i}. {step}')
    pp=doc.add_paragraph('Esperado: '+c['expected']);pp.paragraph_format.keep_with_next=True
    doc.add_paragraph('Resultado: __________________  Data/versão: __________________\nO que aconteceu: __________________________________________________________\n_________________________________________________________________________\n_________________________________________________________________________\nTempos/saídas/repetições: __________________________________________________')
    doc.add_paragraph('Anotar: '+p['record']);doc.add_paragraph('Ao terminar: '+p['cleanup']);doc.add_paragraph('')
doc.add_heading('Não são tarefas manuais neste passe',1)
doc.add_paragraph('Regras de entrada, fórmula, histerese numérica, contagem/estatística/CSV, payload inválido, callbacks antigos e seleção de projeto: testes locais executados por mim. Som, rádio, caixa, Android e serviços remotos: somente ensaio real. Código antigo sem rota ou botão não entra como funcionalidade.')
doc.add_paragraph('Relatório de estrutura e cobertura: docs/auditoria/MAPEAMENTO_FUNCIONAL_E_TESTES_ESSENCIAIS_2026-10-13.md. Nenhuma aprovação total do aplicativo é inferida dessa redução.')
docx=OUT/'Ficha_Testes_Escolta_ESSENCIAL.docx';doc.save(docx)
check=load_workbook(xlsx);assert check['Testes — preencher'].max_row==28
assert all(check['Testes — preencher'].cell(r,col).value is None for r in range(2,29) for col in range(7,12))
text='\n'.join(p.text for p in Document(docx).paragraphs)
assert all(c['code']+' — ' in text for c in CASES)
assert 'Testar sirene' in text and 'não pede permissão' in text
assert all('T0' not in step for c in CASES for step in c['protocol']['steps']), 'Não deixar referência a ID da ficha antiga.'
print('24 roteiros de integração + 3 condicionais; arquivos reabertos, campos vazios e IDs/ações conferidos.')
print(xlsx);print(docx)
