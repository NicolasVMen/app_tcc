# Fechamento do TCC — Escolta UNITAU

Atualização: 04/11/2026. Documento de trabalho, não monografia final aprovada.

## Decisões confirmadas pelo usuário

- Prioridade: concluir o TCC e depois estudar o produto comercial.
- Descrever a implementação real e o funcionamento confirmado, atualizando
  documentos divergentes. Não alterar o sistema para fazê-lo coincidir com texto antigo.
- Botão físico reparado, funcionando e aprovado na oficial, conforme relato
  recebido em 04/11; data exata do ensaio não informada.
- Não há novo ensaio de autonomia/descarga nem validação adicional de celular.
- Prazo ainda não confirmado; expectativa do usuário de entrega em meados de novembro.
- Preparar os slides após consolidar o texto, resultados e regras da apresentação.

## Critério de evidência

Código comprova o comportamento programado, não o desempenho físico universal.
Separar implementação, teste automatizado, ensaio físico registrado, aceite do
usuário e proposta futura. Divergências entre esses níveis devem ser explicitadas,
não apagadas. Registrar limitações sem inventar medições ou condições de ensaio.

A base documental de implementação é a oficial Android 1.0.1/code 2 e a variante
XIAO `xiao-p5-r4-d1-k2-w1`. O padrão de compilação do sketch não equivale
automaticamente à variante gravada. Consultar `../../firmware/README.md`.

Os 211 testes e a tipagem passaram na consulta de 04/11. Não significam nova
auditoria de cada arquivo, nova instalação ou validação de aparelhos diferentes.

## Fonte acadêmica identificada

No Drive informado, a consulta de 04/11 encontrou o Word
`TG_Escolta_UNITAU_ate_Capitulo_4.docx`, ID
`1DhnyRvAgA25Ioz3kZwKFdNv8MnQj-EA_`, modificado em 19/09/2026.
O texto consultado contém capítulo 4 parcial e capítulos 5/6 reservados.
A cópia local tem tamanho diferente: não assumir identidade dos dois arquivos
nem substituir a revisão do Drive silenciosamente pela local.

Pasta: https://drive.google.com/drive/folders/1UGO_XMJLBXCspP5rAv43jjrNf-x-vHKY

Preservar o original e suas revisões. Trabalhar em cópia de revisão identificada;
verificar comentários, imagens, tabelas e formatação antes de substituir a entrega.

## Roteiro da redação

1. **Capítulos 1–3:** revisar trabalhos relacionados e referências; objetivos e
   delimitação; distinguir a evolução histórica da configuração efetivamente ensaiada.
   Conferir a referência atribuída a Zhang e o DOI indicado no levantamento de autoria.
2. **Capítulo 4:** completar circuito e função dos componentes; alimentação;
   BLE/GATT; filtro e estados; watchdog; confirmação de segurança; controlador
   persistente e serviço Android; autenticação; recursos locais/externos; caixa montada.
3. **Capítulo 5:** consolidar método, versão, condições e resultados dos testes.
   Separar ensaios RSSI históricos, configuração final, testes funcionais e autonomia.
   Não apresentar limiares RSSI como garantia de 3/5 metros em qualquer ambiente.
4. **Capítulo 6:** responder aos objetivos, discutir limitações e continuidade.
   Produto, miniaturização, GPS e escala comercial são trabalhos futuros.
5. **Pré/pós-textuais e apresentação:** resumo/abstract coerentes; fontes,
   referências, títulos, legendas, sumário, paginação e revisão visual do PDF.

O caráter indutivo do buzzer não foi identificado por modelo/datasheet. Não
afirmar como comprovada a necessidade técnica do diodo para esse componente
específico. Descrever o circuito montado e a limitação de identificação.

## Autonomia

Planejar registro opcional conforme
`../testes/PROTOCOLO_AUTONOMIA_USO_2026-11-04.md`.
No momento, é proposta: não existe coletor de autonomia implementado, instalado
ou validado. O ciclo histórico de 11 h 10 min continua preliminar.

## Entregas e ordem

