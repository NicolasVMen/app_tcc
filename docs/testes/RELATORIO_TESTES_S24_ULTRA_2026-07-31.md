# Relatório de testes funcionais — Escolta UNITAU

**Data:** 31/07/2026

**Dispositivo:** Samsung Galaxy S24 Ultra

**Sistema:** One UI 8.5

**Aplicativo:** Escolta UNITAU 1.0.0

**Hardware:** ESP32 DevKit V1

**Natureza:** ensaio de protótipo acadêmico funcional

## Resultado geral

| Classificação | Quantidade |
|---|---:|
| Aprovados | 27 |
| Parciais | 8 |
| Reprovados por limitação conhecida de segundo plano | 4 |
| Adiados para o hardware definitivo | 3 |
| Total | 42 |

O ensaio validou a navegação, autenticação, preferências, conexão BLE, estados de proximidade, reconexão em primeiro plano, emergência, registros, localização opcional e comportamento sem internet. Os testes 38 a 41 comprovaram que o monitoramento não permanece confiável quando o Android suspende ou encerra o processo; portanto, segundo plano não deve ser apresentado como recurso concluído.

## Classificação por teste

| Teste | Resultado | Síntese |
|---:|---|---|
| 1–4 | Aprovado | Acesso, validações, cadastro e credenciais funcionaram. |
| 5 | Parcial | Recuperação funcionou; template do e-mail precisa de revisão visual e de idioma no Firebase. |
| 6 | Aprovado | Navegação entre as quatro áreas funcionou. |
| 7 | Parcial | Botão Voltar encerrava o app em qualquer aba; deve retornar à Central antes de sair. |
| 8–9 | Aprovado | Temas e redução de animações funcionaram. |
| 10 | Parcial | Iniciais do responsável só atualizavam após troca de aba. |
| 11 | Aprovado com ajuste | Cadastro funcionou; ausência de nome deve usar “Criança”. |
| 12 | Parcial | Controles cosméticos dispensam confirmação; vibração, por afetar emergência, deve explicar o impacto ao ser desativada. |
| 13 | Parcial | Área acadêmica funcionou; “Telemetria” precisava de explicação em linguagem comum. |
| 14–19 | Aprovado | Busca sem placa, permissões, conexão automática/manual e persistência entre abas funcionaram. |
| 20–21 | Adiado | Calibração e obstáculos serão repetidos com a placa definitiva. |
| 22–23 | Aprovado | Alcance reduzido e recuperação curta funcionaram. |
| 24 | Parcial | Emergência funcionou; tempo decorrido e estado após confirmação sem vínculo precisavam ser aprimorados. |
| 25–27 | Aprovado | Continuidade do alerta, confirmação humana e reconexão posterior funcionaram. |
| 28 | Adiado | Pânico físico depende do conjunto definitivo. |
| 29–34 | Aprovado | Preferências, localização, e-mail experimental e falha de internet foram tratadas. |
| 35 | Parcial | Horários precisavam de pt-BR, formato 24 horas e referência a Brasília. |
| 36 | Parcial | Compartilhamento precisava de prévia e relatório mais legível. |
| 37 | Aprovado | Limpeza de registros funcionou. |
| 38–41 | Reprovado | Android suspendeu ou encerrou o monitoramento em segundo plano, tela bloqueada, recentes e economia de bateria. |
| 42 | Aprovado | Uso prolongado inicial sem anomalias percebidas. |

## Correções derivadas deste ensaio

- botão Voltar retorna à Central antes de permitir saída;
- iniciais do responsável atualizam imediatamente;
- ausência de nome usa “Criança”;
- desativação de vibração exige confirmação informada;
- Telemetria recebe explicação em linguagem comum;
- tempo decorrido passa a minutos e horas;
- confirmação sem reconexão gera estado persistente “Sem cobertura”, sem repetir sirene já reconhecida;
- horários são gerados em `pt-BR`, 24 horas e fuso de Brasília;
- relatório possui prévia e separação visual entre ocorrências.

## Pendências prioritárias

1. Implementar serviço Android em primeiro plano com notificação persistente.
2. Retestar segundo plano, tela bloqueada, remoção dos recentes e economia de bateria.
3. Finalizar a identidade visual em português do template de recuperação no Firebase Console; o aplicativo já solicita `pt-BR` ao Firebase.
4. Repetir calibração de distância e pânico físico com a XIAO nRF52840 Sense.
5. Executar ensaios prolongados de uma, duas e quatro horas.

## Conclusão

O protótipo apresentou funcionamento satisfatório em primeiro plano no Galaxy S24 Ultra. A principal limitação confirmada é a ausência de execução Android persistente em segundo plano. Essa limitação está documentada e será tratada como etapa de engenharia própria, não como funcionalidade já disponível.
