import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { TrialHistoryStore, MAX_TRIAL_RUNS } from '../services/trialHistory';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { AppColors } from '../theme';
import { subscribeProximityTelemetry } from '../services/bleApi';
import { exportTrialCsv } from '../services/proximityExport';
import { TrialExportFormat, TrialExportScope } from '../utils/proximityExport';
import { withTimeout } from '../utils/asyncTimeout';
import { INTERNAL_TOOLS_ENABLED } from '../services/nativeIdentity';
import {
  appendTrialPacket, canStartTrial, createTrial, isFreshPacket, MAX_GAP_MS, SETTLE_MS,
  summarizeTrial, TrialPacket, TrialRun, TRIAL_SAMPLES,
} from '../utils/proximityTrial';

const MAX_RUNS = MAX_TRIAL_RUNS;
const TRIAL_DISTANCES = Array.from({ length: 15 }, (_, index) => index + 1);

export default function ProximityTrialModal({ visible, onClose, connected, standby, panic }: {
  visible: boolean; onClose: () => void; connected: boolean; standby: boolean; panic: boolean;
}) {
  const { colors, accountUid } = useAppPreferences();
  const history = useMemo(() => new TrialHistoryStore(accountUid ?? ''), [accountUid]);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [distance, setDistance] = useState(1);
  const [height, setHeight] = useState('');
  const [condition, setCondition] = useState('Sem obstáculos; caixa fechada; mesma altura e orientação');
  const [live, setLive] = useState<TrialPacket | null>(null);
  const [current, setCurrent] = useState<TrialRun | null>(null);
  const [runs, setRuns] = useState<TrialRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [exporting, setExporting] = useState(false);
  const [exportScope, setExportScope] = useState<TrialExportScope>('history');
  const [exportFormat, setExportFormat] = useState<TrialExportFormat>('samples');
  const [exportMessage, setExportMessage] = useState('');
  const exportRef = useRef(false);
  const mountedRef = useRef(true);
  const currentRef = useRef<TrialRun | null>(null);
  const liveRef = useRef<TrialPacket | null>(null);
  const runsRef = useRef<TrialRun[]>([]);
  const lastFreshRef = useRef(0);
  const lastSampleIdRef = useRef(0);
  const writesRef = useRef(Promise.resolve());

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadHistory = useCallback(async () => {
    if (!INTERNAL_TOOLS_ENABLED) return;
    setLoaded(false);
    setLoadingHistory(true);
    try {
      const stored = await history.load();
      if (!mountedRef.current) return;
      runsRef.current = stored;
      setRuns(stored);
      setLoadError(false);
      setLoaded(true);
    } catch {
      if (mountedRef.current) setLoadError(true);
    } finally {
      if (mountedRef.current) setLoadingHistory(false);
    }
  }, [history]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const finish = useCallback((reason: string) => {
    const run = currentRef.current;
    if (!run) return;
    const finished = { ...run, endedAt: run.endedAt ?? Date.now(), stopReason: run.stopReason ?? reason };
    currentRef.current = null;
    setCurrent(finished);
    const saved = [...runsRef.current, finished].slice(-MAX_RUNS);
    runsRef.current = saved;
    setRuns(saved);
    const write = history.save(saved);
    writesRef.current = write;
    void write.then(() => {
      if (mountedRef.current) setStorageError(false);
    }, () => {
      if (mountedRef.current) setStorageError(true);
    });
  }, [history]);

  useEffect(() => {
    if (!INTERNAL_TOOLS_ENABLED || !visible) return;
    liveRef.current = null;
    setLive(null);
    return subscribeProximityTelemetry(packet => {
      liveRef.current = packet;
      setLive(packet);
      setNow(Date.now());
      const run = currentRef.current;
      if (!run) return;
      if (!packet.active) { finish('interrompido: proteção em espera'); return; }
      if (packet.receivedAt - lastFreshRef.current > MAX_GAP_MS) {
        finish('interrompido: mais de 5 s sem leitura nova'); return;
      }
      if (isFreshPacket(packet, Date.now()) && packet.sampleId > lastSampleIdRef.current) {
        lastFreshRef.current = packet.receivedAt;
        lastSampleIdRef.current = packet.sampleId;
      }
      if (packet.receivedAt - run.startedAt > SETTLE_MS + 60000) {
        finish('interrompido: tempo máximo de coleta'); return;
      }
      const next = appendTrialPacket(run, packet);
      if (next !== run) {
        currentRef.current = next;
        setCurrent(next);
        if (next.endedAt !== null) finish('concluído');
      }
    });
  }, [visible, finish]);

  useEffect(() => {
    if (!INTERNAL_TOOLS_ENABLED || !visible) return;
    const interval = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (currentRef.current && time - lastFreshRef.current > MAX_GAP_MS) {
        finish('interrompido: mais de 5 s sem leitura nova');
      }
    }, 500);
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') finish('interrompido: aplicativo saiu do primeiro plano');
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [visible, finish]);

  useEffect(() => {
    if (!connected || standby) {
      liveRef.current = null;
      setLive(null);
      finish(!connected ? 'interrompido: conexão perdida' : 'interrompido: proteção em espera');
    }
  }, [connected, standby, finish]);

  const close = () => {
    if (exportRef.current) return;
    if (currentRef.current) {
      Alert.alert('Interromper ensaio?', 'As leituras já coletadas serão guardadas como ensaio incompleto.', [
        { text: 'Continuar', style: 'cancel' },
        { text: 'Interromper e sair', onPress: () => { finish('interrompido pelo usuário'); onClose(); } },
      ]);
    } else onClose();
  };

  const start = () => {
    if (!INTERNAL_TOOLS_ENABLED) return;
    if (!loaded || currentRef.current || exportRef.current) return;
    if (!canStartTrial({ loaded, connected, standby, foreground: AppState.currentState === 'active',
      collecting: currentRef.current !== null, packet: liveRef.current, now: Date.now() })) {
      Alert.alert('Ensaio indisponível', 'Conecte a placa, retome a proteção se estiver em espera e aguarde uma leitura nova. O alerta ativo não bloqueia o ensaio.');
      return;
    }
    const time = Date.now();
    const parsedHeight = height.trim() ? Number(height.replace(',', '.')) : null;
    if (parsedHeight !== null && (!Number.isFinite(parsedHeight) || parsedHeight < 0 || parsedHeight > 5)) {
      Alert.alert('Altura inválida', 'Informe a altura em metros, entre 0 e 5, ou deixe em branco.');
      return;
    }
    const run = createTrial(distance, condition.trim(), time, {
      firmware: liveRef.current?.firmware ?? null,
      phone: Platform.OS === 'android' ? Platform.constants.Model : 'não informado',
      platform: `${Platform.OS} ${Platform.Version}`, heightM: parsedHeight, app: '1.0.0',
    });
    lastFreshRef.current = time;
    lastSampleIdRef.current = liveRef.current!.sampleId;
    currentRef.current = run;
    setNow(time);
    setCurrent(run);
  };

  const exportCsv = async (action: 'share' | 'save') => {
    if (exportRef.current || currentRef.current || !loaded || !runsRef.current.length) return;
    exportRef.current = true;
    setExporting(true);
    setExportMessage('Preparando o arquivo CSV…');
    try {
      // Uma gravação rejeitada não impede resgatar os dados que ainda estão na memória.
      await withTimeout(writesRef.current.catch(() => {}), 10000, 'O histórico ainda está sendo salvo. Aguarde e tente novamente.');
      const result = await exportTrialCsv([...runsRef.current], { scope: exportScope, format: exportFormat }, action);
      if (mountedRef.current) setExportMessage(result.status === 'saved'
        ? `Arquivo salvo na pasta escolhida: ${result.filename}`
        : result.status === 'cancelled' ? 'Salvamento cancelado. Nenhum ensaio foi apagado.'
          : 'Janela de compartilhamento fechada. O histórico permanece guardado; o retorno não confirma o envio.');
    } catch (error) {
      if (mountedRef.current) {
        const message = error instanceof Error ? error.message : 'Não foi possível exportar o CSV.';
        setExportMessage(message);
        Alert.alert('Exportação não concluída', `${message}\nNenhum ensaio foi apagado.`);
      }
    } finally {
      exportRef.current = false;
      if (mountedRef.current) setExporting(false);
    }
  };

  const collecting = current !== null && current.endedAt === null;
  const warmup = collecting ? Math.max(0, Math.ceil((current.startedAt + SETTLE_MS - now) / 1000)) : 0;
  const summary = current ? summarizeTrial(current) : null;
  const fresh = live !== null && connected && !standby && isFreshPacket(live, now);
  const exportCounts = useMemo(() => {
    const selected = exportScope === 'latest'
      ? [...runs].sort((a, b) => a.startedAt - b.startedAt).slice(-1) : runs;
    return { runs: selected.length, samples: selected.reduce((total, run) => total + run.samples.length, 0) };
  }, [runs, exportScope]);
  const readyToStart = canStartTrial({ loaded, connected, standby,
    foreground: AppState.currentState === 'active', collecting, packet: live, now });
  const show = (value: number | null | undefined, decimals = 1) => value == null ? '—' : value.toFixed(decimals);

  if (!INTERNAL_TOOLS_ENABLED) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View testID="proximity-trial-viewport" style={[styles.container, {
        height: windowHeight, maxHeight: windowHeight, paddingTop: insets.top, paddingBottom: insets.bottom,
      }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Ensaio de proximidade</Text>
          <TouchableOpacity onPress={close} disabled={exporting} accessibilityRole="button"><Text style={styles.link}>VOLTAR</Text></TouchableOpacity>
        </View>
        <ScrollView testID="proximity-trial-scroll" style={styles.scroll}
          contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag" nestedScrollEnabled removeClippedSubviews={false}
          showsVerticalScrollIndicator scrollEnabled>
          <Text style={styles.text}>A distância real vem da trena. Esta tela apenas observa o sistema: não muda a calibração nem desliga os alertas. Faça o teste entre adultos, sem criança.</Text>
          {panic && <View style={styles.card}><Text style={styles.warning}>ALERTA ATIVO. Você pode iniciar e concluir os ensaios de cada distância mesmo com o alarme tocando. Ele será registrado sem silenciar a placa ou o celular. Para encerrar o alarme, volte à Central e confirme a segurança após interromper ou concluir a coleta.</Text></View>}
          {loadError && <View style={styles.card}>
            <Text style={styles.warning}>Não foi possível carregar o histórico. O conteúdo original foi preservado e novas coletas estão bloqueadas para não substituí-lo.</Text>
            <TouchableOpacity style={styles.action} disabled={loadingHistory} onPress={() => { void loadHistory(); }} accessibilityRole="button">
              <Text style={styles.actionText}>{loadingHistory ? 'CARREGANDO…' : 'TENTAR CARREGAR HISTÓRICO'}</Text>
            </TouchableOpacity>
          </View>}
          {storageError && <Text style={styles.warning}>A gravação não foi confirmada. As coletas desta sessão continuam na memória; exporte-as antes de fechar o aplicativo.</Text>}
          <Text style={styles.heading}>1. Distância real medida</Text>
          <View style={styles.buttons}>
            {TRIAL_DISTANCES.map(value => <TouchableOpacity key={value} disabled={collecting} onPress={() => setDistance(value)} style={[styles.chip, distance === value && styles.selected]} accessibilityRole="button" accessibilityState={{ selected: distance === value, disabled: collecting }}>
              <Text style={styles.link}>{value} m</Text>
            </TouchableOpacity>)}
          </View>
          <Text style={styles.text}>Deixe a caixinha fixa e afaste o celular de metro em metro. Pare na marca medida com a trena, selecione a distância e mantenha os dois imóveis durante a coleta. Mantenha a mesma altura e orientação.</Text>
          <TextInput style={styles.input} value={condition} onChangeText={setCondition} editable={!collecting} multiline scrollEnabled={false} maxLength={240} accessibilityLabel="Condições do ensaio" placeholder="Ambiente, orientação, obstáculos, modelo do celular" placeholderTextColor={colors.textMuted} />
          <TextInput style={styles.input} value={height} onChangeText={setHeight} editable={!collecting} keyboardType="decimal-pad" maxLength={5} accessibilityLabel="Altura dos dispositivos em metros" placeholder="Altura comum em metros (opcional; 0 = chão)" placeholderTextColor={colors.textMuted} />
          <Text style={styles.heading}>2. Leituras ao vivo</Text>
          <View style={styles.card}>
            <Text style={styles.text}>Estimativa da placa: {fresh ? show(live?.estimatedM) : '—'} m</Text>
            <Text style={styles.text}>RSSI lido pelo celular: {fresh ? live?.phoneRssi : '—'} dBm</Text>
            <Text style={styles.text}>RSSI bruto / filtrado da placa: {fresh ? `${live?.rawRssi ?? '—'} / ${live?.filteredRssi}` : '—'} dBm</Text>
            <Text style={styles.text}>Estado: {fresh ? live?.state : 'aguardando leitura nova'}</Text>
            <Text style={styles.help}>Uma casa decimal mostra a resolução enviada pelo firmware, não uma precisão de 10 cm. As leituras do celular e da placa são assíncronas.</Text>
          </View>
          <Text style={styles.heading}>3. Coletar nesta posição</Text>
          <Text style={styles.text}>Aguarda 10 s para estabilização e registra 30 notificações com leitura nova (cerca de 30 s). Mantenha esta tela aberta e os dois dispositivos parados.</Text>
          <TouchableOpacity style={styles.action} onPress={collecting ? () => finish('interrompido pelo usuário') : start} disabled={exporting || (!collecting && !readyToStart)} accessibilityRole="button" accessibilityState={{ disabled: exporting || (!collecting && !readyToStart) }}>
            <Text style={styles.actionText}>{collecting ? 'INTERROMPER E GUARDAR' : 'INICIAR ENSAIO'}</Text>
          </TouchableOpacity>
          {current && <View style={styles.card}>
            <Text style={styles.heading}>{current.distanceM} m reais — {collecting ? warmup > 0 ? `estabilizando: ${warmup} s` : 'coletando' : current.stopReason}</Text>
            <Text style={styles.text}>{current.samples.length} / {TRIAL_SAMPLES} amostras</Text>
            <Text style={styles.text}>Estimativa: média {show(summary?.estimated?.mean)} m; mínimo {show(summary?.estimated?.min)} m; máximo {show(summary?.estimated?.max)} m</Text>
            <Text style={styles.text}>Erro absoluto médio: {show(summary?.meanAbsoluteError)} m</Text>
            <Text style={styles.text}>RSSI do celular: mediana {show(summary?.phone?.median)} dBm; desvio {show(summary?.phone?.stdDev)} dBm</Text>
            <Text style={styles.text}>Amostras em atenção: {summary?.warningSamples}; com pânico ativo: {summary?.panicSamples}</Text>
            <Text style={styles.help}>Pânico ativo pode continuar após a aproximação até a confirmação humana. Esta contagem não representa disparos independentes nem identifica sua causa.</Text>
          </View>}
          <Text style={styles.heading}>Histórico local ({runs.length}/{MAX_RUNS})</Text>
          <Text style={styles.help}>Guarda os últimos 100 ensaios, inclusive incompletos. Exporte regularmente; não use dados pessoais nas observações.</Text>
          <View style={styles.card}>
            <Text style={styles.heading}>Exportar resultados</Text>
            <Text style={styles.text}>1. Escolha quais ensaios incluir</Text>
            <View style={styles.buttons}>
              {([['history', 'Histórico completo'], ['latest', 'Último ensaio']] as const).map(([value, label]) =>
                <TouchableOpacity key={value} style={[styles.chip, exportScope === value && styles.selected]}
                  disabled={exporting || collecting} onPress={() => setExportScope(value)} accessibilityRole="radio"
                  accessibilityState={{ checked: exportScope === value, disabled: exporting || collecting }}>
                  <Text style={styles.link}>{label}</Text>
                </TouchableOpacity>)}
            </View>
            <Text style={styles.text}>2. Escolha o conteúdo do arquivo</Text>
            <View style={styles.buttons}>
              {([['samples', 'Amostras detalhadas'], ['summary', 'Resumo por ensaio']] as const).map(([value, label]) =>
                <TouchableOpacity key={value} style={[styles.chip, exportFormat === value && styles.selected]}
                  disabled={exporting || collecting} onPress={() => setExportFormat(value)} accessibilityRole="radio"
                  accessibilityState={{ checked: exportFormat === value, disabled: exporting || collecting }}>
                  <Text style={styles.link}>{label}</Text>
                </TouchableOpacity>)}
            </View>
            <Text style={styles.help}>{exportFormat === 'samples'
              ? 'Uma linha por amostra, com horários, RSSI, distância e estado. Use este formato para enviar os dados da calibração.'
              : 'Uma linha por ensaio, com médias, mínimos, máximos e erro absoluto médio. Facilita a leitura em planilha; não substitui as amostras.'}</Text>
            <Text style={styles.text}>Seleção: {exportCounts.runs} ensaio(s), {exportCounts.samples} amostra(s).</Text>
            <Text style={styles.help}>Arquivo .csv com acentos, colunas separadas por ponto e vírgula e datas em UTC. Inclui ensaios incompletos. A contagem de pânico não significa disparos independentes. As observações serão incluídas: evite dados pessoais.</Text>
            <TouchableOpacity style={[styles.action, (!loaded || !runs.length || collecting || exporting) && styles.disabled]}
              onPress={() => { void exportCsv('share'); }} disabled={!loaded || !runs.length || collecting || exporting}
              accessibilityRole="button" accessibilityState={{ disabled: !loaded || !runs.length || collecting || exporting, busy: exporting }}>
              <Text style={styles.actionText}>{exporting ? 'EXPORTAÇÃO EM ANDAMENTO…' : 'COMPARTILHAR ARQUIVO CSV'}</Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && <TouchableOpacity style={[styles.action, (!loaded || !runs.length || collecting || exporting) && styles.disabled]}
              onPress={() => { void exportCsv('save'); }} disabled={!loaded || !runs.length || collecting || exporting}
              accessibilityRole="button" accessibilityState={{ disabled: !loaded || !runs.length || collecting || exporting }}>
              <Text style={styles.actionText}>SALVAR CSV NO CELULAR</Text>
            </TouchableOpacity>}
            <Text style={styles.help}>Salvar: escolha ou crie uma pasta e autorize o acesso. Compartilhar: escolha o aplicativo de destino. Não é necessário interromper a proteção para exportar.</Text>
            {!!exportMessage && <Text style={styles.text} accessibilityLiveRegion="polite">{exportMessage}</Text>}
          </View>
          {runs.slice(-10).reverse().map(run => <Text key={run.id} style={styles.text}>{run.distanceM} m • {new Date(run.startedAt).toLocaleString('pt-BR')} • {run.samples.length}/30 • {run.stopReason}</Text>)}
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, minHeight: 0, backgroundColor: colors.background },
    header: { flexShrink: 0, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    scroll: { flex: 1, minHeight: 0 },
    title: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 18, paddingBottom: 30, gap: 12 },
    text: { color: colors.textPrimary, fontSize: 14, lineHeight: 21 },
    help: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
    warning: { color: colors.warningYellow, fontSize: 14, lineHeight: 21 },
    heading: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 8 },
    card: { backgroundColor: colors.cardBg, padding: 16, borderRadius: 14, gap: 8, borderWidth: 1, borderColor: colors.cardBorder },
    buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
    selected: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBlue },
    link: { color: colors.primaryBlue, fontSize: 14, fontWeight: '700' },
    input: { color: colors.textPrimary, backgroundColor: colors.inputBg, padding: 14, borderRadius: 10, minHeight: 75, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.cardBorder },
    action: { backgroundColor: colors.primarySoft, padding: 16, borderRadius: 12, alignItems: 'center' },
    actionText: { color: colors.primaryBlue, fontWeight: '800', fontSize: 14 },
    disabled: { opacity: 0.5 },
  });
}
