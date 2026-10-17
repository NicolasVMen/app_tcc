"""Ficha manual editável: não executa testes, não modifica o aplicativo."""
from pathlib import Path
from collections import Counter
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule
from protocolos_validacao import PROTOCOLS, matrix_protocol

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs' / 'testes'
OUT.mkdir(parents=True, exist_ok=True)
cases = []

def group(name, phase, rows):
    for priority, action, expected in rows:
        cases.append((name, phase, priority, action, expected))

BASE = 'Oficial atual; repetir na candidata somente para comparar'
AUTH = 'Candidata com Firebase novo; login Google já relatado OK no teste'
OPTIONAL = 'Versão que já ofereça o recurso; N/A se não existir'

group('01 — Identificação e referência', BASE, [
 ('Crítico', 'Anotar nome do aplicativo, versão, origem/data do APK, versão do Android, firmware exibido e configuração de alarmes. Fotografar a tela de diagnóstico.', 'A versão ensaiada fica identificada. Sem identificação da build/bundle, o ensaio não aprova uma atualização.'),
 ('Alto', 'Anotar o que já funciona na oficial, antes de instalar, limpar dados ou mudar configurações. Usar uma única versão por vez.', 'Base de comparação registrada; nenhum arquivo ou dado antigo é apagado.'),
 ('Alto', 'Abrir e fechar normalmente três vezes, alternando abas sem conectar a caixinha.', 'Sem fechamento inesperado, tela branca persistente ou perda de sessão.'),
 ('Normal', 'Revisar perfis, preferências e registros existentes; anotar quais devem ser preservados.', 'Dados de referência documentados antes da mudança de Firebase.'),
])
group('02 — Firebase, Google e contas', AUTH, [
 ('Crítico', 'Conferir projeto escolta-unitau, pacote oficial com.nicolasvmen.escoltaunitau e SHA do certificado da build que será instalada. Não confundir com o pacote .teste.', 'Cadastro Android do pacote/certificado correspondente confirmado. Login OK no teste não aprova automaticamente o pacote oficial.'),
 ('Alto', 'Sair e abrir Continuar com Google; cancelar sem escolher conta.', 'Permanece no login, sem conta criada por cancelamento, sem erro fatal; botão volta a responder.'),
 ('Crítico', 'Entrar com a conta Google usada no teste; verificar nome/e-mail e o usuário no Firebase do projeto correto.', 'Acesso somente após autenticação válida; conta correta, sem senha/token expostos em mensagens.'),
 ('Alto', 'Tocar várias vezes no botão Google enquanto o seletor está abrindo.', 'Um único fluxo de login, sem seletores ou acessos duplicados.'),
 ('Alto', 'Desligar internet, tentar Google; restaurar internet e tentar novamente.', 'Falha compreensível sem acesso inventado; nova tentativa funciona, sem botão preso carregando.'),
 ('Crítico', 'Fechar/reabrir e reiniciar o celular após login; testar também abertura sem internet com sessão já salva.', 'Sessão válida persiste. Sem internet, monitoramento BLE não depende de login online a cada abertura; restrições são claras.'),
 ('Crítico', 'Sair da conta com a caixinha desligada; reabrir e entrar novamente.', 'Volta ao login, sem acesso ao perfil anterior após logout; novo login funciona.'),
 ('Crítico', 'Usar duas contas próprias A/B com nomes fictícios e preferências distintas. Alternar A → B → A.', 'Perfis, históricos, contatos, ensaios e preferências não se misturam; A recupera somente seus dados.'),
 ('Alto', 'Editar o nome do perfil; sair/entrar por Google novamente.', 'Login não sobrescreve automaticamente um nome já editado no aplicativo.'),
 ('Alto', 'Cadastro por e-mail: testar nome vazio, e-mail inválido, senha curta e confirmação diferente.', 'Não cria conta inválida; apresenta orientação e libera correção dos campos.'),
 ('Alto', 'Cadastrar um e-mail próprio novo com dados válidos; sair e entrar por e-mail/senha.', 'Conta criada uma vez e acesso válido no projeto correto; perfil pode ser completado.'),
 ('Alto', 'Tentar cadastrar novamente o mesmo e-mail; tentar login com senha incorreta.', 'Não duplica a conta nem permite acesso; erro legível sem travar.'),
 ('Alto', 'Solicitar recuperação de senha da conta e-mail/senha; cancelar primeiro e depois confirmar.', 'Cancelar não envia; confirmar fornece instrução genérica. Verificar chegada e spam; link válido permite redefinir senha.'),
 ('Crítico', 'Após redefinir senha, testar a senha antiga e a nova.', 'Senha antiga rejeitada; nova permite acesso. Não aplicar este caso à conta exclusivamente Google.'),
 ('Normal', 'Recuperação com e-mail inexistente; conta Google sem senha; formulário vazio.', 'Sem erro fatal e sem revelar quais contas existem. Não prometer recuperação por senha para conta exclusivamente Google.'),
 ('Alto', 'Conta Google e e-mail/senha com o mesmo endereço: se surgir conflito, registrar a mensagem; não criar vínculo por conta própria.', 'Sem união silenciosa ou exposição de dados entre contas. Conflito recebe orientação; eventual vinculação exige autenticação e revisão separada.'),
 ('Crítico', 'Primeira abertura oficial com Firebase novo e dados locais antigos. Conferir sessão e registros, sem limpar armazenamento.', 'Pede autenticação do novo projeto; não reutiliza token antigo nem atribui perfil antigo a outra pessoa. Usuários/senhas de outro projeto não são transferidos automaticamente.'),
 ('Normal', 'Revisar botão Google nos temas claro/escuro e com fonte aumentada; tocar símbolo e texto.', 'G colorido legível, proporções preservadas, texto sem corte e toda a área funcional; durante solicitação não aceita duplicação.'),
])
group('03 — Permissões e notificações', BASE, [
 ('Crítico', 'Sem monitoramento ativo, retirar Dispositivos próximos e reabrir. Se pedir autorização, negar. Aguardar 30 s.', 'App permanece utilizável, sem ciclo de fechamento e sem alegar proteção. O Android pode encerrar o processo ao revogar permissão; avaliar a reabertura.'),
 ('Crítico', 'Após recusa, permitir Dispositivos próximos nas configurações e voltar.', 'Reconexão fica disponível sem limpar dados ou reinstalar; sem pedidos repetidos a cada tentativa automática.'),
 ('Alto', 'Negar notificações, abrir e conectar BLE com Bluetooth autorizado.', 'App não fecha. Informa que avisos do sistema estão bloqueados; negar notificação não deve desligar a sirene crítica interna.'),
 ('Alto', 'Permitir notificações; usar Verificar prontidão → Testar notificação, quando disponível.', 'Aviso aparece na central de notificações, sem emergência falsa ou fechamento. Banner depende das configurações do Android.'),
 ('Alto', 'Tocar a notificação de monitoramento e depois a de alerta.', 'Abre a própria versão correta e a Central, não outro Escolta instalado.'),
 ('Alto', 'Remover só a permissão de localização; não desativar o Bluetooth.', 'No Android 12+, BLE com scan/connect continua disponível. Localização opcional não deve bloquear BLE. Android antigo pode precisar de localização para descoberta.'),
 ('Alto', 'Negar localização ao ativar compartilhamento de localização.', 'Sem fechamento; indica indisponibilidade e não inventa coordenadas. Não envia localização sem autorização.'),
 ('Alto', 'Durante ensaio supervisionado, retirar Bluetooth ou notificações, depois reabrir e restaurar.', 'Sem proteção falsa nem travamento; perda do enlace registrada quando detectável. Revogação pode encerrar processo pelo sistema e precisa ser documentada.'),
])
group('04 — Conexão Bluetooth', BASE, [
 ('Crítico', 'Ligar caixinha próxima e conectar com as permissões concedidas.', 'Conecta à placa correta, sem apitar falsamente por conexão inicial; só mostra proteção após dados válidos.'),
 ('Alto', 'Tentar conexão com a caixinha desligada.', 'Busca termina ou retorna estado claro; não fica congelada nem apresenta distância atual inexistente.'),
 ('Alto', 'Tentar com o Bluetooth do celular desligado, depois ligá-lo.', 'Orienta ativação e recupera tentativa; não fecha nem perde a conta.'),
 ('Alto', 'Tocar conectar repetidamente e alternar abas durante busca.', 'Não cria conexões concorrentes nem estados contraditórios.'),
 ('Alto', 'Desligar caixinha durante busca e religar.', 'Tentativa falha/recupera de forma clara; não considera sucesso uma conexão antiga ou incompleta.'),
 ('Crítico', 'Após conectar, observar dados durante pelo menos 5 min.', 'RSSI/horário/dados continuam atualizando; ausência de leitura recente não fica verde com metros congelados.'),
 ('Alto', 'Com conexão automática ativa, abrir app antes da placa e ligar a placa depois.', 'Encontra e conecta quando disponível; não exige reinstalação ou login novo.'),
 ('Alto', 'Desativar conexão automática e perder o vínculo; depois conectar manualmente.', 'Preferência respeitada; ausência de reconexão automática não esconde a perda. Conexão manual continua funcional.'),
])
group('05 — Proximidade e estimativa', BASE, [
 ('Crítico', 'Caixinha fechada e celular lado a lado: observar 10 min; anotar orientação, altura e obstáculos.', 'Sem amarelo/vermelho sustentado injustificado; registrar qualquer falso alerta, com RSSI e duração.'),
 ('Alto', 'Medir com trena em 1, 2, 3, 5, 7, 10 e até 15 m disponíveis. Permanecer parado e anotar real/estimada/RSSI em cada ponto.', 'Estimativa permanece aproximada e dados atualizam; registrar erro, não exigir correspondência exata nem aprovar precisão universal por um ensaio.'),
 ('Alto', 'Repetir trajetória de volta nos mesmos pontos, na mesma altura/orientação.', 'Retorno coerente e sem oscilação excessiva entre estados; registrar diferenças e tempo de recuperação.'),
 ('Alto', 'No mesmo ponto, girar a caixinha e o celular; repetir com o corpo entre eles e em bolso.', 'Documentar efeito de orientação/corpo; sistema não pode tratar estimativa RSSI como metragem garantida.'),
 ('Alto', 'Interpor parede/porta e repetir uma distância curta medida.', 'Registrar mudança de sinal/alerta. Obstáculo não é prova de afastamento; comportamento deve ser explicado pelas limitações.'),
 ('Crítico', 'Produzir uma queda breve de sinal e depois uma sustentada, sem botão físico.', 'Queda breve não vira emergência por proximidade. Na lógica p1/p2: atenção após 4 s fracos; perigo após 8 s fracos, além da filtragem. Conferir firmware instalado.'),
 ('Alto', 'Oscilar perto da transição amarelo/verde sem variar brutalmente a posição.', 'Histerese evita piscar/apitar continuamente. Na lógica p1/p2: atenção entra ≤ −78 dBm e sai > −73; perigo entra ≤ −86 e sai > −82; confirmar leituras filtradas.'),
 ('Crítico', 'Após amarelo, retornar perto; após vermelho, retornar sem confirmar segurança.', 'Amarelo recupera com sinal estabilizado. Emergência confirmada não some apenas por aproximar; exige confirmação presencial.'),
])
group('06 — Botão e emergência manual', BASE, [
 ('Crítico', 'Com placa conectada, apertar botão físico uma vez com app visível.', 'Caixinha alerta; celular sinaliza emergência imediatamente após receber evento válido, sem esperar o temporizador de proximidade.'),
 ('Crítico', 'Repetir botão físico com app minimizado e depois com tela bloqueada.', 'Alerta no celular e na caixinha nos dois contextos; medir latência. Tela bloqueada não pode silenciar indevidamente o alerta.'),
 ('Alto', 'Segurar botão por alguns segundos e depois apertar várias vezes rapidamente.', 'Um alerta ativo coerente, sem várias sirenes sobrepostas ou comandos duplicados; botão volta mecanicamente.'),
 ('Crítico', 'Reconectar/aproximar durante emergência sem confirmar segurança.', 'Estado crítico continua retido; reconexão não equivale a confirmação presencial.'),
 ('Crítico', 'Com conexão válida, confirmar segurança presencialmente.', 'Placa confirma reset; buzzer/sirene/vibração cessam e registro é gerado, sem reativação tardia.'),
 ('Crítico', 'Interromper vínculo durante confirmação ou tentar confirmar com comando sem resposta.', 'Não informa reset confirmado pela placa quando ele falhou; explica falha e mantém estado de alerta adequado.'),
 ('Crítico', 'Sem vínculo, após verificação presencial real, confirmar segurança no celular.', 'Pode encerrar saídas locais, mas continua informando dispositivo desconectado; não promete ter desarmado a placa remota.'),
 ('Alto', 'Durante alerta, tocar Continuar em alerta; alternar abas e reabrir a tela.', 'Sirene não duplica; estado crítico permanece visível até confirmação.'),
 ('Crítico', 'Desativar avisos do sistema e repetir botão; separadamente desativar vibração e repetir.', 'Sirene crítica não depende do botão de notificações. Preferência de vibração respeitada; registrar separadamente aviso visual, som e vibração.'),
 ('Alto', 'Com botão físico e caixinha desconectada, apertar e reconectar depois.', 'Buzzer local funciona; celular não promete receber evento sem enlace. Ao reconectar, estado de pânico da placa é tratado, se preservado pelo firmware.'),
 ('Alto', 'Confirmar segurança e imediatamente aguardar 30 s, sem novos eventos.', 'Nenhum áudio/alerta antigo reaparece por resposta atrasada.'),
])
group('07 — Perda de enlace e segundo plano', BASE, [
 ('Crítico', 'Conectado e protegido, desligar a placa com app visível; cronometrar.', 'Indica interrupção, tenta recuperar se habilitado; alerta crítico após tolerância. Referência atual do app: 5 s desde detecção; não confundir com tempo de detecção do Android.'),
 ('Crítico', 'Repetir perda com app minimizado e tela bloqueada, medindo cada um.', 'Alerta ocorre nos dois contextos; anotação individual de som, vibração, notificação, latência e reconexão.'),
 ('Alto', 'Interromper e restaurar vínculo rapidamente, antes de expirar tolerância.', 'Recuperação com dados recentes cancela perda pendente; conexão sem telemetria válida não basta para indicar segurança.'),
 ('Crítico', 'Religar placa após o alerta crítico por perda.', 'Reconecta com dados válidos, mas alerta retido exige confirmação; não some silenciosamente.'),
 ('Alto', 'Alternar Bluetooth desligado/ligado e realizar três ciclos de perda/retorno.', 'Sem travar, multiplicar serviços, congelar metros ou reproduzir alarmes antigos.'),
 ('Crítico', 'Com monitoramento ativo, bloquear tela por 15 min e gerar um evento ao final.', 'Monitoramento permanece operacional no aparelho testado; perda e evento são detectados. Registrar ajustes de bateria do Android.'),
 ('Alto', 'Remover app da lista de recentes durante monitoramento e observar; reabrir.', 'Registrar sobrevivência/retomada real do serviço. Não confundir remover recentes com Forçar parada; falhas precisam ser corrigidas ou explicitadas.'),
 ('Alto', 'Em teste supervisionado, usar Forçar parada e reiniciar celular; reabrir manualmente depois.', 'Não prometer proteção enquanto Android bloqueia o processo. Reabertura deve recuperar estado sem dados congelados ou emergência inventada; registrar a limitação.'),
 ('Alto', 'Aplicar modo economia de bateria e deixar tela apagada; repetir evento. Depois restaurar ajuste anterior.', 'Avaliar comportamento real sob restrição; diagnóstico não pode prometer funcionamento garantido sem revisão. Anotar falhas, não contorná-las sem registro.'),
])
group('08 — Espera, retorno e logout ativo', BASE, [
 ('Crítico', 'Conectado, solicitar espera; cancelar primeiro e depois confirmar.', 'Cancelar mantém proteção; confirmar só informa pausa após confirmação da placa e interrompe monitoramento intencional sem emergência falsa.'),
 ('Crítico', 'Colocar em espera e desligar/religar a caixinha, verificando depois a intenção no app.', 'Não retoma nem pausa incorretamente por conta própria; interface e placa devem concordar. Registrar comportamento da versão.'),
 ('Crítico', 'Retomar proteção com placa próxima e depois repetir com placa indisponível.', 'Sucesso somente com resposta da placa/dados válidos; falha não mostra verde indevido.'),
 ('Alto', 'Sair da conta com monitoramento ativo; verificar placa, serviço e áudio.', 'Desarma/encerra de forma confirmada antes de logout; falha oferece orientação e não afirma placa desligada sem resposta.'),
 ('Alto', 'Sair da conta durante busca ou com placa desconectada; entrar novamente.', 'Sem busca/comando atrasado ressuscitando na conta errada. Nova sessão inicia com estado claro.'),
])
group('09 — Bateria, energia e mecânica', BASE, [
 ('Alto', 'Ligar por bateria e por USB-C; inserir/remover USB durante uso e conectar cabo com caixa fechada.', 'Acesso físico ao USB sem forçar placa; dispositivo continua estável e alimentação/carregamento exibidos conforme telemetria real.'),
 ('Alto', 'Comparar percentual/voltagem com estado real ao carregar e descarregar normalmente.', 'Sem valores impossíveis; percentual é estimado, não precisão laboratorial. Sem salto que mascare bateria crítica.'),
 ('Alto', 'Observar passagem por bateria baixa e crítica durante descarga normal; não forçar descarga profunda.', 'Avisos previstos sem tempestade de notificações; referência atual: ≤20% e ≤10%. Recarregar para limpar condição; sem silenciar emergência.'),
 ('Alto', 'Medir autonomia em uso contínuo, anotando início/fim, nível inicial/final, conexões e alertas.', 'Resultado documentado por condição. Não prometer 11 h universais nem extrapolar um ciclo.'),
 ('Crítico', 'Apertar botão com tampa fechada 20 vezes; pressionar centro e bordas, sem força excessiva.', 'Botão move/retorna, não fica permanentemente pressionado; suporte e trava não soltam nem bloqueiam acionamento.'),
 ('Alto', 'Revisar fixações, passantes, LED, saída sonora e tampa; movimentar caixa suavemente.', 'Nada se desloca ou força soldas; abraçadeiras não comprimem Li-Po, não existe curto/fio descascado. Não realizar queda deliberada ou compressão da bateria.'),
])
group('10 — Internet, histórico e interface', BASE, [
 ('Crítico', 'Após login, desligar Wi-Fi/dados mantendo Bluetooth ligado; testar botão e perda BLE.', 'Proteção local BLE e áudio não dependem da internet; e-mail falha/indisponível sem bloquear alerta local.'),
 ('Alto', 'Alternar Wi-Fi/dados e modo avião, religando Bluetooth quando necessário.', 'Distingue internet ausente de Bluetooth desligado; sem login perdido indevidamente ou proteção falsa.'),
 ('Alto', 'Trocar tema/abas, editar perfil e bloquear/desbloquear durante monitoramento.', 'Conexão e proteção não são interrompidas pela navegação; alterações ficam salvas na conta correta.'),
 ('Normal', 'Aumentar fonte/tamanho de exibição do Android e usar teclado nos formulários.', 'Textos principais e botões acessíveis, sem corte crítico ou campo inacessível; símbolo Google legível.'),
 ('Alto', 'Gerar eventos e conferir histórico; reabrir. Limpar histórico somente depois de salvar evidência e confirmar.', 'Eventos com data/motivo coerentes, sem duplicação excessiva; limpeza não muda estado da placa nem reaparece por carregamento antigo.'),
 ('Normal', 'Usar os botões de discagem de emergência: cancelar a confirmação; quando autorizado, somente conferir discador sem completar chamada.', 'Cancelar não abre chamada. Nenhuma ligação automática; não telefonar para emergência para ensaio.'),
 ('Alto', 'Ensaiar alerta com volume de mídia baixo, depois com volume de alarme baixo, modo silencioso e Não perturbe. Restaurar ajustes ao final.', 'Registrar audibilidade em cada condição; vibração/visual não devem desaparecer sem motivo. Não prometer contornar restrição de volume/Não perturbe sem comprovação.'),
 ('Alto', 'Usar fone Bluetooth/alto-falante externo durante alerta, quando disponível; retirar e repetir.', 'Anotar onde o som saiu e se responsável o percebe. Mudança de saída não deve travar ou duplicar o alerta; risco de áudio só no fone deve ser explicitado.'),
 ('Alto', 'Durante reprodução de música e, se possível, chamada comum autorizada, gerar alerta supervisionado. Nunca ligar para emergência.', 'Sem fechamento do app; medir comportamento de foco de áudio, visual/vibração e retomada. Som inaudível deve ser registrado como limitação/falha, não presumido OK.'),
])
group('11 — E-mail e localização opcionais', OPTIONAL, [
 ('Alto', 'Cadastrar apenas contato próprio/autorizado; deixar envio desativado e gerar emergência.', 'Não tenta enviar e-mail sem ativação explícita; local continua alertando.'),
 ('Alto', 'Informar endereço inválido e depois endereço válido. Trocar destinatário com envio anteriormente ativo.', 'Inválido recusado; troca exige nova ativação/consentimento, sem envio silencioso ao novo contato.'),
 ('Alto', 'Ativar envio e enviar teste para si; confirmar recebimento real e spam.', 'App diferencia solicitação aceita de entrega; registrar recebido/não recebido e horário. Teste não contém nome/localização da criança.'),
 ('Alto', 'Gerar uma emergência real supervisionada com internet e envio ativo; depois repetir sem internet.', 'Conteúdo correto e um fluxo por evento; falta de internet não atrasa sirene nem causa travamento. Entrega não é garantida.'),
 ('Crítico', 'Com localização desligada, revisar mensagem recebida; depois habilitar com permissão e repetir.', 'Sem coordenadas quando desligada. Se disponível/ativada, descreve localização do celular, nunca posição exata da criança.'),
])
group('12 — Ensaios e diagnóstico opcionais', OPTIONAL, [
 ('Alto', 'Verificar prontidão com placa ausente, conectada sem dados e conectada com dados atuais.', 'Itens não aprovam conexão/proteção inexistente. Campos de conferência manual são claramente identificados.'),
 ('Alto', 'Coletar distância real informada, incluindo durante amarelo/vermelho; interromper uma coleta e iniciar outra.', 'Coleta não depende de permanecer verde; amostras novas, lacunas/incompletos explícitos. Não congela nem usa 30 leituras antigas como novas.'),
 ('Normal', 'Exportar CSV dos ensaios e abrir para conferir distância real, dados, horários e condição.', 'Arquivo legível com dados coerentes; real e estimada não se confundem, incompletos não viram aprovados.'),
])
group('13 — Liberação da oficial candidata', 'Somente após autorizar atualização; nenhuma instalação nesta etapa', [
 ('Crítico', 'Comparar lista exata de mudanças e assinatura com a oficial existente antes de compilar/instalar.', 'Somente Firebase/autenticação/botão Google autorizados. Outras alterações já presentes na pasta não entram por acidente; certificado incompatível bloqueia atualização sem plano aprovado.'),
 ('Crítico', 'Verificar se usuários antigos precisam novo acesso e como preservar/recuperar dados; ensaiar sem apagar dados.', 'Mudança de Firebase e limites de migração informados. Não prometer recuperar senhas/UIDs automaticamente; rollback planejado.'),
 ('Crítico', 'Na futura entrega final, abrir sem computador/Metro/USB e após reiniciar celular.', 'Aplicativo final abre e monitora sem servidor de desenvolvimento; configuração pública Google está incluída e pacote/certificado registrados.'),
 ('Crítico', 'Executar os casos críticos na candidata, comparando evidências válidas da oficial; repetir cada evento nos contextos aplicáveis.', 'Nenhuma regressão crítica aceita como normal. Teste de outra build não aprova a atual; itens bloqueados continuam pendentes.'),
 ('Alto', 'Registrar outro telefone Android se houver; se só houver S24 Ultra, anotar essa limitação.', 'Não generaliza aprovação a todos os aparelhos, Androids ou iOS sem ensaio. Validação inicial restrita ao equipamento utilizado.'),
])

