# Caixa atual e alternativas de rádio BLE

Investigação solicitada após as coletas a 1 m com e sem braço entre os dispositivos. Não modificar posição da antena nem reimprimir a caixa. Nenhuma alteração funcional, instalação, gravação ou atualização de biblioteca foi realizada nesta investigação.

## Geometria conferida no projeto

Fonte: `hardware/case_3d/escolta_case_v2.scad`, especialmente parâmetros XIAO e `mock_components`.

- XIAO na borda longa, comprimento paralelo a Y, componentes voltados à parede X=0; USB-C na parede Y=0.
- Zona ilustrativa da antena: X=12,8–14,8; Y=18,1–23,1; Z=8,6–22,4 mm. É um marcador aproximado, não o desenho eletromagnético da antena real.
- Torres/cinta terminam antes da zona indicada: guarda termina em Y=17,33, antena começa em Y=18,1. Separação longitudinal da guarda: 0,77 mm. A cinta de 3,6 mm termina em Y=17,03.
- Bateria começa em X=34,5, distante da região indicada da antena.
- Bloco de fios/resistores/diodo começa em Y=24,5: separação longitudinal de 1,4 mm da extremidade da placa/antena. Seu volume aproximado ocupa Z=2,3–13 mm, parcialmente sobreposto à altura da zona da antena, mas não ao seu volume em Y.
- Não há bateria, buzzer ou torre metálica modelada cobrindo diretamente essa zona. O desenho simplifica a blindagem da placa e as soldas/fios; não representa cada condutor real nem caracteriza material do filamento ou padrão de radiação.

Conclusão mecânica: não foi encontrada justificativa no CAD para exigir reposicionar a placa. Não se certifica desempenho RF a partir desses espaços geométricos. A proximidade do bloco de fios é observada, não declarada como causa dos alertas.

## Software efetivamente usado

A compilação p5 preservada em `.expo/proximity-p5-teste/build.options.json` e `libraries.cache` usa `Seeeduino:mbed:xiaonRF52840Sense`, núcleo Mbed Seeeduino 2.9.3 e `Documents/Arduino/libraries/ArduinoBLE`, versão instalada 2.1.0.

O sketch chama `BLE.begin`, configura serviço/nome/características e anuncia. Não configura explicitamente potência, PHY ou intervalos de conexão.

Em `variants/SEEED_XIAO_NRF52840_SENSE/mbed_config.h`, `MBED_CONF_CORDIO_PREFERRED_TX_POWER=0` e `BLE_FEATURE_PHY_MANAGEMENT=1`. O primeiro é a configuração padrão do núcleo, NÃO uma leitura da potência efetiva de um enlace em funcionamento. O binário existente também foi inspecionado; não foi obtido valor runtime de potência/PHY.

A interface pública `BLELocalDevice.h` do ArduinoBLE instalado não expõe `BLE.setTxPower` nem configuração PHY. O controlador Cordio incluído possui declarações para:

- `LlSetAdvTxPower` / `LlGetAdvTxPower`: advertising apenas.
- `LlGetTxPowerLevel`: consulta de potência do enlace.
- `LlSetAllPhyTxPowerLevel` / `LlSetPhyTxPowerLevel`: potência de uma conexão, com handle e status de retorno.
- `LlSetDefaultPhy`, `LlSetPhy`, `llValidatePhySupport`: preferências/capacidades PHY.

Essas interfaces internas são possibilidades técnicas identificadas, não uma implementação já compilada/testada. Sua integração exige sincronização com o controlador Cordio e a conexão correta; não usar gravação direta de `NRF_RADIO->TXPOWER` concorrendo com o stack. Alterar apenas advertising não configura necessariamente a transmissão durante a conexão que o celular mede.

O aplicativo usa react-native-ble-plx ^3.5.1, mede RSSI no celular aproximadamente a cada 500 ms e o envia à placa. A API JS instalada não expõe `readPhy`/`setPreferredPhy`. Android oferece essas operações na camada BluetoothGatt, mas exigiria integração nativa usando o mesmo GATT, sem abrir uma segunda conexão paralela para mudar parâmetros.

O Samsung foi encontrado autorizado por ADB. Consulta somente leitura a `dumpsys bluetooth_manager` mostrou registros de varredura 1M/Coded, mas não comprovou suporte a Coded PHY nem qual PHY a conexão Escolta negocia. Essas informações precisam de consulta explícita e confirmação da negociação; não inferir compatibilidade apenas por ser Galaxy S24 Ultra ou Bluetooth 5.x.

