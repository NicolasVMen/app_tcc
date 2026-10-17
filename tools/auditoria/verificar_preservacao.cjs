// Compara cada original com o inventário inicial, incluindo os cinco movimentos.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const folder = path.join(root, 'docs/auditoria');
const before = JSON.parse(fs.readFileSync(path.join(folder, 'inventario-inicial.json'), 'utf8'));
const after = JSON.parse(spawnSync(process.execPath, [path.join(__dirname, 'inventario.cjs')], {
  cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
}).stdout);
const moves = JSON.parse(fs.readFileSync(path.join(folder, 'movimentos.json'), 'utf8')).moves;
const expectedChanges = new Set(['README.md', 'docs/README.md', 'package.json', 'tools/test-monitor-alerts.cjs']);
const byPath = new Map(after.files.map(file => [file.path, file]));
const results = before.files.map(file => {
  const destination = moves.find(move => move.from === file.path)?.to || file.path;
  const current = byPath.get(destination);
  return { from: file.path, currentPath: destination,
    status: !current ? 'missing' : current.sha256 === file.sha256 ? 'preserved'
      : expectedChanges.has(file.path) ? 'expected-edit' : 'unexpected-edit' };
});
const issues = results.filter(result => ['missing', 'unexpected-edit'].includes(result.status));
const report = { checkedOriginals: results.length,
  preserved: results.filter(result => result.status === 'preserved').length,
  expectedEdits: results.filter(result => result.status === 'expected-edit'), issues,
  moved: moves.length, results };
fs.writeFileSync(path.join(folder, 'preservacao.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ checkedOriginals: report.checkedOriginals, preserved: report.preserved,
  expectedEdits: report.expectedEdits, moved: report.moved, issues }, null, 2));
process.exitCode = issues.length ? 1 : 0;