instructions = [
 'Esta ficha NÃO executa testes e NÃO aprova o aplicativo. Campos de resultado começam vazios. Só o ensaio observado permite preencher Aprovado.',
 'Sem mudanças adicionais na oficial: testar a versão exata existente primeiro. Firebase e botão Google são as únicas alterações novas autorizadas nesta etapa. Não reinstalar a oficial nem limpar dados para ensaiar.',
 'A pasta de trabalho contém alterações anteriores fora do Firebase. Não compilar a árvore inteira para substituir a oficial sem auditar a diferença e a assinatura. Um app de desenvolvimento usa o bundle do servidor: trocar esse bundle também muda o código executado.',
 'O projeto correto é escolta-unitau. Login Google na versão de teste foi relatado como OK pelo usuário, mas não comprova login no pacote/certificado oficial ou todos os demais fluxos. Não marcar automaticamente qualquer caso desta ficha.',
 'Contas/senhas do Firebase antigo não migram por trocar a configuração. Fazer novo login no projeto atual. Não apagar o projeto anterior ou associar dados de pessoas diferentes.',
 'Use nomes fictícios e contas/contatos próprios. Não registrar senha, token ou chave privada nas evidências. Não enviar avisos para terceiros sem autorização.',
 'Somente adultos em teste controlado. Não usar uma criança como sujeito ou depender do protótipo para segurança real. Volume moderado, sem dirigir e sem ligar para números de emergência. Não perfurar, comprimir ou descarregar excessivamente a Li-Po.',
 'Teste uma instalação de cada vez; não deixe oficial e teste conectados à mesma placa. Sempre restaurar Bluetooth, notificações, energia e preferências ao finalizar.',
 'Ordem sugerida: identificação → Firebase na candidata → permissões → BLE → botão/perda → segundo plano → proximidade → dados/energia → opcionais → liberação. Após uma falha crítica, registrar e parar aquele fluxo; não modificar o código sem análise.',
 'Repetição: conexão, botão, perda e confirmação pelo menos 3 vezes por contexto; segundo plano e tela bloqueada separados. Para alarmes, anotar cada saída: caixinha, som do celular, vibração e notificação. Registrar também latência e retorno.',
 'São cenários de aceitação e regressão, não garantia de perfeição. Algumas expectativas podem revelar defeitos já existentes. Não ajustar o resultado esperado só para transformar falha em aprovação.',
 'Valores de referência do código atual (confirmar firmware da placa): atenção −78/−73 dBm com 4 s; perigo −86/−82 dBm com 8 s; retorno 2 s; tolerância de perda do app 5 s. Filtragem e detecção do sistema adicionam atraso. Distância estimada por RSSI não é distância garantida.',
 'Se um recurso não existir naquela versão, preencher Não aplicável e justificar. Se faltar aparelho, internet, bateria ou acesso remoto, preencher Bloqueado. Não tratar Bloqueado ou Não testado como Aprovado.',
]

