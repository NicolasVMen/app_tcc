const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const read = file => fs.readFileSync(file, 'utf8');
const appVersion = JSON.parse(read('app.json')).expo.version;

// Executa o SettingsScreen real em árvore JSX simples; sem telefone, conta ou rede.
function settingsTree(internalTools, staleInternalState = false) {
  let stateIndex = 0;
  const jsx = (type, props) => ({ type, props: props || {} });
  const react = { useMemo: fn => fn(), useCallback: fn => fn, useEffect() {},
    useRef: value => ({ current: value }),
    useState: value => {
      const index = stateIndex++;
      const initial = typeof value === 'function' ? value() : value;
      return [index === 1 ? false : staleInternalState && [12, 13].includes(index) ? true : initial, () => {}];
    } };
  const native = { StyleSheet: { create: value => value } };
  for (const name of ['ActivityIndicator','Alert','BackHandler','Linking','ScrollView','Switch','Text','TextInput','TouchableOpacity','View']) native[name] = name;
  const dependencies = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-native': native,
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '../services/accountStorage': { subscribeAccountStorage() {} }, 'firebase/auth': {},
    '../services/firebaseConfig': { auth: { currentUser: { email: 'responsavel@exemplo.com' } } },
    '../context/AppPreferencesContext': { useAppPreferences: () => ({ colors: {}, preferences: { themeMode: 'dark' } }) },
    '../theme': { colorWithAlpha: () => 'color' },
    '../utils/authValidation': { isValidEmail: () => true, normalizeEmail: value => value },
    '../services/emergencyEmail': { canSendEmergencyEmail: () => false },
    '../services/googleAuth': {},
    '../services/nativeIdentity': { INTERNAL_TOOLS_ENABLED: internalTools, APP_DISPLAY_NAME: 'Escolta UNITAU' },
    '../../app.json': { expo: { version: appVersion } },
    './SystemDiagnosticsModal': { default: 'SystemDiagnosticsModal', __esModule: true },
  };
  const context = { exports: {}, require: name => {
    assert.ok(name in dependencies, `Import não simulado: ${name}`); return dependencies[name];
  } };
  const code = ts.transpileModule(read('src/screens/SettingsScreen.tsx'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, context);
  const root = context.exports.default({ deviceStandby: true, diagnosticsMonitor: {},
    onOpenProximityTrial() {}, onPauseMonitoring() {}, onResumeMonitoring() {} });
  const texts = [], nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node === 'string' || typeof node === 'number') { texts.push(String(node)); return; }
    if (!node || typeof node !== 'object') return;
    if (typeof node.type === 'function') return visit(node.type(node.props));
    nodes.push(node); visit(node.props.children);
  }
  visit(root); return { texts: texts.join('\n'), nodes };
}

test('tela Sistema em uso normal não mostra ensaios, sirene, e-mail de teste nem área técnica', () => {
  for (const stale of [false, true]) {
    const ui = settingsTree(false, stale);
    for (const text of ['Verificar prontidão','Ensaio de proximidade','Enviar e-mail de teste','Área acadêmica','VERSÃO PARA VALIDAÇÃO']) {
      assert.ok(!ui.texts.includes(text), text);
    }
    for (const text of ['Conexão automática','Alertas de emergência','Vibração','E-mail para alertas','Cadastrar e-mail','Restaurar preferências','Sair da conta']) {
      assert.ok(ui.texts.toLowerCase().includes(text.toLowerCase()), text);
    }
    assert.ok(!ui.nodes.some(node => node.type === 'SystemDiagnosticsModal'));
    assert.ok(ui.texts.includes(`Escolta UNITAU v${appVersion}`));
  }
});

test('opt-in de desenvolvimento preserva ensaio, diagnóstico e e-mail manual sem apagar o código', () => {
  const ui = settingsTree(true);
  for (const text of ['Verificar prontidão','Ensaio de proximidade','Enviar e-mail de teste']) assert.ok(ui.texts.includes(text), text);
});

test('rotas internas não são montadas na raiz e não criam coleta por trás da interface de uso', () => {
  const app = read('App.tsx');
  assert.match(app, /\{INTERNAL_TOOLS_ENABLED && <ProximityTrialModal/);
  assert.match(app, /onOpenProximityTrial=\{\(\) => \{ if \(INTERNAL_TOOLS_ENABLED\)/);
  const modal = read('src/screens/ProximityTrialModal.tsx');
  assert.match(modal, /const loadHistory = useCallback\(async \(\) => \{\s*if \(!INTERNAL_TOOLS_ENABLED\) return/);
  assert.match(modal, /if \(!INTERNAL_TOOLS_ENABLED \|\| !visible\) return/);
  assert.match(read('src/screens/SystemDiagnosticsModal.tsx'), /if \(!INTERNAL_TOOLS_ENABLED \|\| !visible\) return null/);
});

test('mensagens de uso deixam de pedir versão de teste ou servidor e mantêm limitações reais', () => {
  for (const file of ['App.tsx','src/screens/AuthScreen.tsx','src/screens/DashboardScreen.tsx',
    'src/screens/ManualScreen.tsx','src/screens/AlertsScreen.tsx','src/utils/authValidation.ts']) {
    const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if (ts.isStringLiteral(node) || ts.isJsxText(node)) {
        assert.doesNotMatch(node.text, /VERSÃO DE TESTE|VERSÃO PARA VALIDAÇÃO|PROTÓTIPO ACADÊMICO|servidor de desenvolvimento|nova versão de teste/i, file);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  assert.match(read('src/screens/ManualScreen.tsx'), /Pessoas, paredes, objetos metálicos/);
  assert.match(read('src/screens/ManualScreen.tsx'), /não substitui a supervisão/);
  assert.match(read('src/screens/SettingsScreen.tsx'), /não garante o recebimento/);
  assert.match(read('src/screens/SettingsScreen.tsx'), /Não representa a posição exata da criança/);
});
