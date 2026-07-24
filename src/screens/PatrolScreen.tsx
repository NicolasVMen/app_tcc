import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Esp32MonitorState } from '../hooks/useEsp32Monitor';

import { COLORS } from '../theme';

const DISTANCES = ['1m', '2m', '5m', '8m', '10m'];
const TOTAL_SAMPLES = 30;

export default function PatrolScreen({ monitor }: { monitor: Esp32MonitorState & { conectar: () => Promise<void> } }) {
  const [selectedDist, setSelectedDist] = useState<string>('1m');
  const [samples, setSamples] = useState<number[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [results, setResults] = useState<{ mean: number; stdDev: number } | null>(null);

  const latestRssi = React.useRef(monitor.rssiAtual);
  useEffect(() => {
    latestRssi.current = monitor.rssiAtual;
  }, [monitor.rssiAtual]);

  // Lógica de Coleta Automática (Agora à prova de travamentos)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCollecting) {
      interval = setInterval(() => {
        setSamples((prev) => {
          if (prev.length >= TOTAL_SAMPLES) {
            setIsCollecting(false);
            return prev;
          }
          return [...prev, latestRssi.current];
        });
      }, 1000); // Exatamente 1 amostra a cada segundo, sem travar
    }
    return () => clearInterval(interval);
  }, [isCollecting]);

  // Calcula Média e Desvio Padrão quando termina
  useEffect(() => {
    if (samples.length === TOTAL_SAMPLES && isCollecting === false) {
      const mean = samples.reduce((acc, val) => acc + val, 0) / TOTAL_SAMPLES;
      const variance = samples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / TOTAL_SAMPLES;
      const stdDev = Math.sqrt(variance);
      setResults({ mean, stdDev });
    }
  }, [samples, isCollecting]);

  const startCollection = () => {
    if (!monitor.conectado) {
      Alert.alert('Atenção', 'Conecte o Bluetooth primeiro na tela inicial!');
      return;
    }
    setSamples([]);
    setResults(null);
    setIsCollecting(true);
  };

  const handleShare = async () => {
    if (!results) return;
    const message = `Coleta TCC - Distância: ${selectedDist}\n` +
                    `Média: ${results.mean.toFixed(2)} dBm\n` +
                    `Desvio Padrão: ${results.stdDev.toFixed(2)} dBm\n\n` +
                    `Dados Brutos (30 amostras):\n[${samples.join(', ')}]`;
    try {
      await Share.share({ message });
    } catch (error) {
      console.log('Erro ao compartilhar', error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      <View style={styles.header}>
        <Ionicons name="flask-outline" size={40} color={COLORS.primaryBlue} />
        <Text style={styles.title}>Modo Laboratório</Text>
        <Text style={styles.subtitle}>
          Coleta automatizada de amostras RSSI para compor a seção de Resultados do TCC (Apêndice A).
        </Text>
      </View>

      {!monitor.conectado && (
        <View style={styles.offlineBanner}>
          <Ionicons name="warning" size={24} color={COLORS.white} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>Placa Desconectada</Text>
            <Text style={{ color: COLORS.white, fontSize: 12 }}>Conecte para iniciar a coleta.</Text>
          </View>
          <TouchableOpacity 
            style={styles.reconnectBtn}
            onPress={() => monitor.conectar()}
            disabled={monitor.isScanning}
          >
            {monitor.isScanning ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>CONECTAR</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>1. Escolha a Distância Atual</Text>
      <View style={styles.distContainer}>
        {DISTANCES.map((d) => (
          <TouchableOpacity 
            key={d} 
            style={[styles.distButton, selectedDist === d && styles.distButtonActive]}
            onPress={() => { setSelectedDist(d); setSamples([]); setResults(null); }}
            disabled={isCollecting}
          >
            <Text style={[styles.distText, selectedDist === d && styles.distTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>2. Coleta de Dados</Text>
      <View style={styles.card}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Amostras Coletadas:</Text>
          <Text style={styles.progressCount}>{samples.length} / {TOTAL_SAMPLES}</Text>
        </View>
        
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(samples.length / TOTAL_SAMPLES) * 100}%` }]} />
        </View>

        {!isCollecting && samples.length < TOTAL_SAMPLES && (
          <TouchableOpacity style={styles.startButton} onPress={startCollection}>
            <Ionicons name="play" size={20} color={COLORS.white} />
            <Text style={styles.startButtonText}>INICIAR COLETA</Text>
          </TouchableOpacity>
        )}

        {isCollecting && (
          <View style={styles.collectingBox}>
            <ActivityIndicator color={COLORS.primaryBlue} />
            <Text style={styles.collectingText}>Capturando sinal (Não mova o celular)...</Text>
          </View>
        )}
      </View>

      {results && (
        <View style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.safeGreen} />
            <Text style={styles.resultsTitle}>Resultados para {selectedDist}</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Média (μ):</Text>
            <Text style={styles.resultValue}>{results.mean.toFixed(2)} dBm</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Desvio Padrão (σ):</Text>
            <Text style={styles.resultValue}>{results.stdDev.toFixed(2)} dBm</Text>
          </View>
          
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social" size={18} color={COLORS.white} />
            <Text style={styles.shareBtnText}>COMPARTILHAR / COPIAR DADOS</Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  header: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginTop: 12 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  distContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  distButton: { flex: 1, backgroundColor: COLORS.cardBg, paddingVertical: 12, marginHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: 'center' },
  distButtonActive: { backgroundColor: COLORS.primaryBlue, borderColor: COLORS.primaryBlue },
  distText: { color: COLORS.textSecondary, fontWeight: '700' },
  distTextActive: { color: COLORS.white },
  card: { backgroundColor: COLORS.cardBg, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: 20 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressText: { color: COLORS.textSecondary, fontSize: 14 },
  progressCount: { color: COLORS.textPrimary, fontSize: 14, fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: COLORS.cardBorder, borderRadius: 4, marginBottom: 20, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primaryBlue },
  startButton: { flexDirection: 'row', backgroundColor: COLORS.primaryBlue, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  startButtonText: { color: COLORS.white, fontWeight: '700', letterSpacing: 0.5 },
  collectingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 10 },
  collectingText: { color: COLORS.primaryBlue, fontWeight: '600' },
  resultsCard: { backgroundColor: '#064E3B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.safeGreen },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  resultsTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resultLabel: { color: '#D1FAE5', fontSize: 15 },
  resultValue: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#047857', padding: 14, borderRadius: 10, marginTop: 20, gap: 8 },
  shareBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', padding: 16, borderRadius: 12, marginBottom: 20 },
  reconnectBtn: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