instructions[0:0] = [
 'REVISÃO PASSO A PASSO de 13/10/2026. Os arquivos anteriores foram preservados; use esta revisão para os próximos ensaios. Dados preenchidos anteriormente não são apagados nem viram aprovação automática.',
 'Como usar: 1) leia Preparação; 2) siga os passos numerados sem trocar a versão; 3) compare com Esperado; 4) escreva O que aconteceu; 5) faça a restauração indicada. Onde a tela/botão não existir, registre a diferença ou Não aplicável, sem instalar outra versão para fazê-lo aparecer.',
 'Menu do aplicativo: a aba de configuração se chama Sistema no código atual. Conexão manual: Central → PROCURAR AGORA; confirmação de alerta: Central → CONFIRMAR SEGURANÇA → Sim, está segura. Na oficial antiga os nomes podem diferir; anote o equivalente real.',
 'Estado inicial para alertas: conectado, sem emergência anterior, dados recentes e proteção ativa. Se um teste deixar emergência, falta de permissão ou espera, restaure antes do próximo. Caso contrário, o resultado seguinte será contaminado.',
 'Tempo: use cronômetro ou vídeo dos dois aparelhos com ajuda de outro adulto. Registre o momento do evento, momento em que a perda foi detectada e início de cada saída. Se não observou um instante porque tela estava bloqueada, escreva Não observado; não invente latência.',
 'SEM INTERNET não significa SEM SERVIDOR: versões de desenvolvimento ainda precisam de Metro. Para ensaio offline, a ligação pelo USB deve estar previamente conferida comigo. Para percurso com cabo limitante, combinar acesso de desenvolvimento por rede antes; não interpretar falha de servidor como falha Bluetooth.',
 'DESLIGAR CAIXINHA só com chave ou conector removível seguro e previamente conhecido. Tirar USB não desliga se bateria continua alimentando. Não puxar fios/soldas nem soltar bateria soldada. Sem método seguro, marcar o teste de energia Bloqueado; não improvisar.',
 'Tempos de observação como 15 ou 30 s organizam o ensaio, não prometem latência universal. Se a condição planejada não foi alcançada (ex.: reconexão rápida demais/lenta demais ou RSSI não cruzou limite), registrar Bloqueado/condição não alcançada; não aprovar um cenário diferente.',
 'Casos T005, T020, T021, T044/T045 quando faltam leituras, T095 e T096 exigem ajuda técnica. Esta ficha não autoriza instalar APK, vincular contas, apagar históricos, mudar firmware ou fazer rollback. Limpeza de histórico e chamadas têm partes limitadas/assistidas.',
 'Vocabulário: BLE é o Bluetooth usado entre celular e caixinha; vínculo é essa conexão; RSSI é intensidade do sinal em dBm, não metragem; firmware é o código da placa; APK/build/bundle identificam a versão instalada e o código carregado. Metro é o servidor necessário apenas às versões de desenvolvimento.',
 'App visível = Central na tela. Minimizado = apertar Início sem remover dos Recentes. Tela bloqueada = botão lateral apaga/bloqueia a tela. Remover de Recentes e Forçar parada são testes diferentes. Na matriz, não desbloquear para provocar perda: outro adulto opera a alimentação segura da caixinha.',
]