- [x] Registrar confirmação do botão e corrigir índices/status atuais.
- [x] Definir critérios de evidência e protocolo proposto para nova autonomia.
- [ ] Preparar e revisar a cópia atualizada do Word, preservando o original.
- [ ] Incorporar resultados da nova autonomia, se efetivamente coletados, ou registrar a pendência.
- [ ] Revisar referências e requisitos do template institucional.
- [ ] Gerar PDF e conferir todas as páginas, tabelas, figuras e paginação.
- [ ] Revisão pelos autores e orientador; resolver comentários.
- [ ] Sincronizar os entregáveis adequados no Drive e GitHub, com conferência.
- [ ] Preparar slides, roteiro de fala e perguntas prováveis da banca.

Não reescrever resumos/banners já apresentados como se tivessem empregado
configurações posteriores. Preservar entregas históricas do CICTED. Não publicar
automaticamente o levantamento de propriedade intelectual ou credenciais.
Nenhum envio ao Drive/GitHub foi realizado nesta etapa documental.

## Revisão e envio ao Drive concluídos em 04/11/2026

A situação acima descreve o início da etapa. Na continuação, foram produzidos
o Word atualizado e seu PDF, com capítulos 4–6 preenchidos, correções nos
capítulos 1–3, resumo/abstract revisados, sete quadros e três figuras. O gráfico
da campanha D1 foi gerado diretamente das 210 amostras originais; não é uma
nova coleta da configuração K2-W1.

O PDF final tem 41 páginas A4. As páginas foram renderizadas e inspecionadas
em pranchas; a extração textual não encontrou páginas vazias, texto fora da
página ou os principais trechos obsoletos procurados. Isso não equivale à
aprovação acadêmica nem à certificação integral de conformidade normativa.
Foi mantido o comentário do orientador; a conexão entre parágrafos foi
acrescentada sem marcar o comentário como resolvido em nome dele.

- [x] Preparar o Word técnico atualizado e preservar o original.
- [x] Atualizar campos e sumário no Word e gerar/conferir o PDF de 41 páginas.
- [x] Salvar Word e PDF na pasta indicada do Drive e conferir o conteúdo salvo.
- [ ] Revisão final pelos autores e orientador.
- [ ] Nova autonomia na configuração atual, se executada; resultado ainda ausente.
- Publicação dos novos entregáveis no GitHub autorizada pelo usuário após o
  envio ao Drive; conferir o commit remoto para confirmar a sincronização.
- [ ] Slides da defesa após a consolidação e definição do tempo de apresentação.

O arquivo Word foi atualizado no mesmo ID do documento principal, preservando
seu vínculo no Drive, e renomeado para corresponder à revisão. O original foi
copiado antes da substituição. Metodologia do 9º semestre, Word e PDF,
permaneceu intacta como documento histórico.

Word atual: https://docs.google.com/document/d/1DhnyRvAgA25Ioz3kZwKFdNv8MnQj-EA_/edit

PDF atual: https://drive.google.com/file/d/1Dv2qfMFWDSk-kZCphoBeKt73M8d9ED3b/view

Original preservado no Drive: https://docs.google.com/document/d/1C0j5G58N7m6qSRoE1vF-R-UvvfTtjTt5/edit

Arquivos locais: `TCC_Escolta_UNITAU_ATUALIZADO_2026-11-04.docx` e `.pdf`.
O Word do Drive foi relido após o envio, com 76.114 caracteres extraídos,
presença das novas seções e ausência de “Capítulo reservado”. Tamanhos remotos
conferidos: 994.727 bytes (Word) e 573.763 bytes (PDF), iguais aos locais.

SHA-256 local do Word: `909B485CAB4F5233AE6C394FB66F1030C15583591F4FAD5177AC2A94EE97AA76`.

SHA-256 local do PDF: `90DD477FE1E9A08984D9D40A024E016887176B2E72B5D371204CF15B42265E92`.

Não foi feita comparação binária por hash dos downloads posteriores do Drive;
a verificação remota foi por metadados e leitura do conteúdo do Word. Nenhum
APK, firmware ou regra de proteção foi alterado. O coletor de autonomia é
somente proposta documentada, não recurso implementado ou instalado.
