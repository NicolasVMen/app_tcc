# Registro de autonomia A1 — implementação de 05/11/2026

Situação: implementado no código e verificado por testes automatizados. **Ainda
não compilado, instalado ou validado no Samsung; não há resultado de autonomia
desta implementação.** A oficial 1.0.1 instalada e o firmware não foram alterados.

Complementa o [planejamento de 04/11](PROTOCOLO_AUTONOMIA_USO_2026-11-04.md).
A descrição histórica de planejamento naquela data permanece válida.

## O que registra

- Tensão e percentual estimado do vestível, firmware, versão do aplicativo,
  modelo/sistema do telefone, horários UTC e tempo monotônico da execução.
- Estado comunicado pela placa: protegido, atenção, emergência ou espera.
  Emergência do aplicativo e pânico da placa são campos separados.
- USB e carregamento, desconexão, dados antigos, lacunas, mudanças de relógio,
  início/fim e interrupção entre execuções.
- Uma linha por minuto com nova telemetria, mais linhas nos eventos/marcações.
  O tempo por estado é integrado entre observações próximas, não só por minuto.
- Política prevista do buzzer nos firmwares K2 e K2-W1. Isso **não mede áudio,
  corrente, capacidade em mAh nem tempo elétrico efetivo de acionamento**.

Marcar uma etapa pretendida não muda o estado real, não aciona alarmes e não
confirma segurança. Atenção e emergência acontecem pelo fluxo normal já existente.
O registro não cria leituras/escritas BLE, temporizadores ou mudanças de potência,
limiares, firmware e frequência de telemetria.

Em um ciclo misto, as linhas permitem relacionar duração, estado e tensão. Não se
pode afirmar “este alarme consumiu X mAh” a partir disso. A leitura de tensão do
firmware é periódica/filtrada e não captura necessariamente o pico do buzzer.
Comparar consumo elétrico por estado exige medição apropriada; comparar duração
operacional exige ciclos com condições e perfis de alerta documentados.

## Critérios de integridade

- Coleta explicitamente iniciada, nunca ao fazer login/abrir a tela.
- Observações com intervalo maior que 5 s ou mudança inconsistente de relógio
  não contam como tempo comprovado em bateria/protegido.
- USB/carga ausente na mensagem é informação desconhecida, não `false`.
- USB conectado é contado à parte; não entra no tempo observado de descarga.
- Processos encerrados são marcados como interrompidos no último registro salvo;
  não há continuidade presumida durante a ausência do coletor.
- Armazenamento por conta, gravações serializadas, sem substituição de dados
  ilegíveis. Erro de escrita interrompe a coleta, informa o usuário e permite
  exportar o que restou em memória. Isso não encerra a proteção.
- Até 10 execuções, até 3.000 linhas por execução; exportar regularmente. Espaço
  disponível e limites do armazenamento também podem encerrar a gravação antes.
- CSV em UTF-8, por arquivo, sem nomes, e-mails ou localização. Exportação manual,
  sem upload automático. Fechar o seletor não comprova recebimento do arquivo.

## Ativação e publicação

`EXPO_PUBLIC_ENABLE_BATTERY_STUDY=true` é uma opção de compilação independente
das ferramentas internas de teste. Também exige o controlador validado.

- Perfil EAS `oficial-validada`: coleta explicitamente desabilitada.
- Perfil EAS `autonomia-instrumentada`: herda identidade, assinatura remota,
  Firebase e controlador da oficial validada, habilitando somente o registro A1.
- `EXPO_PUBLIC_ENABLE_INTERNAL_TOOLS` permanece `false`; simulações e testes
  ativos antigos não são liberados por esse perfil.

**Antes de compilar/instalar a candidata**, preservar o APK oficial 1.0.1, definir
uma nova versão identificável e verificar o versionCode remoto. O nome A1 nos
CSVs não substitui versionamento do APK. Não substituir a oficial sob o mesmo
número de versão. Confirmar espera/silêncio antes da instalação, não retomar a
proteção automaticamente e conferir assinatura/Firebase antes de atualizar.

O código fonte continua com versão 1.0.1 enquanto não se prepara essa candidata.
Nenhum build ou instalação A1 foi executado nesta etapa.

## Validação física necessária antes do ciclo longo

1. Em espera, abrir o registro e confirmar que ele está parado e sem coleta
   automática. Confirmar que a tela rola e abre/fecha normalmente.
2. Com placa conectada, iniciar a coleta. Manter USB por cerca de 1 minuto e
   retirar **somente o USB da placa**. Verificar no CSV a separação entre USB,
   transição e tempo em bateria; o telefone pode permanecer no carregador.
3. Retomar a proteção pelo fluxo normal e manter perto por cerca de 2 minutos.
   Marcar “Protegido” não deve alterar alarmes ou gerar comandos à placa.
4. Provocar brevemente atenção e emergência por afastamento supervisionado,
   sem usar criança. Voltar, confirmar segurança pelo fluxo normal e verificar
   eventos/estados, sem expectativa de medir o consumo instantâneo desses bipes.
5. Bloquear a tela por 2 minutos e retornar. A proteção precisa continuar normal;
   o CSV deve mostrar observações contínuas ou lacunas honestamente identificadas.
6. Encerrar somente a coleta. Salvar registros e resumo; abrir os arquivos e
   conferir acentos, início/fim, tensão, estados e tempos separados. A proteção
   não deve parar só porque a coleta foi encerrada.
7. Reabrir o app e conferir persistência. Em uma coleta curta separada, encerrar
   o processo e reabrir para verificar marcação de interrupção, sem auto-início.
8. Confirmar isolamento de contas sem apagar os arquivos originais.

Após aprovação, seguir o protocolo de uso até o limite operacional de 10%
estimados, sem forçar descarga até desligamento. Registrar condições e repetir
ciclos quando possível. Resultados reais, não esta implementação, alimentarão o TCC.

## Verificação automatizada

Executar `npm run typecheck` e `npm test`. Os testes cobrem sessão/relógios,
USB e dados ausentes, eventos, persistência, falhas e corrida de gravação,
isolamento por instância, opt-in, cache passivo BLE e transporte CSV por arquivo.
Testes simulados não substituem a validação física acima.

Arquivos principais: `src/utils/autonomyStudy.ts`,
`src/services/autonomyRecorder.ts`, `src/services/autonomyRegistry.ts`,
`src/services/autonomyExport.ts` e `src/screens/AutonomyStudyModal.tsx`.
