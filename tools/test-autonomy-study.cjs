const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,deps={},globals={}) {
  const c={exports:{},console,...globals,require:name=>{if (!(name in deps))throw Error('Dependência inesperada: '+name);return deps[name];}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,c);
  return c.exports;
}
const util=load('src/utils/autonomyStudy.ts');
const {AutonomySession,isStoredStudy,buildAutonomyCsv,interruptStoredStudy}=util;
const {AutonomyRecorder}=load('src/services/autonomyRecorder.ts',{'../utils/autonomyStudy':util});
const epoch=1793910000000;
const metadata={app:'1.0.1 / autonomia-a1',phone:'SM-S928B',platform:'android 36'};
const clock=t=>({wall:epoch+t,mono:t});
const obs=(t,changes={})=>({connected:true,standby:false,panic:false,signal:'seguro',telemetryAt:epoch+t,
  firmware:'xiao-p5-r4-d1-k2-w1',voltage:4.1,percent:100,usb:false,charging:false,soundEnabled:true,vibration:true,notifications:true,
  boardState:changes.signal==='aviso'?'atencao':changes.signal==='panico'?'perigo':'seguro',
  boardPanic:changes.panic??false,boardActive:!changes.standby,...changes});
function session(){return new AutonomySession(clock(0),metadata,'run-1');}
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};

