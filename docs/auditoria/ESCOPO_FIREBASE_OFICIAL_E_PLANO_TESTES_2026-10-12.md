# Escopo autorizado — Firebase oficial e ficha de testes

O usuário pediu para preservar o que já funciona, limitar mudanças novas na
oficial ao Firebase/autenticação e melhorar o símbolo de Continuar com Google.
Pediu também uma ficha com cenários, resultados esperados e espaço para observação.

## Mudanças desta etapa

- `firebaseEnvironment.ts`: teste e oficial passam a selecionar o projeto
  `escolta-unitau`, com as configurações públicas WEB fornecidas pelo usuário.
  A oficial usa instância `escolta-oficial-escolta-unitau`; a de teste mantém
  `escolta-teste-escolta-unitau`. Não reutiliza a autenticação default antiga.
- `googleAuth.ts`: cliente WEB do projeto atual aceito nas duas variantes quando
  o módulo nativo está presente; clientes de outro projeto continuam bloqueados.
- `AuthScreen.tsx` e `assets/google-g.png`: botão com símbolo oficial colorido,
  fundo branco, proporções preservadas, estado desabilitado e rótulo acessível.
  Nenhuma nova dependência foi instalada.
- `.env.example` e comentário de `.env.local`: esclarecem aplicação às duas builds.
- Testes automatizados de autenticação ajustados ao escopo explicitamente novo.

Comparação SHA-256 antes/depois de **34 arquivos** de aplicativo fora desses
arquivos de login/Firebase: **nenhuma diferença nesta etapa**. Inclui App,
preferências, hook de monitoramento, BLE, permissões, notificações, módulos
Android, dependências e configurações de aplicativo. Não foi revertida nenhuma
alteração anterior existente na pasta. Firmware, CAD e documentos CICTED não
foram modificados nesta etapa.

TypeScript aprovado; **80 testes automatizados aprovados**, sem falhas, pulos ou
TODO. Isso não comprova login ou operação no APK oficial existente.

## Estado da versão instalada e pendências

**Nenhum APK foi compilado ou instalado nesta etapa, e nenhum dado foi apagado.**
Não foram feitos novos cadastros remotos ou modificações no console Firebase.
A mudança está no código-fonte, não é uma atualização entregue ao app oficial.
O login Google da build de teste já foi confirmado pelo usuário.

O Android oficial `com.nicolasvmen.escoltaunitau` precisa ser cadastrado no
Firebase atual com o SHA do certificado que efetivamente assinará sua build.
O cadastro `.teste` não autoriza automaticamente o pacote oficial. O módulo
nativo Google também precisa estar na build instalada; fonte/env não adicionam
módulo a um APK antigo. A assinatura da atualização precisa corresponder à
instalada para atualizar sem desinstalar e perder dados.

O projeto Firebase anterior não foi apagado. Tokens/contas/senhas/UIDs antigos
não migram automaticamente para outro projeto. A instância oficial nova exige
autenticação no projeto correto; não foi feita cópia ou atribuição automática
de dados locais de um usuário antigo ao novo. Preservação/recuperação deve ser
validada antes de qualquer substituição do APK.

Há modificações anteriores de monitoramento e infraestrutura na árvore atual.
**Não compilar toda a árvore e chamar isso de atualização somente de Firebase.**
Antes de entrega oficial, identificar a build/bundle exata de referência e
separar a mudança autorizada, ou obter autorização para outras diferenças.
Mesmo um APK antigo de desenvolvimento pode carregar o código atual pelo Metro;
a fonte do bundle também faz parte da versão ensaiada.

## Entregáveis

- `docs/testes/Ficha_Testes_Escolta.xlsx`: 99 casos, campos de resultado/observação
  vazios, filtros, lista de resultados e resumo; aba adicional com 24 combinações
  de quatro eventos × três estados de tela × duas condições de internet.
- `docs/testes/Ficha_Testes_Escolta.docx`: mesmos casos, instruções e espaços para
  preenchimento; inclui a matriz de contexto.
- `tools/auditoria/gerar_ficha_validacao.py`: gerador reproduzível dos artefatos.

Ambos os documentos foram reabertos para conferir estrutura, contagem e campos
vazios. Nenhuma aprovação real foi pré-preenchida. É uma bateria de cenários
razoáveis de aceitação/regressão, não uma prova de ausência de todos os defeitos.
Defeito observado exige diagnóstico antes de mudança; recurso inexistente na
versão testada recebe Não aplicável justificado, não aprovação fictícia.

## Fontes para configuração e símbolo

- Firebase Google Android: https://firebase.google.com/docs/auth/android/google-signin
- Marca Google: https://developers.google.com/identity/branding-guidelines
- Símbolo oficial usado: https://developers.google.com/static/identity/images/g-logo.png
