// Consulta o registro npm, sem instalar/atualizar pacotes ou executar scripts.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const result = spawnSync(process.execPath, [npmCli, 'audit', '--json', '--ignore-scripts'], {
  cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', timeout: 120000,
  maxBuffer: 8 * 1024 * 1024,
});
let report;
try {
  const raw = JSON.parse(result.stdout);
  report = { exitCode: result.status, metadata: raw.metadata,
    error: raw.error || result.error?.message || null,
    vulnerabilities: Object.values(raw.vulnerabilities || {}).map(v => ({
      name: v.name, severity: v.severity, direct: v.isDirect, range: v.range,
      advisories: v.via.filter(x => typeof x === 'object').map(x => ({ title: x.title, url: x.url, range: x.range })),
      viaPackages: v.via.filter(x => typeof x === 'string'), fixAvailable: v.fixAvailable,
    })),
  };
} catch (error) { report = { error: String(result.error || error), stderr: result.stderr, exitCode: result.status }; }
const saveAs = process.argv.find(arg => arg.startsWith('--save-as='))?.slice('--save-as='.length);
if (saveAs && !/^[A-Za-z0-9._-]+\.json$/.test(saveAs)) throw new Error('Nome de relatório inválido.');
if (process.argv.includes('--save') || saveAs) {
  const target = path.resolve(__dirname, '../../docs/auditoria');
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, saveAs || 'dependencias.json'), JSON.stringify(report, null, 2));
}
process.stdout.write(JSON.stringify(report, null, 2));
process.exitCode = report.error ? 2 : 0;