test('autonomia: amostra por minuto e duração não são contagem de mAh',()=>{
  const s=session();for(let t=0;t<=61000;t+=1000)s.observe(obs(t),clock(t));
  assert.equal(s.run.rows.length,2);assert.equal(s.run.observedBatteryMs.protegido,61000);
  assert.equal(s.run.rows[1].elapsedMs,60000);assert.equal(isStoredStudy(s.run),true);
  const csv=buildAutonomyCsv([s.run],true);assert.match(csv,/não mede corrente, mAh/);
  assert.doesNotMatch(csv,/consumo_ma;|capacidade_mah;/i);
});
test('autonomia: atenção, emergência e retorno são eventos e políticas previstas, não áudio medido',()=>{
  const s=session();s.observe(obs(0),clock(0));
  s.observe(obs(1000,{signal:'aviso'}),clock(1000));
  s.observe(obs(2000,{signal:'aviso'}),clock(2000));
  s.observe(obs(3000,{signal:'panico',panic:true}),clock(3000));
  s.observe(obs(4000,{signal:'panico',panic:true}),clock(4000));
  s.observe(obs(5000),clock(5000));
  assert.ok(s.run.rows.some(x=>x.event==='inicio_atencao'&&x.buzzerPolicy==='previsto_bipe_atencao'));
  assert.ok(s.run.rows.some(x=>x.event==='inicio_emergencia'&&x.buzzerPolicy==='previsto_bipe_emergencia'));
  assert.ok(s.run.rows.some(x=>x.event==='saida_emergencia_observada'));
  assert.equal(s.run.observedBatteryMs.atencao,2000);assert.equal(s.run.observedBatteryMs.emergencia,2000);
});
test('autonomia: USB/carga são separados, nunca contados como descarga',()=>{
  const s=session();for(let t=0;t<=30000;t+=1000)s.observe(obs(t,{usb:true,charging:true}),clock(t));
  assert.equal(s.run.observedBatteryMs.protegido,undefined);assert.equal(s.run.observedUsbMs,30000);
  for(let t=31000;t<=61000;t+=1000)s.observe(obs(t),clock(t));
  assert.equal(s.run.observedBatteryMs.protegido,30000);assert.equal(s.run.unobservedMs,1000);
  const csv=buildAutonomyCsv([s.run],true);assert.match(csv,/tempo_observado_com_usb_ms/);
});
test('autonomia: suspensão longa não inventa um minuto em protegido',()=>{
  const s=session();s.observe(obs(0),clock(0));s.observe(obs(1000),clock(1000));
  s.observe(obs(61000),clock(61000));
  assert.equal(s.run.observedBatteryMs.protegido,1000);assert.equal(s.run.unobservedMs,60000);
  assert.match(s.run.rows[s.run.rows.length-1].event,/lacuna/);
});
test('autonomia: perda de vínculo ou amostra antiga não repetem tensão como leitura nova',()=>{
  const s=session();s.observe(obs(0),clock(0));
  s.observe(obs(6000,{telemetryAt:epoch,connected:false,panic:true}),clock(6000));
  const row=s.run.rows[1];assert.equal(row.fresh,false);assert.equal(row.voltage,null);
  assert.equal(row.percent,null);assert.equal(row.usb,null);assert.equal(row.buzzerPolicy,'nao_observavel');
  assert.equal(row.state,'emergencia_sem_vinculo');
});
test('autonomia: lacuna e emergência simultâneas continuam identificáveis',()=>{
  const s=session();s.observe(obs(0),clock(0));s.observe(obs(10000,{signal:'panico',panic:true}),clock(10000));
  assert.match(s.run.rows[1].event,/lacuna\|inicio_emergencia/);
});
test('autonomia: relógio civil alterado é marcado e usa duração monotônica, sem falsa cobertura',()=>{
  const s=session();s.observe(obs(0),clock(0));
  s.observe(obs(-60000),{wall:epoch-60000,mono:1000});
  assert.match(s.run.rows[1].event,/relogio_civil_alterado/);assert.equal(s.run.rows[1].elapsedMs,1000);
  assert.equal(s.run.unobservedMs,1000);
});
test('autonomia: relógio monotônico reiniciado encerra a execução',()=>{
  const s=new AutonomySession(clock(100),metadata,'run');s.observe(obs(100),clock(100));
  s.observe(obs(50),clock(50));assert.equal(s.run.reason,'relogio_monotonico_reiniciado');
  assert.ok(s.run.rows.every(x=>x.elapsedMs>=0));
});
test('autonomia: etapa pretendida não altera estado, não aciona emergência',()=>{
  const s=session();s.observe(obs(0),clock(0));s.markPhase('emergencia',clock(1000),obs(1000));
  const row=s.run.rows[1];assert.equal(row.phase,'emergencia');assert.equal(row.state,'protegido');
  assert.equal(row.buzzerPolicy,'previsto_desligado');
});
test('autonomia: valores inválidos de bateria ficam vazios, não zero',()=>{
  const s=session();s.observe(obs(0,{voltage:NaN,percent:Infinity}),clock(0));
  assert.equal(s.run.rows[0].voltage,null);assert.equal(s.run.rows[0].percent,null);assert.ok(isStoredStudy(s.run));
});
test('autonomia: USB ou carga ausente não são assumidos como bateria sem USB',()=>{
  const s=session();s.observe(obs(0,{usb:null,charging:null}),clock(0));
  s.observe(obs(1000,{usb:null,charging:null}),clock(1000));
  assert.equal(s.run.observedBatteryMs.protegido,undefined);assert.equal(s.run.unobservedMs,1000);
});
test('autonomia: emergência do app não prova buzzer da placa acionado',()=>{
  const s=session();s.observe(obs(0,{panic:true,boardPanic:false,boardState:'seguro'}),clock(0));
  assert.equal(s.run.rows[0].appEmergency,true);assert.equal(s.run.rows[0].state,'protegido');
  assert.equal(s.run.rows[0].buzzerPolicy,'previsto_desligado');
});
test('autonomia: limite de registros encerra sem apagar amostras antigas',()=>{
  const s=session();for(let t=0;t<util.AUTONOMY_MAX_ROWS+10;t++)s.observe(obs(t*1000,{signal:t%2?'aviso':'seguro'}),clock(t*1000));
  assert.equal(s.run.rows.length,util.AUTONOMY_MAX_ROWS);assert.equal(s.run.reason,'limite_de_registros');
});
test('autonomia: reinício recupera só os dados salvos e não auto-inicia coleta',()=>{
  const s=session();s.observe(obs(0),clock(0));s.observe(obs(60000),clock(60000));
  const saved=interruptStoredStudy(s.run);assert.equal(saved.endedAt,epoch+60000);
  assert.equal(saved.reason,'registro_interrompido_entre_execucoes');assert.equal(s.run.endedAt,null);
});
test('autonomia: CSV protege texto de fórmula e preserva acentos',()=>{
  const s=new AutonomySession(clock(0),{...metadata,phone:'=HYPERLINK("x")'},'run');
  s.observe(obs(0),clock(0));const csv=buildAutonomyCsv([s.run]);
  assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/'=HYPERLINK/);assert.match(csv,/"tensao_v"/);
  assert.ok(!csv.includes('@escolta_user_profile'));
});
test('autonomia: validação recusa dados quebrados antes da exportação',()=>{
  const s=session();s.observe(obs(0),clock(0));assert.equal(isStoredStudy({...s.run,observedUsbMs:-1}),false);
  assert.equal(isStoredStudy({...s.run,rows:[{...s.run.rows[0],sequence:2}]}),false);
  assert.throws(()=>buildAutonomyCsv([]));
});
function recorderFixture(raw=null,failWrite=false) {
  let time=0,store=raw;const writes=[];
  const r=new AutonomyRecorder({getItem:async()=>store,setItem:async(key,value)=>{writes.push(value);if(failWrite)throw Error('disk');store=value;}},
    ()=>clock(time),()=>obs(time),metadata);
  return {r,writes,at:t=>{time=t;},stored:()=>store};
}
test('autonomia: carregar não inicia coleta nem grava histórico vazio',async()=>{
  const {r,writes}=recorderFixture();await r.load();assert.equal(r.getSnapshot().ready,true);
  assert.equal(r.getSnapshot().active,false);assert.equal(writes.length,0);
});
test('autonomia: histórico ilegível é preservado e bloqueia início',async()=>{
  const {r,writes,stored}=recorderFixture('{quebrado');await r.load();assert.equal(r.getSnapshot().ready,false);
  assert.throws(()=>r.start());assert.equal(writes.length,0);assert.equal(stored(),'{quebrado');
});
test('autonomia: erro de armazenamento para coleta e permite resgate em memória',async()=>{
  const {r}=recorderFixture(null,true);await r.load();r.start();await r.flush();
  assert.equal(r.getSnapshot().active,false);assert.match(r.getSnapshot().error,/Gravação/);
  assert.ok(r.export().includes('falha_de_gravacao'));assert.throws(()=>r.start());
});
test('autonomia: fechar assinatura da tela não encerra o registro',async()=>{
  const {r,at}=recorderFixture();await r.load();r.start();const off=r.subscribe(()=>{});off();
  at(1000);r.observe();assert.equal(r.getSnapshot().active,true);r.stop();await r.flush();
  assert.equal(r.getSnapshot().active,false);
});
test('autonomia: encerramento de conta persiste na instância original e não reinicia',async()=>{
  const a=recorderFixture(),b=recorderFixture();await a.r.load();await b.r.load();a.r.start();a.at(1000);
  a.r.dispose();await a.r.flush();assert.match(a.stored(),/sessao_da_conta_encerrada/);
  assert.equal(b.stored(),null);assert.throws(()=>a.r.start());
});
test('autonomia: execução interrompida é identificada na leitura, sem consumo no intervalo ausente',async()=>{
  const s=session();s.observe(obs(0),clock(0));const f=recorderFixture(JSON.stringify([s.run]));
  await f.r.load();await f.r.flush();assert.equal(f.r.getSnapshot().active,false);
  assert.match(f.stored(),/registro_interrompido_entre_execucoes/);
  assert.equal(f.r.getSnapshot().runs[0].unobservedMs,0);
});
test('autonomia: exclusão exige coleta parada e não permite iniciar durante operação',async()=>{
  const f=recorderFixture();await f.r.load();f.r.start();await assert.rejects(f.r.clear());
  f.r.stop();await f.r.flush();const clearing=f.r.clear();assert.throws(()=>f.r.start());
  await clearing;assert.equal(f.stored(),'[]');assert.equal(f.r.getSnapshot().runs.length,0);
});
test('autonomia: contas descartadas durante leitura não sobrescrevem dados',async()=>{
  let done,writes=0;
  const r=new AutonomyRecorder({getItem:()=>new Promise(resolve=>{done=resolve;}),setItem:async()=>{writes++;}},()=>clock(0),()=>obs(0),metadata);
  const pending=r.load();r.dispose();done('[]');await pending;await flush();assert.equal(writes,0);
});

