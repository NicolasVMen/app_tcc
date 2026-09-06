# Escolta UNITAU

Protótipo acadêmico funcional de monitoramento de proximidade infantil por Bluetooth Low Energy, desenvolvido como Trabalho de Conclusão de Curso em Engenharia da Computação na Universidade de Taubaté (UNITAU).

> O Escolta UNITAU não é um produto comercial, equipamento certificado nem substituto da supervisão de um responsável. As distâncias exibidas são estimativas experimentais baseadas em RSSI e podem variar conforme o ambiente, obstáculos, corpo humano e características do celular.

## Objetivo

O protótipo investiga como um dispositivo vestível BLE e um aplicativo móvel podem ajudar o responsável a perceber afastamentos e acionamentos manuais de emergência. A experiência foi desenhada para apresentar os estados de maneira simples, sem afirmar direção ou localização exata da criança.

## Estado atual

_Atualizado em 6 de setembro de 2026._

- Aplicativo React Native com Expo SDK 54 e TypeScript.
- Autenticação de acesso com Firebase.
- Conexão automática ao dispositivo `ESCOLTA_BLE`.
- Sentinela com tentativa imediata de reconexão e janela de tolerância antes da emergência.
- Sirene e vibração locais, com confirmação humana para encerrar a emergência.
- Distância estimada na Central; RSSI restrito ao código técnico/Telemetria.
- Histórico de ocorrências persistido localmente.
- Preferências de tema, reconexão, alertas, vibração, animações e localização opcional.
- E-mail de emergência mantido como canal experimental para ensaios controlados.
- Telemetria preservada no código, mas fora da navegação comum.

O hardware vestível já utiliza a **Seeed Studio XIAO nRF52840 Sense**. O circuito foi montado, soldado e validado com buzzer ativo, transistor P2N2222A, resistores de 1 kΩ e 10 kΩ, diodo 1N4007 e botão físico de emergência. A bateria LiPo 3,7 V/180 mAh possui proteção PCM/BMS confirmada e sua ligação ao conector é a última etapa elétrica pendente.

Após a validação da alimentação pela bateria, a próxima etapa será projetar e imprimir em 3D uma estrutura compacta que permita testar o protótipo como pulseira ou broche. O motor de vibração foi retirado do escopo atual para reduzir volume, consumo e complexidade de montagem.

### Situação do hardware

- [x] XIAO nRF52840 Sense programada e reconhecida pelo aplicativo.
- [x] Comunicação BLE e comandos do buzzer validados.
- [x] Transistor, resistores, diodo e buzzer soldados.
- [x] Botão físico de emergência soldado e validado.
- [ ] Soldar e isolar o conector da bateria LiPo.
- [ ] Repetir os ensaios completos alimentando o dispositivo somente pela bateria.
- [ ] Medir autonomia e comportamento durante recarga.
- [ ] Definir dimensões e encaixes da estrutura vestível.
- [ ] Imprimir e validar os modelos de pulseira e/ou broche.

## Navegação

- **Central:** estado atual, núcleo de proteção, distância estimada e cobertura do protótipo.
- **Protocolo:** orientações de uso e conduta durante atenção ou emergência.
- **Registros:** linha do tempo dos eventos relevantes.
- **Sistema:** perfil, criança, preferências, privacidade e canal experimental.

## Arquitetura resumida

```mermaid
flowchart LR
    Device["Dispositivo vestível BLE"] <-->|"Telemetria e comandos"| App["Aplicativo Escolta UNITAU"]
    App --> Auth["Firebase Authentication"]
    App -.->|"Opcional e experimental"| Email["EmailJS"]
    Phone["Localização do celular responsável"] -.->|"Somente se autorizada em emergência"| App
```

O Telegram não integra mais o fluxo ativo porque um token dentro do aplicativo seria extraível. Uma evolução profissional de contatos de confiança deverá usar backend autenticado e notificações push.

## Estrutura principal

```text
src/
├── context/
│   └── AppPreferencesContext.tsx
├── hooks/
│   └── useEsp32Monitor.ts
├── screens/
│   ├── AlertsScreen.tsx
│   ├── AuthScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── ManualScreen.tsx
│   ├── PatrolScreen.tsx       # Telemetria preservada, fora da navegação
│   └── SettingsScreen.tsx
├── services/
│   ├── bleApi.ts
│   └── firebaseConfig.ts
└── theme.ts
```

Os fluxos e critérios de experiência estão documentados em:

- [`docs/ESPECIFICACAO_PRODUTO_ESCOLTA_UNITAU.md`](docs/ESPECIFICACAO_PRODUTO_ESCOLTA_UNITAU.md)
- [`docs/FLUXOS_CENTRAL_SENTINELA.md`](docs/FLUXOS_CENTRAL_SENTINELA.md)
- [`docs/imagens_montagem/01-transistor-resistores.png`](docs/imagens_montagem/01-transistor-resistores.png)
- [`docs/imagens_montagem/02-circuito-completo.png`](docs/imagens_montagem/02-circuito-completo.png)

## Execução

O BLE depende de código nativo e não funciona no Expo Go. Use um aparelho físico com development build:

```bash
npm install
npx expo run:android
```

Para iOS, será necessário um ambiente macOS com Xcode:

```bash
npx expo run:ios
```

## Autores

- Nicolas Venciguerra Men
- Rafael Gonçalves Dedini
- Engenharia da Computação — UNITAU

## Terminologia para apresentação

Use **protótipo acadêmico funcional**, **prova de conceito integrada**, **resultados dos ensaios** e **evolução futura**. Evite apresentar o sistema como produto pronto, solução infalível, rastreador ou dispositivo certificado.