def protocol_text(protocol):
    return ('PREPARAÇÃO: ' + protocol['preparation'] + '\n\nPASSO A PASSO:\n' +
            '\n'.join(f'{i}. {step}' for i,step in enumerate(protocol['steps'],1)) +
            '\n\nAO TERMINAR: ' + protocol['cleanup'] + '\nANOTE: ' + protocol['record'])

assert len(cases) == len(PROTOCOLS) == 99

headers = ['ID','Grupo','Onde testar','Prioridade','Como testar / cenário','Resultado esperado','Resultado','O que aconteceu — preencha','Repetições / latência','Data / versão ensaiada','Evidência / observação']
wb = Workbook()
guide = wb.active
guide.title = 'Leia primeiro'
guide.append(['ESCOLTA — FICHA MANUAL DE VALIDAÇÃO'])
guide.append(['Revisão passo a passo em 13/10/2026 — não é a data de execução'])
guide.append([f'{len(cases)} casos; nenhuma aprovação preenchida automaticamente'])
guide.append(['Equipamento / Android:', ''])
guide.append(['APK / versão / origem / bundle:', ''])
guide.append(['Firmware e alimentação da caixinha:', ''])
guide.append(['Responsável e local do ensaio:', ''])
for line in instructions:
    guide.append([line])
