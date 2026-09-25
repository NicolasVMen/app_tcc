# Caixa 3D do ESCOLTA — versão 1

Esta é a primeira caixa de teste para o conjunto já soldado. O objetivo da V1 é validar fisicamente os encaixes antes de reduzir o volume.

## Dimensões adotadas

- Conjunto acomodado: **55 × 40 × 25 mm**.
- Espaço interno nominal: **57 × 42 × 27 mm**.
- Corpo sem passantes: **61 × 46 × 31 mm**, incluindo a tampa.
- Passantes laterais: pulseira ou fita de até **20 mm** de largura.
- Paredes e fundo: **2 mm**.

Os passantes acrescentam aproximadamente 5,5 mm em cada lateral do eixo de 46 mm. O tamanho máximo, incluindo os passantes, fica próximo de **61 × 57 × 31 mm**. O eixo de 61 mm acompanha o braço; os passantes ficam à esquerda e à direita e permitem que a fita passe por baixo da caixa.

## Disposição interna da V1

- Bateria em quatro guias baixas, sem aperto sobre a bolsa LiPo.
- Buzzer deitado em um berço em U, girado para que a face sonora fique alinhada a sete furos pequenos na parede curta oposta ao USB-C.
- XIAO nivelada em um berço elevado, com quatro apoios, espaço livre para pinos/fios e presilhas laterais.
- Conector da bateria e fios na área central livre.
- Conector branco preso em berço aberto nas duas pontas, com lábios de retenção.
- Três trechos de canal totalmente abertos por cima encaminham os chicotes.
- Em cada trecho, um ponto de encaixe segura os fios por pressão lateral; nenhum fio soldado precisa atravessar um arco fechado.
- Botão encaixado sob a tampa e retido por duas pequenas linguetas, com acesso pelo lado externo.
- USB-C acessível por uma abertura de 10,5 × 5,2 mm na altura definida pelo berço.

## Como abrir o modelo

Abra `escolta_case_v1.scad` no OpenSCAD. No início do arquivo, altere:

```scad
part = "assembly";
```

para uma das opções:

- `"assembly"`: visualização da montagem;
- `"base"`: base pronta para exportar;
- `"lid"`: tampa orientada para impressão.

Use **F6** para renderizar e depois **File > Export > Export as STL**.

Os arquivos já exportados para a primeira impressão são:

- `escolta_base_v1.stl`;
- `escolta_tampa_v1.stl`.

O script `validate_stl.py` confere as dimensões e se as malhas estão fechadas sem depender de bibliotecas externas.

## Sugestão para a primeira impressão

- Material: PLA.
- Camada: 0,20 mm.
- Paredes: 3 linhas.
- Preenchimento: 15% a 20%.
- Suportes: desativados para base e tampa nas orientações fornecidas.
- Imprima primeiro sem os componentes; remova rebarbas antes do teste de encaixe.

## Limitações conhecidas

- A largura exata do conector branco ainda foi estimada em 7 mm.
- A altura do berço e da abertura USB-C deve ser confirmada na primeira impressão de encaixe.
- A V1 não é impermeável: USB-C, botão e os pequenos furos sonoros laterais continuam sendo pontos de entrada de água.
- Não force, comprima, perfure nem cole a bateria dentro da caixa.
- A redução para uma versão realmente compacta dependerá do teste impresso e, provavelmente, da futura remoção dos pinos longos da XIAO.
