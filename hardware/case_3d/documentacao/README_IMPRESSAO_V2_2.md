# ESCOLTA UNITAU — pacote de impressão V2.2

Revisão dimensional fechada em 15/09/2026. Não misturar estas peças com STL de
revisões anteriores e não alterar a escala.

## Arquivos finais

- `escolta_base_v2_2.stl`
- `escolta_tampa_v2_2.stl`
- `escolta_botao_reforcado_v2_2.stl`
- `escolta_trava_botao_reforcada_v2_2.stl`

## Dimensões conferidas nas malhas

- Base com passantes: 61 × 57 × 33 mm.
- Tampa na orientação de impressão: 61 × 46 × 10,2 mm.
- Prolongador: 9 × 9 × 7,8 mm.
- Trava em C: 8,33 × 8,60 × 1,50 mm.

Todas as quatro malhas foram verificadas: zero triângulos degenerados, zero
arestas inválidas, um único corpo conectado por arquivo e volume fechado.

## Estratégia de impressão

### Etapa 1 — prova obrigatória do botão

Imprimir primeiro:

1. `escolta_tampa_v2_2.stl`
2. `escolta_botao_reforcado_v2_2.stl`
3. `escolta_trava_botao_reforcada_v2_2.stl`

Para o prolongador e a trava: PETG, bico 0,4 mm, camada 0,12 mm, quatro
paredes, 100% de preenchimento e sem suportes. Usar escala de 100%. Um brim
fino é aceitável, desde que seja removido por completo. Para a tampa: camada
0,20 mm, três paredes e 20% de preenchimento.

Montar e executar os critérios de `INSTRUCOES_TESTE_BOTAO_V2_2.md`. Somente
após a aprovação do clique, retorno e retenção seguir para a base.

### Etapa 2 — base

Imprimir `escolta_base_v2_2.stl` em PLA ou PETG, bico 0,4 mm, camada 0,20 mm,
três paredes e 20% de preenchimento, na orientação fornecida e sem escala.

## Parâmetros críticos do botão

- Furo da tampa: 4,8 mm.
- Haste: 4,2 mm; folga radial nominal: 0,30 mm.
- Curso nominal: 0,4 mm.
- Canal da trava: diâmetro 3,2 mm × altura 1,8 mm.
- Trava: 1,2 mm de espessura, diâmetro interno 3,7 mm, entrada afunilada e
  diâmetro externo 8,6 mm, maior que o furo de 4,8 mm.
- Ombro inferior: diâmetro 4,2 mm × altura 0,5 mm; atravessa o furo e retém o
  C no canal.
- Pino central: diâmetro 3,0 mm × altura 0,5 mm.

O encaixe é mecânico. Não aplicar cola antes da prova funcional.