guide.column_dimensions['A'].width = 110
guide.column_dimensions['B'].width = 40
for row in guide:
    for cell in row:
        cell.alignment = Alignment(wrap_text=True, vertical='top')
    guide.row_dimensions[row[0].row].height = 82 if row[0].row >= 8 else 30
guide['A1'].font = Font(size=18, bold=True, color='102A43')
guide.freeze_panes = 'A4'

ws = wb.create_sheet('Testes — preencher')
ws.append(headers)
thin = Side(style='thin', color='D9E2EC')
for i, case in enumerate(cases, 1):
    name, phase, priority, action, expected = case
    ws.append([f'T{i:03d}', name, phase, priority, protocol_text(PROTOCOLS[i]), expected, None, None, None, None, None])
    row = i + 1
    # A leitura integral está em Roteiros detalhados; Excel limita altura da linha.
    ws.row_dimensions[row].height = 400
    for col in range(1, 12):
        c = ws.cell(row, col)
        c.alignment = Alignment(wrap_text=True, vertical='top')
        c.font = Font(size=11, color='102A43')
        c.border = Border(bottom=thin)
        c.fill = PatternFill('solid', fgColor='FFF7D6' if col >= 7 else ('F0F4F8' if i % 2 == 0 else 'FFFFFF'))
