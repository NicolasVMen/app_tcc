import { Platform } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import type { AppPreferences } from '../context/AppPreferencesContext';
import { accountStorageFor } from './accountStorage';
import { auth } from './firebaseConfig';
import { getPersistentMonitor } from './persistentMonitor';
import { BATTERY_STUDY_ENABLED } from './nativeIdentity';
import { AutonomyRecorder } from './autonomyRecorder';
import type { StudyObservation } from '../utils/autonomyStudy';
import { getAutonomyTelemetry } from './bleApi';

let attached: { owner:string; recorder:AutonomyRecorder; detach:()=>void } | null = null;
let watchingAuth=false;
function release() {
  const previous=attached;
  attached=null;
  previous?.detach(); previous?.recorder.dispose();
}

/** Assinatura passiva do controlador existente; não cria sessão ou escrita BLE extra. */
export function getAutonomyRecorder(owner: string, preferences: AppPreferences) {
  if (!BATTERY_STUDY_ENABLED || !owner || auth.currentUser?.uid!==owner) return null;
  if (attached?.owner===owner) return attached.recorder;
  release();
  if (!watchingAuth) {
    watchingAuth=true;
    onAuthStateChanged(auth,user=>{ if (attached && attached.owner!==user?.uid) release(); });
  }
  const current=getPersistentMonitor(owner,preferences);
  const read=():StudyObservation=>{
    const s=current.scope.getSnapshot();
    const packet=getAutonomyTelemetry(),d=packet?.status;
    const numeric=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
    const boolean=(v:unknown)=>typeof v==='boolean'?v:null;
    return { connected:s.conectado,standby:s.emEspera,panic:s.modoPanico,signal:s.nivelSinal,
      telemetryAt:packet?.at ?? null, firmware:d?.fw ?? null,
      voltage:numeric(d?.bateria_v),percent:numeric(d?.bateria_pct),
      usb:boolean(d?.usb_conectado),charging:boolean(d?.carregando),soundEnabled:boolean(d?.som_on),
      boardState:d?.estado ?? null,boardPanic:boolean(d?.panico_ativo),boardActive:boolean(d?.monitoramento_ativo),
      vibration:current.preferences.vibrationEnabled,notifications:current.preferences.notificationsEnabled };
  };
  const recorder=new AutonomyRecorder(accountStorageFor(owner),()=>{
    if (typeof performance?.now!=='function') throw new Error('Relógio monotônico indisponível para o registro.');
    return {wall:Date.now(),mono:performance.now()};
  },read,{app:require('../../app.json').expo.version+' / autonomia-a1',
    phone:String('Model' in Platform.constants ? Platform.constants.Model : 'não informado'),platform:Platform.OS+' '+Platform.Version});
  const detach=current.scope.subscribe(recorder.observe);
  attached={owner,recorder,detach};
  // Sem coleta automática: a inicialização somente carrega o histórico da conta.
  void recorder.load();
  return recorder;
}
