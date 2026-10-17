// Auditoria somente leitura: não move, apaga, instala ou modifica arquivos.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const skipped = [];
const files = [];
const ignore = relative => relative === '.git' || relative === 'node_modules'
  || relative === '.expo' || relative === 'local_tools'
  || relative === 'docs/cicted/banner/ferramentas/vendor'
  || /(^|\/)(__pycache__|\.gradle|\.cxx|build[^/]*)(\/|$)/.test(relative);
const textExtensions = new Set(['.ts','.tsx','.kt','.h','.ino','.cjs','.js','.mjs',
  '.json','.md','.py','.ps1','.cmd','.gradle','.properties','.xml','.scad','.txt','.svg']);
function classify(relative) {
  if (relative.startsWith('android/')) return 'android-local-gerado';
  if (relative.startsWith('src/')) return relative.includes('PatrolScreen') ? 'app-legado' : 'app';
  if (relative.startsWith('modules/')) return 'android-nativo-fonte';
  if (relative.startsWith('firmware/esp32')) return 'firmware-legado';
  if (relative.startsWith('firmware/')) return 'firmware-atual';
  if (relative.startsWith('hardware/case_3d/historico/')) return 'hardware-historico-local';
  if (relative.startsWith('hardware/')) return 'hardware';
  if (relative.startsWith('CICTED/')) return 'entrega-cicted-raiz';
  if (relative.startsWith('docs/')) return 'documentacao';
  if (relative.startsWith('tools/')) return 'ferramentas';
  if (relative.startsWith('assets/')) return 'recursos-app';
  return 'configuracao-raiz';
}
function visit(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, item.name);
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    if (item.isSymbolicLink()) { skipped.push({ path: relative, reason: 'link' }); continue; }
    if (item.isDirectory()) {
      if (ignore(relative)) skipped.push({ path: relative, reason: 'dependencia-ou-gerado' });
      else visit(absolute);
      continue;
    }
    if (!item.isFile()) continue;
    const bytes = fs.readFileSync(absolute);
    const extension = path.extname(relative).toLowerCase();
    files.push({ path: relative, category: classify(relative), bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      lines: textExtensions.has(extension) ? bytes.toString('utf8').split(/\r?\n/).length : null });
  }
}
visit(root);
files.sort((a,b) => a.path.localeCompare(b.path));
const byHash = new Map();
for (const file of files) {
  if (!file.bytes) continue;
  if (!byHash.has(file.sha256)) byHash.set(file.sha256, []);
  byHash.get(file.sha256).push(file.path);
}
const counts = {};
for (const file of files) counts[file.category] = (counts[file.category] || 0) + 1;
process.stdout.write(JSON.stringify({ schema: 1, files, counts, skipped,
  duplicates: [...byHash.values()].filter(paths => paths.length > 1) }, null, 2));