for c in ws[1]:
    c.fill = PatternFill('solid', fgColor='102A43')
    c.font = Font(bold=True, color='FFFFFF', size=11)
    c.alignment = Alignment(wrap_text=True, vertical='center')
for letter, width in zip('ABCDEFGHIJK', [9,31,40,12,95,65,19,65,24,28,42]):
    ws.column_dimensions[letter].width = width
ws.row_dimensions[1].height = 35
ws.freeze_panes = 'E2'
ws.auto_filter.ref = ws.dimensions
dv = DataValidation(type='list', formula1='"Aprovado,Falhou,Parcial,Bloqueado,Não aplicável,Não testado"', allow_blank=True)
dv.errorTitle = 'Resultado inválido'
dv.error = 'Selecione um resultado da lista e descreva o observado.'
dv.showErrorMessage = True
ws.add_data_validation(dv)
dv.add(f'G2:G{len(cases)+1}')
for value, color in [('Aprovado','D3F9D8'),('Falhou','FFE3E3'),('Parcial','FFF3BF'),('Bloqueado','E5DBFF')]:
    ws.conditional_formatting.add(f'G2:G{len(cases)+1}', CellIsRule(operator='equal', formula=[f'"{value}"'], fill=PatternFill('solid', fgColor=color)))
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.page_setup.orientation = 'landscape'
ws.page_setup.paperSize = ws.PAPERSIZE_A3
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0
ws.print_title_rows = '1:1'
ws.print_options.horizontalCentered = True
summary = wb.create_sheet('Resumo')
summary.append(['Grupo','Casos','Aprovados','Falhas','Parciais','Bloqueados','Não aplicáveis','Ainda não concluídos'])
for name, count in Counter(c[0] for c in cases).items():
    r = summary.max_row + 1
    summary.append([name, count])
    for j, status in enumerate(['Aprovado','Falhou','Parcial','Bloqueado','Não aplicável'], 3):
        summary.cell(r,j, f'=COUNTIFS(\'Testes — preencher\'!B:B,A{r},\'Testes — preencher\'!G:G,"{status}")')
    summary.cell(r,8,f'=B{r}-SUM(C{r}:G{r})')
summary.column_dimensions['A'].width = 46
for col in 'BCDEFGH': summary.column_dimensions[col].width = 22
summary.freeze_panes = 'B2'

