import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getAutonomyRecorder } from '../services/autonomyRegistry';
import { exportAutonomyFile } from '../services/autonomyExport';
import { BATTERY_STUDY_ENABLED } from '../services/nativeIdentity';
import type { StudyPhase } from '../utils/autonomyStudy';

export default function AutonomyStudyModal({ visible,onClose }: {visible:boolean;onClose:()=>void}) {
  const { colors,accountUid,preferences }=useAppPreferences();
  const insets=useSafeAreaInsets();
  const recorder=useMemo(()=>BATTERY_STUDY_ENABLED&&accountUid?getAutonomyRecorder(accountUid,preferences):null,[accountUid,preferences]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  if (!BATTERY_STUDY_ENABLED || !recorder || !visible) return null;
  return <StudyContent recorder={recorder} busy={busy} setBusy={setBusy} message={message} setMessage={setMessage}
    onClose={onClose} colors={colors} top={insets.top} bottom={insets.bottom}/>;
}

function StudyContent({recorder,busy,setBusy,message,setMessage,onClose,colors,top,bottom}: {
  recorder:NonNullable<ReturnType<typeof getAutonomyRecorder>>; busy:boolean;setBusy:(v:boolean)=>void;
  message:string;setMessage:(v:string)=>void;onClose:()=>void;
  colors:ReturnType<typeof useAppPreferences>['colors'];top:number;bottom:number;
}) {
  const state=useSyncExternalStore(recorder.subscribe,recorder.getSnapshot,recorder.getSnapshot);
  const current=state.runs[state.runs.length-1];
  const last=current?.rows[current.rows.length-1];
  const minutes=current?Object.values(current.observedBatteryMs).reduce((a,b)=>a+b,0)/60000:0;
  const run=(fn:()=>void)=>{ try { fn(); setMessage(''); } catch(e) { Alert.alert('Registro de autonomia',e instanceof Error?e.message:'Operação não concluída.'); } };
  const exportFile=async(summary:boolean,action:'save'|'share')=>{
    if (busy) return;
    setBusy(true);
    try {setMessage(await exportAutonomyFile(recorder.export(summary),summary,action));}
    catch(e){Alert.alert('Exportação não concluída',e instanceof Error?e.message:'Os registros foram preservados.');}
    finally{setBusy(false);}
  };
  const button=(label:string,fn:()=>void,disabled=false)=><TouchableOpacity accessibilityRole="button" disabled={disabled||busy}
    style={[styles.button,{backgroundColor:colors.primaryBlue,opacity:(disabled||busy) ? 0.5 : 1}]} onPress={fn} key={label}>
    <Text style={styles.buttonText}>{label}</Text></TouchableOpacity>;
  const phases:Array<[StudyPhase,string]>=[['uso_normal','Uso normal'],['protegido','Protegido'],['atencao','Atenção'],['emergencia','Emergência'],['espera','Espera']];
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <View style={[styles.container,{backgroundColor:colors.background,paddingTop:top+12}]}>
      <View style={styles.header}><Text style={[styles.title,{color:colors.textPrimary}]}>Registro de autonomia</Text>
        <TouchableOpacity accessibilityRole="button" onPress={onClose}><Text style={{color:colors.primaryBlue,padding:12}}>Fechar</Text></TouchableOpacity></View>
      <ScrollView style={{flex:1}} contentContainerStyle={{padding:18,paddingBottom:bottom+30,gap:12}}>
        <Text style={{color:colors.warningYellow}}>Instrumentação A1. Observa o vestível; não mede corrente em mA ou capacidade em mAh.</Text>
        <Text style={{color:colors.textSecondary}}>O registro não dispara, silencia ou encerra alarmes. Marcar uma etapa só acrescenta uma anotação. USB, perda de dados e reinício são registrados separadamente.</Text>
        <Text style={{color:colors.textPrimary,fontWeight:'700'}}>{!state.ready?'Histórico indisponível/carregando…':state.active?'Coleta em andamento':'Coleta parada'}</Text>
        {!!state.error&&<Text style={{color:colors.dangerRed}}>{state.error}</Text>}
        {!state.ready&&button('Tentar carregar histórico',()=>{void recorder.load();})}
        {!!last&&<Text style={{color:colors.textSecondary}}>Último registro: {new Date(last.wall).toLocaleString('pt-BR')}{'\n'}
          {last.voltage===null?'Tensão indisponível':`${last.voltage.toFixed(2)} V · ${last.percent}% estimados`}{'\n'}
          Estado observado: {last.state} · USB: {last.usb===null?'não observado':last.usb?'sim':'não'}{'\n'}
          {current.rows.length} registros · {minutes.toFixed(1)} min observados em bateria</Text>}
        {state.active
          ?button('Encerrar somente a coleta',()=>Alert.alert('Encerrar registro?','Os alarmes e a proteção continuarão como estão.',[
            {text:'Cancelar',style:'cancel'},{text:'Encerrar coleta',onPress:()=>run(()=>recorder.stop())}]))
          :button('Iniciar nova coleta',()=>Alert.alert('Iniciar registro de autonomia?',
            'Serão salvos dados técnicos locais, por conta. A coleta continua ao fechar esta tela, mas pode ser interrompida se o processo for encerrado. Não use este ensaio para supervisionar uma criança. USB não conta como descarga.',[
              {text:'Cancelar',style:'cancel'},{text:'Iniciar',onPress:()=>run(()=>recorder.start())}]),!state.ready||!!state.error)}
        <Text style={{color:colors.textPrimary,fontWeight:'700'}}>Marcar etapa pretendida — não aciona alarme</Text>
        <View style={{gap:8}}>{phases.map(([phase,label])=>button(label,()=>run(()=>recorder.markPhase(phase)),!state.active||!!state.error))}</View>
        <Text style={{color:colors.textSecondary}}>Para comparar atenção e emergência, provoque apenas eventos breves e supervisionados pelo fluxo normal do sistema. O CSV distingue etapa pretendida de estado observado. O buzzer é inferido da política, não medido por microfone ou instrumento.</Text>
        {busy&&<ActivityIndicator color={colors.primaryBlue}/>}
        {button('Salvar registros CSV',()=>{void exportFile(false,'save');},!state.runs.length)}
        {button('Compartilhar registros CSV',()=>{void exportFile(false,'share');},!state.runs.length)}
        {button('Salvar resumo por estado',()=>{void exportFile(true,'save');},!state.runs.length)}
        {!!message&&<Text style={{color:colors.textSecondary}}>{message}</Text>}
        <Text style={{color:colors.textSecondary}}>O resumo exclui USB e não transforma tensão/percentual em consumo. Ele soma intervalos entre observações próximas. Exporte antes de apagar, reinstalar ou trocar a versão do aplicativo.</Text>
        {button('Excluir coletas após exportar',()=>Alert.alert('Excluir o histórico de autonomia desta conta?',
          'Esta ação não pode ser desfeita. Não exclui o histórico de emergências. Confirme que guardou os CSVs.',[
            {text:'Cancelar',style:'cancel'},{text:'Excluir coletas',style:'destructive',onPress:()=>{
              setBusy(true);void recorder.clear().then(()=>setMessage('Histórico de autonomia excluído.')).catch(e=>Alert.alert('Não foi possível excluir',String(e.message))).finally(()=>setBusy(false));
            }}]),state.active||!state.ready||!!state.error||!state.runs.length)}
      </ScrollView>
    </View>
  </Modal>;
}
const styles=StyleSheet.create({
  container:{flex:1},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18},
  title:{fontSize:21,fontWeight:'700',flex:1},button:{padding:13,borderRadius:10,minHeight:45},
  buttonText:{color:'#fff',fontWeight:'700',textAlign:'center'},
});