test('autonomia: leitura inicial é única mesmo com dois pedidos simultâneos',async()=>{
  let done,reads=0;
  const r=new AutonomyRecorder({getItem:()=>{reads++;return new Promise(resolve=>{done=resolve;});},setItem:async()=>{}},()=>clock(0),()=>obs(0),metadata);
  const a=r.load(),b=r.load();assert.equal(reads,1);done('[]');await a;await b;
  assert.equal(r.getSnapshot().ready,true);
});

test('autonomia: snapshots enfileirados após falha não voltam a gravar uma execução ativa',async()=>{
  let rejectWrite,writes=0,t=0;
  const r=new AutonomyRecorder({getItem:async()=>null,setItem:()=>{
    writes++;return new Promise((_resolve,reject)=>{rejectWrite=reject;});
  }},()=>clock(t),()=>obs(t),metadata);
  await r.load();r.start();await flush();t=60000;r.observe();t=120000;r.observe();
  rejectWrite(Error('disk'));await r.flush();
  assert.equal(writes,1);assert.equal(r.getSnapshot().active,false);
  assert.match(r.export(),/falha_de_gravacao/);
});

test('autonomia: falha de relógio ao trocar conta ou gravar não escapa para a proteção',async()=>{
  let broken=false;
  const r=new AutonomyRecorder({getItem:async()=>null,setItem:async()=>{}},()=>{if(broken)throw Error('clock');return clock(0);},()=>obs(0),metadata);
  await r.load();r.start();broken=true;
  assert.doesNotThrow(()=>r.dispose());await r.flush();
  assert.equal(r.getSnapshot().active,false);assert.match(r.export(),/sessao_da_conta_encerrada/);
});