# Leitura vertical sem cortar procedimentos por limite de altura do Excel.
# As respostas continuam na tabela principal, acessíveis por link em cada roteiro.
detail = wb.create_sheet('Roteiros detalhados')
detail.column_dimensions['A'].width = 24
for letter in 'BCDEFGH': detail.column_dimensions[letter].width = 12
detail.freeze_panes = 'A2'
def detail_line(text, height=45, heading=False):
    r = detail.max_row + 1 if detail.cell(1,1).value is not None else 1
    detail.merge_cells(start_row=r, start_column=1, end_row=r, end_column=8)
    c = detail.cell(r,1,text)
    c.alignment = Alignment(wrap_text=True, vertical='top')
    c.font = Font(size=11, bold=heading, color='FFFFFF' if heading else '102A43')
    c.fill = PatternFill('solid', fgColor='102A43' if heading else 'FFFFFF')
    detail.row_dimensions[r].height = height
    return r
detail_line('ROTEIROS DETALHADOS — leia aqui; preencha resultados na aba Testes — preencher',40,True)
for i,(name,phase,priority,action,expected) in enumerate(cases,1):
    protocol = PROTOCOLS[i]
    first_row = detail_line(f'T{i:03d} • {name} • {priority}',35,True)
    ws.cell(i+1,1).hyperlink = f"#'Roteiros detalhados'!A{first_row}"
    ws.cell(i+1,1).style = 'Hyperlink'
    detail_line('Cenário: ' + action,65)
    detail_line('Onde: ' + phase,45)
    detail_line('Preparação: ' + protocol['preparation'],95)
    for n,step in enumerate(protocol['steps'],1): detail_line(f'{n}. {step}',65)
    detail_line('ESPERADO: ' + expected,85)
    reply_row = detail_line(f'PREENCHER O QUE ACONTECEU → linha {i+1} da aba Testes — preencher',40,True)
    detail.cell(reply_row,1).hyperlink = f"#'Testes — preencher'!G{i+1}"
    detail_line('O que registrar: ' + protocol['record'],70)
    detail_line('Ao terminar / restaurar: ' + protocol['cleanup'],75)
    detail_line('',20)
detail.print_options.horizontalCentered = True
detail.page_setup.paperSize = detail.PAPERSIZE_A4
detail.page_setup.fitToWidth = 1
detail.page_setup.fitToHeight = 0
detail.sheet_properties.pageSetUpPr.fitToPage = True

matrix = wb.create_sheet('Eventos por contexto')
matrix.append(['Evento','Estado do aplicativo','Internet','Procedimento','Esperado','Resultado','O que aconteceu','Latência / saídas / evidência'])
event_cases = [
 ('Botão físico', 'Com vínculo válido, apertar o botão.', 'Caixinha e celular alertam; emergência permanece até confirmação.'),
 ('Perda prolongada BLE', 'Conectado, interromper vínculo e medir detecção/tolerância.', 'Interrupção, reconexão se habilitada e alerta após tolerância; sem distância congelada como atual.'),
 ('Retorno após emergência', 'Religar/aproximar após alerta; primeiro sem confirmar, depois confirmar presencialmente.', 'Retorno não apaga emergência sozinho; confirmação só dá reset remoto se a placa responder.'),
 ('Atenção sustentada', 'Provocar sinal fraco sustentado sem botão e retornar perto.', 'Amarelo com saídas de atenção, sem sirene crítica indevida; retorno estabilizado. Não exigir metragem universal.'),
]
for event, action, expected in event_cases:
    for state in ['App visível', 'App minimizado', 'Tela bloqueada']:
        for internet in ['Com internet', 'Sem internet, Bluetooth ligado']:
            matrix.append([event, state, internet, protocol_text(matrix_protocol(event,state,internet)), expected, None, None, None])
for col, width in zip('ABCDEFGH',[26,24,34,60,65,20,65,42]): matrix.column_dimensions[col].width = width
for row in matrix:
    for c in row:
        c.alignment = Alignment(wrap_text=True, vertical='top')
        c.fill = PatternFill('solid', fgColor='FFF7D6' if c.column >= 6 else 'FFFFFF')
    matrix.row_dimensions[row[0].row].height = 400 if row[0].row > 1 else 30
for c in matrix[1]:
    c.font = Font(bold=True, color='FFFFFF')
    c.fill = PatternFill('solid', fgColor='102A43')
matrix.freeze_panes = 'D2'
matrix.auto_filter.ref = matrix.dimensions
matrix_dv = DataValidation(type='list', formula1='"Aprovado,Falhou,Parcial,Bloqueado,Não aplicável,Não testado"', allow_blank=True)
matrix.add_data_validation(matrix_dv)
matrix_dv.add(f'F2:F{matrix.max_row}')

# Os contextos também recebem cartões verticais, pois linhas do Excel não podem
# crescer ilimitadamente. Nada depende de ler uma célula cortada horizontalmente.
for r,row in enumerate(list(matrix.values)[1:],2):
    event,state,internet,_,expected,*_ = row
    protocol = matrix_protocol(event,state,internet)
    first_row = detail_line(f'M{r-1:02d} • {event} • {state} • {internet}',50,True)
    matrix.cell(r,1).hyperlink = f"#'Roteiros detalhados'!A{first_row}"
    matrix.cell(r,1).style = 'Hyperlink'
    detail_line('Preparação: ' + protocol['preparation'],95)
    for n,step in enumerate(protocol['steps'],1): detail_line(f'{n}. {step}',65)
    detail_line('ESPERADO: ' + expected,85)
    rr = detail_line(f'PREENCHER O QUE ACONTECEU → linha {r} da aba Eventos por contexto',40,True)
    detail.cell(rr,1).hyperlink = f"#'Eventos por contexto'!F{r}"
    detail_line('Anote: ' + protocol['record'],70)
    detail_line('Ao terminar: ' + protocol['cleanup'],75)
    detail_line('',20)
guide.append(['No Excel: clique no ID do teste ou no evento da matriz para abrir Roteiros detalhados. Cada passo ocupa uma linha legível; use o link do cartão para voltar aos campos amarelos de resultado/observação.'])
guide.row_dimensions[guide.max_row].height = 65
guide.cell(guide.max_row,1).alignment = Alignment(wrap_text=True,vertical='top')
sheet_path = OUT / 'Ficha_Testes_Escolta_PASSO_A_PASSO.xlsx'
wb.save(sheet_path)

