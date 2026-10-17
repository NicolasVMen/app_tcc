# Ficha de testes — revisão passo a passo

**Ficha atual reduzida:** usar `Ficha_Testes_Escolta_ESSENCIAL.docx` ou
`Ficha_Testes_Escolta_ESSENCIAL.xlsx`. Após mapear telas e integrações reais,
os 99 casos abaixo foram substituídos por 24 roteiros de integração + 3
condicionais de e-mail/localização. A versão extensa é mantida como histórico,
não como lista obrigatória para o próximo passe. Ver o relatório de estrutura
em `docs/auditoria/MAPEAMENTO_FUNCIONAL_E_TESTES_ESSENCIAIS_2026-10-13.md`.

Revisão de 13/10/2026. Nenhum código do aplicativo, Firebase, firmware ou CAD
foi alterado ao melhorar esta ficha. Nenhum ensaio real foi executado ou aprovado.

Use `Ficha_Testes_Escolta_PASSO_A_PASSO.docx` para leitura/preenchimento no Word
ou `Ficha_Testes_Escolta_PASSO_A_PASSO.xlsx` para organizar resultados no Excel.
Os arquivos anteriores foram preservados, inclusive qualquer anotação existente.

Cada um dos 99 casos contém:

1. Identificação da versão/recurso e preparação necessária.
2. Passos numerados específicos, ações e intervalos de observação.
3. Resultado esperado, separado do procedimento.
4. Campos vazios para resultado, o que aconteceu, tempos/repetições e evidências.
5. O que anotar e o que restaurar antes do próximo teste.

A matriz adicional repete quatro eventos em três estados de tela e duas condições
de internet, com 24 procedimentos específicos. Não desbloquear a tela para
provocar perda no cenário bloqueado: isso mudaria o contexto. Usar outro adulto
e alimentação removível segura da caixinha; se isso não for possível, Bloqueado.

No Excel, clique no ID do teste ou no evento da matriz para abrir o cartão
vertical em **Roteiros detalhados**. Ele evita cortar instruções pelo limite de
altura das células. Depois use o link do cartão para voltar aos campos amarelos
da tabela e preencher o observado. No Word, os IDs são títulos navegáveis.

Não começar testes de campo sem identificar a versão de fato executada.
Um app de desenvolvimento ainda precisa do servidor: retirar Wi-Fi pode cortar
esse acesso, sem ser falha do Bluetooth. USB ou acesso por rede precisa estar
combinado antes, inclusive para conseguir alcançar as marcas medidas da trena.

Testes de assinatura, migração, conflitos de contas e condições técnicas não
reproduzíveis são assistidos. Este roteiro não autoriza instalação de APK,
limpeza de dados/histórico, mudança de firmware, desvinculação de contas ou
ligação de emergência. Não improvisar descarga/energia da Li-Po ou puxar soldas.

Se a condição não foi realmente atingida, não aprovar outra condição em seu
lugar. Anotar Bloqueado/Não testado e motivo. Tempos de observação não são uma
promessa de latência. Registrar separadamente buzzer, som do celular, vibração
e notificação; uma saída funcionando não aprova as demais.