test('autonomia: dado inicial inválido não inicia e monitoramento ausente não vira protegido',async()=>{
  const r=new AutonomyRecorder({getItem:async()=>null,setItem:async()=>{}},()=>clock(0),()=>obs(0,{voltage:NaN}),metadata);
  await r.load();assert.throws(()=>r.start(),/telemetria recente/);
  const s=session();s.observe(obs(0,{boardActive:null}),clock(0));
  assert.equal(s.run.rows[0].state,'sincronizando');assert.equal(s.run.rows[0].buzzerPolicy,'nao_observavel');
});
test('autonomia: módulos de observação não chamam controle BLE nem alarme',()=>{
  for(const file of ['src/services/autonomyRecorder.ts','src/services/autonomyRegistry.ts','src/utils/autonomyStudy.ts']){
    const source=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(source,/toggleSomBle\(|resetAlarmeBle\(|armBackgroundEmergency\(|connectBle\(|disconnectBle\(|startRssiWatchdogExperiment\(/);
  }
  const registry=fs.readFileSync('src/services/autonomyRegistry.ts','utf8');
  assert.match(registry,/current\.scope\.subscribe\(recorder\.observe\)/);
  assert.match(registry,/accountStorageFor\(owner\)/);
  assert.doesNotMatch(registry,/setInterval|setTimeout|setBleCallbacks/);
});

test('autonomia: integração acompanha telemetria existente e encerra na conta original',async()=>{
  let authChanged,notify,detached=0,monitorCalls=0;
  const auth={currentUser:{uid:'a'}},writes=[];
  const preferences={vibrationEnabled:true,notificationsEnabled:true};
  const snapshot={conectado:true,emEspera:false,modoPanico:false,nivelSinal:'seguro'};
  let packet={at:Date.now(),status:{fw:'xiao-p5-r4-d1-k2-w1',estado:'seguro',panico_ativo:false,monitoramento_ativo:true,bateria_v:4.1,bateria_pct:100,usb_conectado:false,carregando:false,som_on:true}};
  const registry=load('src/services/autonomyRegistry.ts',{
    'react-native':{Platform:{OS:'android',Version:36,constants:{Model:'SM-S928B'}}},
    'firebase/auth':{onAuthStateChanged:(_auth,fn)=>{authChanged=fn;}},'./firebaseConfig':{auth},
    './nativeIdentity':{BATTERY_STUDY_ENABLED:true},'./autonomyRecorder':{AutonomyRecorder},
    './bleApi':{getAutonomyTelemetry:()=>packet},'../../app.json':{expo:{version:'1.0.1'}},
    './accountStorage':{accountStorageFor:owner=>({getItem:async()=>null,setItem:async(_key,value)=>{writes.push({owner,value});}})},
    './persistentMonitor':{getPersistentMonitor:()=>{monitorCalls++;return {preferences,scope:{getSnapshot:()=>snapshot,subscribe:fn=>{notify=fn;return ()=>{detached++;};}}};}},
  },{performance:{now:()=>1000}});
  const a=registry.getAutonomyRecorder('a',preferences);await flush();
  assert.equal(a.getSnapshot().active,false);assert.equal(writes.length,0);
  assert.equal(registry.getAutonomyRecorder('a',preferences),a);assert.equal(monitorCalls,1);
  a.start();packet={...packet,at:Date.now(),status:{...packet.status,estado:'atencao'}};notify();
  assert.equal(a.getSnapshot().runs[0].rows.at(-1).state,'atencao');
  auth.currentUser={uid:'b'};authChanged(auth.currentUser);await a.flush();
  assert.equal(detached,1);assert.equal(a.getSnapshot().active,false);
  assert.ok(writes.every(w=>w.owner==='a'));assert.match(writes.at(-1).value,/sessao_da_conta_encerrada/);
  const b=registry.getAutonomyRecorder('b',preferences);await flush();
  assert.notEqual(a,b);assert.equal(b.getSnapshot().active,false);assert.equal(b.getSnapshot().runs.length,0);
});

test('autonomia: 12 horas virtuais preservam intervalos e exportam a passagem USB, atenção e emergência',()=>{
  const s=session();
  for(let sec=0;sec<=43200;sec++) {
    const ms=sec*1000,usb=sec<=60,panic=sec>=7215&&sec<7245;
    const signal=panic?'panico':sec>=7200&&sec<7215?'aviso':'seguro';
    s.observe(obs(ms,{usb,charging:usb,signal,panic,voltage:4.10-sec/200000,percent:100-sec/600}),clock(ms));
  }
  s.finish('ensaio_simulado',clock(43200000));
  const {run}=s;
  assert.equal(run.observedUsbMs,60000);
  assert.equal(run.unobservedMs,1000);
  assert.equal(run.observedBatteryMs.protegido,43094000);
  assert.equal(run.observedBatteryMs.atencao,15000);
  assert.equal(run.observedBatteryMs.emergencia,30000);
  assert.ok(run.rows.length>700&&run.rows.length<740,`quantidade de linhas: ${run.rows.length}`);
  const csv=buildAutonomyCsv([run]);
  assert.equal(csv.split('\r\n').length,run.rows.length+1);
  assert.match(csv,/"inicio_atencao"/);assert.match(csv,/"inicio_emergencia"/);
  assert.match(csv,/"saida_emergencia_observada"/);
  assert.equal(run.rows.at(-1).elapsedMs,43200000);
});

test('autonomia: oscilação BLE durante emergência mantém pânico do app separado de dados ausentes',()=>{
  const s=session();
  s.observe(obs(0),clock(0));
  s.observe(obs(1000,{signal:'panico',panic:true}),clock(1000));
  for(let i=2;i<=21;i++) {
    const ms=i*1000,connected=i%2===1;
    s.observe(obs(ms,{connected,signal:'panico',panic:true,telemetryAt:connected?epoch+ms:epoch}),clock(ms));
  }
  s.observe(obs(22000),clock(22000));
  assert.equal(s.run.unobservedMs,20000);
  assert.equal(s.run.observedBatteryMs.emergencia,1000);
  const offline=s.run.rows.filter(row=>!row.connected);
  assert.equal(offline.length,10);
  assert.ok(offline.every(row=>row.appEmergency&&row.state==='emergencia_sem_vinculo'&&row.voltage===null&&row.boardPanic===null));
  assert.equal(s.run.rows.at(-1).state,'protegido');
});

test('autonomia: reinício durante coleta realista preserva CSV interrompido e permite segunda coleta',async()=>{
  const first=recorderFixture();await first.r.load();first.r.start();
  for(let i=1;i<=65;i++){first.at(i*1000);first.r.observe();}
  await first.r.flush();
  const second=recorderFixture(first.stored());second.at(300000);await second.r.load();
  assert.equal(second.r.getSnapshot().active,false);
  const old=second.r.getSnapshot().runs[0];
  assert.equal(old.endedAt,epoch+60000);assert.equal(old.observedBatteryMs.protegido,60000);
  second.r.start();second.at(301000);second.r.observe();second.r.stop();await second.r.flush();
  const runs=second.r.getSnapshot().runs;
  assert.equal(runs.length,2);assert.equal(runs[0].reason,'registro_interrompido_entre_execucoes');
  assert.equal(runs[1].observedBatteryMs.protegido,1000);assert.notEqual(runs[0].id,runs[1].id);
  assert.match(second.r.export(true),/encerrado_pelo_responsavel/);
});