## Alternativas e limites

1. **Potência de transmissão fixa maior.** O nRF52840 suporta até +8 dBm. Consultar potência atual e máxima do enlace, depois comparar perfis isolados +4 e +8 dBm. Configurar e ler de volta a potência da conexão, além do advertising. Pode melhorar margem de sinal no sentido placa→celular, mas aumenta consumo e não muda automaticamente a transmissão do celular→placa.
2. **LE Coded PHY, preferencialmente S8 como ensaio separado.** Hardware nRF52840 suporta o modo de 125 kbps. Maior robustez de recepção com menos velocidade e mais tempo de rádio por pacote. É preciso validar suporte no firmware/controlador e telefone, pedir a negociação e ler PHY TX/RX efetivo. Se não negociado, manter fallback seguro 1M. Não prometer que ele eleva RSSI ou distingue braço de distância.
3. **Intervalos de conexão, advertising, MTU e 2M.** Podem mudar descoberta, latência, capacidade e consumo. Não são amplificadores do sinal nem medidores de distância. Como não houve desconexão relatada nas coletas, não são a primeira intervenção para este amarelo. Não alterar supervision timeout para esconder perda real do enlace.
4. **Tecnologias de medição de distância.** Bluetooth Channel Sounding emprega fase/tempo, não somente RSSI. O nRF52840 atual não suporta esse recurso. Seria outra arquitetura com dispositivos compatíveis nos dois lados. A biblioteca proprietária Nordic Distance Measurement para determinados nRF52 não é equivalente a uma função de ranging BLE disponível no Samsung; não apresentá-la como solução por atualização simples do app.

## Por que potência maior não prova proximidade

Um ganho aproximadamente fixo de transmissão desloca RSSI tanto perto quanto longe. Pode evitar atingir os limites atuais, mas também deslocar os pontos de alerta reais e fazer a fórmula atual indicar distâncias menores. Reavaliar referência da estimativa, limiares e autonomia é obrigatório; não adicionar correção arbitrária à distância para aparentar melhora.

As coletas já mostraram RSSI médio de -83,17 dBm a 1 m com braço, -83,20 a 3 m e -83,93 a 5 m na campanha anterior. Potência fixa maior não elimina essa sobreposição. Coded aumenta margem de recepção, mas também não transforma RSSI em distância física confiável.

Ordem recomendada, ainda não executada: diagnóstico runtime de potência/PHY; ensaio de potência fixa com identificação própria e retorno ao p5; avaliar Coded separadamente se suportado; somente depois revisar interpretação das leituras e critérios de atenção. Preservar botão, perda de conexão, retenção da emergência e confirmação com resposta real da placa. Não substituir APK oficial.

Atualização de 14/10: a primeira etapa de diagnóstico runtime foi executada em variante somente leitura. Reportou potência atual da conexão 0 dBm, advertising 0 dBm e PHY TX/RX LE 1M. O retorno máximo de 20 dBm foi conferido no binário e é constante genérica do stack, não capacidade física do chip. Ver `DIAGNOSTICO_RADIO_P5_2026-10-14.md` para pacote/hash, valores, limitações e proposta de +4 dBm ainda não implementada. As demais etapas acima permanecem não executadas.

## Fontes primárias

- [Nordic: especificação nRF52840, potência e sensibilidade](https://docs.nordicsemi.com/r/bundle/ps_nrf52840/page/keyfeatures_html5.html).
- [Nordic: características elétricas do rádio](https://docs.nordicsemi.com/r/bundle/ps_nrf52840/page/radio.html).
- [Android: BluetoothGatt, leitura/negociação de PHY](https://developer.android.com/reference/android/bluetooth/BluetoothGatt#setPreferredPhy(int,int,int)).
- [Android: consulta de suporte a LE Coded](https://developer.android.com/reference/android/bluetooth/BluetoothAdapter#isLeCodedPhySupported()).
- [Bluetooth SIG: Channel Sounding](https://www.bluetooth.com/learn-about-bluetooth/feature-enhancements/channel-sounding/).
- [Nordic: limitações de ranging do nRF52840](https://devzone.nordicsemi.com/f/nordic-q-a/125905/bluetooth-trilateration-and-direction-tracking-using-nrf52840).
