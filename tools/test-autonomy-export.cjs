const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');

function setup(options={}) {
  const calls=[];
  const fileSystem={cacheDirectory:'file:///cache/',EncodingType:{UTF8:'utf8'},
    makeDirectoryAsync:async()=>{},
    writeAsStringAsync:async(...args)=>{calls.push(['write',...args]);if(options.failWrite)throw Error('Sem espaço');},
    StorageAccessFramework:{
      requestDirectoryPermissionsAsync:async()=>({granted:!options.cancel,directoryUri:'content://chosen'}),
      createFileAsync:async(...args)=>{calls.push(['create',...args]);return 'content://chosen/result.csv';},
    }};
  const sharing={isAvailableAsync:async()=>true,shareAsync:async(...args)=>{calls.push(['share',...args]);if(options.wait)await options.wait;}};
  const deps={'react-native':{Platform:{OS:'android'}},
    'expo-modules-core':{requireOptionalNativeModule:()=>options.noSharing?null:{}},
    'expo-file-system/legacy':fileSystem,'expo-sharing':sharing,
    '../utils/asyncTimeout':{withTimeout:async operation=>operation}};
  const c={exports:{},require:name=>{assert.ok(name in deps,name);return deps[name];}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/autonomyExport.ts','utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,c);
  return {api:c.exports,calls};
}

test('autonomia exportação: compartilha URI UTF-8 sem histórico nos extras do Intent',async()=>{
  const m=setup(),csv='\uFEFF"tensao_v";"estado"\r\n"4.10";"atenção"';
  const result=await m.api.exportAutonomyFile(csv,false,'share');
  const write=m.calls.find(c=>c[0]==='write'),share=m.calls.find(c=>c[0]==='share');
  assert.equal(write[2],csv);assert.equal(write[3].encoding,'utf8');
  assert.equal(share[1],write[1]);assert.match(share[1],/registros.csv$/);
  assert.equal(share[2].mimeType,'text/csv');assert.equal(share[2].message,undefined);
  assert.match(result,/confirme o recebimento/);
});

test('autonomia exportação: sem módulo nativo há alternativa salvar; cancelar não cria arquivo',async()=>{
  const m=setup({noSharing:true});await assert.rejects(m.api.exportAutonomyFile('csv',false,'share'),/Use Salvar/);
  assert.match(await m.api.exportAutonomyFile('csv',true,'save'),/salvo/);
  const create=m.calls.find(c=>c[0]==='create');assert.equal(create[1],'content://chosen');assert.match(create[2],/resumo.csv$/);
  const cancel=setup({cancel:true});assert.match(await cancel.api.exportAutonomyFile('csv',false,'save'),/cancelada/);
  assert.equal(cancel.calls.length,0);
});

test('autonomia exportação: falha de escrita não abre seletor e libera nova tentativa',async()=>{
  const options={failWrite:true},m=setup(options);
  await assert.rejects(m.api.exportAutonomyFile('csv',false,'share'),/Sem espaço/);
  assert.ok(!m.calls.some(c=>c[0]==='share'));options.failWrite=false;
  assert.match(await m.api.exportAutonomyFile('csv',false,'share'),/preservada/);
});

test('autonomia exportação: seletor em andamento bloqueia repetição e libera ao encerrar',async()=>{
  let done;const m=setup({wait:new Promise(resolve=>{done=resolve;})});
  const pending=m.api.exportAutonomyFile('csv',false,'share');
  while(!m.calls.some(c=>c[0]==='share'))await new Promise(resolve=>setImmediate(resolve));
  await assert.rejects(m.api.exportAutonomyFile('csv',true,'save'),/Aguarde/);
  done();await pending;assert.match(await m.api.exportAutonomyFile('csv',true,'save'),/salvo/);
});

test('autonomia: perfil separado não ativa ferramentas internas na oficial normal',()=>{
  const profiles=JSON.parse(fs.readFileSync('eas.json','utf8')).build;
  assert.equal(profiles['oficial-validada'].env.EXPO_PUBLIC_ENABLE_BATTERY_STUDY,'false');
  assert.equal(profiles['autonomia-instrumentada'].extends,'oficial-validada');
  assert.equal(profiles['autonomia-instrumentada'].env.EXPO_PUBLIC_ENABLE_BATTERY_STUDY,'true');
  assert.equal(profiles['oficial-validada'].env.EXPO_PUBLIC_ENABLE_INTERNAL_TOOLS,'false');
  const ui=fs.readFileSync('src/screens/AutonomyStudyModal.tsx','utf8');
  assert.match(ui,/height:windowHeight,maxHeight:windowHeight/);
  assert.match(ui,/paddingTop:top\+12,paddingBottom:bottom/);
  assert.match(ui,/nestedScrollEnabled removeClippedSubviews=\{false\} showsVerticalScrollIndicator scrollEnabled/);
  assert.match(ui,/scroll:\{flex:1,minHeight:0\}/);
  assert.match(ui,/if \(!BATTERY_STUDY_ENABLED \|\| !recorder \|\| !visible\) return null/);
  assert.doesNotMatch(ui,/toggleSomBle|resetarAlarmeBle|startRssiWatchdogExperiment/);
});
