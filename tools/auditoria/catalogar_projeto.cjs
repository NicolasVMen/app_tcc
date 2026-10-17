// Catálogo, referências locais e sintaxe. Não executa fontes/geradores do projeto.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const { isBuiltin } = require('node:module');
const root = path.resolve(__dirname, '../..');
const inventory = JSON.parse(spawnSync(process.execPath, [path.join(__dirname, 'inventario.cjs')], {
  cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
}).stdout);
const roles = {
  'App.tsx': 'Entrada React, autenticação, navegação e instância única do monitor.',
  'package.json': 'Dependências e comandos npm; não contém servidor próprio.',
  'package-lock.json': 'Árvore travada de dependências npm.',
  'app.json': 'Configuração Expo, identidade Android, permissões e plugins nativos.',
  'eas.json': 'Perfis de compilação development/preview/production.',
  'babel.config.js': 'Transformação Babel com preset Expo.',
  'tsconfig.json': 'Configuração de tipagem TypeScript.',
  'src/hooks/useEsp32Monitor.ts': 'Orquestra BLE, estados, pausa, reconexão, alarmes, bateria e registros.',
  'src/services/bleApi.ts': 'GATT, permissões, scan, RSSI, comandos e observadores de ensaio.',
  'src/services/backgroundSentinel.ts': 'Ponte JS para serviço Android opcional.',
  'src/services/notificationService.ts': 'Permissão, canais e notificações Expo locais.',
  'src/services/firebaseConfig.ts': 'Inicialização e persistência Firebase Authentication.',
  'src/context/AppPreferencesContext.tsx': 'Preferências globais persistidas e tema.',
  'src/theme.ts': 'Paletas, cores e helpers visuais.',
  'src/utils/proximityTrial.ts': 'Regras puras de coleta, validação, estatística, CSV e histórico de ensaios.',
  'src/screens/AuthScreen.tsx': 'Login, criação de conta, perfil local e recuperação de senha.',
  'src/screens/DashboardScreen.tsx': 'Central: estado, estimativa, bateria e prontidão.',
  'src/screens/SettingsScreen.tsx': 'Perfil, preferências, pausa e diagnóstico.',
  'src/screens/AlertsScreen.tsx': 'Exibição, compartilhamento e limpeza confirmada de registros.',
  'src/screens/ManualScreen.tsx': 'Orientações e limites do protótipo.',
  'src/screens/PatrolScreen.tsx': 'Tela legada, sem importação na navegação ativa.',
  'src/screens/SystemDiagnosticsModal.tsx': 'Checagens observáveis, relatório e testes manuais.',
  'src/screens/ProximityTrialModal.tsx': 'Interface de ensaio com trena e coleta de RSSI.',
  'firmware/xiao_escolta_ble/xiao_escolta_ble.ino': 'Firmware atual XIAO: GATT, bateria, botão, LED, buzzer e loop.',
  'firmware/xiao_escolta_ble/ProximitySignal.h': 'Filtro mediana/EMA, histerese e confirmação temporal p1/p2.',
  'firmware/xiao_escolta_ble/ProximityDistance.h': 'Escala experimental p2 de RSSI para metros.',
  'firmware/esp32_escolta_ble/esp32_escolta_ble.ino': 'Firmware legado, política antiga; não gravar na XIAO.',
  'hardware/case_3d/escolta_case_v2.scad': 'Fonte paramétrica atual da caixa e peças, com componentes ilustrativos.',
};
function role(file) {
  if (roles[file.path]) return roles[file.path];
  if (file.path.endsWith('EscoltaSentinelaService.kt')) return 'Serviço Android de primeiro plano, alarme nativo e tolerância por Handler; não lê GATT.';
  if (file.path.endsWith('EscoltaSentinelaModule.kt')) return 'Métodos Expo que encaminham comandos ao serviço Android.';
  if (file.category === 'android-local-gerado') return 'Projeto Android local gerado pelo Expo; não é a fonte persistente do módulo customizado.';
  if (file.path.startsWith('hardware/case_3d/PARA_IMPRIMIR_AGORA/')) return 'Entrega atual de impressão ou instruções; não mover sem atualizar referências.';
  if (file.path.includes('/historico/')) return 'Histórico preservado; não selecionar para entrega atual.';
  if (file.path.includes('/dados/')) return 'Dados/fixtures experimentais preservados; não sobrescrever com resultados simulados.';
  if (file.path.startsWith('CICTED/')) return 'Cópia de entrega/anotação do usuário; pode divergir da pasta de impressão.';
  if (/\.(py|ps1|cjs|mjs|cmd)$/.test(file.path)) return 'Utilitário: ' + path.basename(file.path) + '; conferir entradas/saídas antes de executar.';
  if (/\.(md|txt)$/.test(file.path)) return 'Documento de apoio, instruções ou relatório; versões antigas não são especificação atual.';
  if (/\.(docx|pptx|pdf)$/.test(file.path)) return 'Artefato acadêmico; integridade estrutural verificada separadamente, conteúdo não certificado nesta auditoria.';
  if (/\.(png|jpe?g|svg)$/.test(file.path)) return 'Imagem/foto/recurso visual; não é fonte de firmware nem de aplicativo.';
  if (file.path.endsWith('.wav')) return 'Áudio local de alerta; cópia em res/raw é intencional para o serviço Android.';
  if (file.path.endsWith('.stl')) return 'Malha 3D; somente PARA_IMPRIMIR_AGORA define a entrega atual.';
  return 'Arquivo de apoio/configuração: ' + file.category;
}
const sourceChecks = [], imports = [], brokenLinks = [];
for (const file of inventory.files) {
  if (file.path.startsWith('docs/auditoria/')) continue;
  const absolute = path.join(root, file.path);
  if (/\.(tsx?|cjs|mjs|js)$/.test(file.path)) {
    const text = fs.readFileSync(absolute, 'utf8');
    const source = ts.createSourceFile(absolute, text, ts.ScriptTarget.Latest, true);
    sourceChecks.push({ path: file.path, errors: source.parseDiagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')) });
    function visit(node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        const resolved = ts.resolveModuleName(specifier, absolute, { moduleResolution: ts.ModuleResolutionKind.Node10, jsx: ts.JsxEmit.ReactJSX }, ts.sys).resolvedModule;
        const asset = path.resolve(path.dirname(absolute), specifier);
        imports.push({ from: file.path, import: specifier,
          resolved: isBuiltin(specifier) || !!resolved || fs.existsSync(asset),
          target: resolved ? path.relative(root, resolved.resolvedFileName).split(path.sep).join('/') : null });
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  if (file.path.endsWith('.md')) {
    const text = fs.readFileSync(absolute, 'utf8');
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const link = match[1].replace(/^<|>$/g, '').split('#')[0];
      if (!link || /^(https?:|mailto:|codex:|plugin:)/i.test(link)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(absolute), link))) brokenLinks.push({ from: file.path, link });
    }
  }
}
const directory = path.join(root, 'docs/auditoria');
fs.mkdirSync(directory, { recursive: true });
const report = { files: inventory.files.filter(f => !f.path.startsWith('docs/auditoria/')).map(f => ({...f, role: role(f)})),
  skipped: inventory.skipped, duplicates: inventory.duplicates, sourceChecks, imports, brokenLinks,
  limits: 'Mapa por arquivo e sintaxe; não significa leitura manual de cada documento histórico ou certificação de conteúdo.' };
fs.writeFileSync(path.join(directory, 'catalogo.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(directory, 'CATALOGO_ARQUIVOS.md'), '# Catálogo de arquivos\n\nGerado por `tools/auditoria/catalogar_projeto.cjs`. Caminhos relativos à raiz.\n\n' +
  report.files.map(f => `- \`${f.path}\` — ${f.role}`).join('\n') + '\n');
console.log(JSON.stringify({ files: report.files.length,
  syntaxErrors: sourceChecks.filter(c => c.errors.length), unresolvedImports: imports.filter(i => !i.resolved), brokenLinks }, null, 2));
process.exitCode = sourceChecks.some(c => c.errors.length) || imports.some(i => !i.resolved) || brokenLinks.length ? 1 : 0;