doc = Document()
sec = doc.sections[0]
sec.top_margin = sec.bottom_margin = Inches(.65)
sec.left_margin = sec.right_margin = Inches(.7)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal.font.size = Pt(10)
normal.paragraph_format.space_after = Pt(5)
doc.styles['Heading 2'].font.name = 'Calibri'
doc.styles['Heading 2'].font.size = Pt(11)
doc.styles['Heading 2'].font.color.rgb = RGBColor.from_string('102A43')
doc.add_heading('Escolta — ficha de testes', 0)
doc.add_paragraph(f'Revisão passo a passo de 13/10/2026 • {len(cases)} casos • resultados para preenchimento manual')
for label in ['Responsável / aparelho / Android','Aplicativo / versão / APK / bundle','Firmware / energia / configuração da placa','Data / ambiente de execução']:
    doc.add_paragraph(label + ': __________________________________________________')
doc.add_heading('Antes de começar', 1)
for line in instructions: doc.add_paragraph(line, style='List Bullet')
doc.add_paragraph('Resultado: Aprovado / Falhou / Parcial / Bloqueado / Não aplicável / Não testado.\nAnotar evidências sem senhas ou tokens. O campo em branco nunca significa aprovação.')
last_group = None
for i, (name, phase, priority, action, expected) in enumerate(cases, 1):
    if name != last_group:
        doc.add_page_break()
        doc.add_heading(name, 1)
        doc.add_paragraph('Onde: ' + phase)
        last_group = name
    p = doc.add_paragraph(style='Heading 2')
    p.paragraph_format.keep_with_next = True
    p.add_run(f'T{i:03d} • {priority} • ' + action).bold = True
    protocol = PROTOCOLS[i]
    p = doc.add_paragraph('Preparação: ' + protocol['preparation'])
    p.paragraph_format.keep_with_next = True
    p = doc.add_paragraph('Passo a passo')
    p.paragraph_format.keep_with_next = True
    p.runs[0].bold = True
    for n,step in enumerate(protocol['steps'],1):
        p = doc.add_paragraph(f'{n}. {step}')
        p.paragraph_format.space_after = Pt(4)
    p = doc.add_paragraph('Esperado: ' + expected)
    p.paragraph_format.keep_with_next = True
    doc.add_paragraph('Resultado: __________________  Data/versão: __________________\nO que aconteceu: __________________________________________________________\n_________________________________________________________________________\n_________________________________________________________________________\nRepetições / tempo / evidência: _______________________________________________')
    doc.add_paragraph('Anote: ' + protocol['record'])
    doc.add_paragraph('Ao terminar / restaurar: ' + protocol['cleanup'])
    doc.add_paragraph('')
doc.add_page_break()
doc.add_heading('Matriz de eventos por contexto', 1)
doc.add_paragraph('Complementa os casos anteriores: anotar cada contexto separadamente. Repetir pelo menos três vezes, sem dois aplicativos monitorando a mesma placa. Internet desligada não significa Bluetooth desligado.')
for row in list(matrix.values)[1:]:
    event, state, internet, action, expected, *_ = row
    p = doc.add_paragraph(f'{event} • {state} • {internet}')
    p.paragraph_format.keep_with_next = True
    p.runs[0].bold = True
    protocol = matrix_protocol(event,state,internet)
    doc.add_paragraph('Preparação: ' + protocol['preparation'])
    for n,step in enumerate(protocol['steps'],1): doc.add_paragraph(f'{n}. {step}')
    doc.add_paragraph('Esperado: ' + expected + '\nResultado: __________________  Tempo/saídas: __________________\nO que aconteceu: __________________________________________________________\n_________________________________________________________________________')
    doc.add_paragraph('Anote: ' + protocol['record'] + '\nAo terminar: ' + protocol['cleanup'])
footer = sec.footer.paragraphs[0]
footer.add_run('ESCOLTA • Validação manual • Página ')
field = OxmlElement('w:fldSimple')
field.set(qn('w:instr'), 'PAGE')
footer._p.append(field)
doc_path = OUT / 'Ficha_Testes_Escolta_PASSO_A_PASSO.docx'
doc.save(doc_path)

# Validação estrutural dos artefatos: não transforma casos em aprovados.
check = load_workbook(sheet_path)
assert check['Testes — preencher'].max_row == len(cases)+1
assert all(check['Testes — preencher'].cell(r,c).value is None for r in range(2,len(cases)+2) for c in range(7,12))
assert len(Document(doc_path).paragraphs) > len(cases)*4
assert check['Eventos por contexto'].max_row == 25
assert all(check['Eventos por contexto'].cell(r,c).value is None for r in range(2,26) for c in range(6,9))
assert all('PASSO A PASSO:' in check['Testes — preencher'].cell(r,5).value for r in range(2,101))
assert all('PREPARAÇÃO:' in check['Eventos por contexto'].cell(r,4).value for r in range(2,26))
word_check = Document(doc_path)
all_text = '\n'.join(p.text for p in word_check.paragraphs)
assert all(f'T{i:03d} •' in all_text for i in range(1,100))
assert sum(p.text.startswith('Preparação: ') for p in word_check.paragraphs) == 123
assert sum(p.text.startswith('Esperado: ') for p in word_check.paragraphs) == 123
assert sum('O que aconteceu:' in p.text for p in word_check.paragraphs) == 123
assert sum(p.style.name == 'Heading 2' for p in word_check.paragraphs) == 99
assert all(check['Testes — preencher'].cell(r,1).hyperlink for r in range(2,101))
assert all(check['Eventos por contexto'].cell(r,1).hyperlink for r in range(2,26))
print(f'{len(cases)} casos + 24 combinações de contexto; procedimentos, esperados, campos vazios e navegação conferidos; arquivos Word/Excel reabertos sem erro.')
print(sheet_path)
print(doc_path)
