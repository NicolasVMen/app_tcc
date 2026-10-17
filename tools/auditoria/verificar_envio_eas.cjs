// Inspeção local, somente leitura. Não envia arquivos nem acessa credenciais EAS.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const core = ['App.tsx','package.json','package-lock.json','app.json','eas.json',
  'tsconfig.json','babel.config.js','metro.config.js','.npmrc','.easignore'];
const forbidden = /(^|\/)(node_modules|build|\.gradle|\.git|CICTED|Fotos_Placa|backups|docs)(\/|$)|(^|\/)(\.env[^/]*|credentials\.json|google-services\.json|GoogleService-Info\.plist)$|\.(jks|keystore|key|p12|csv|docx|pptx|pdf|log)$/i;
function allowed(file) {
  return !forbidden.test(file) && (core.includes(file)
    || /^(src|assets|modules)\//.test(file) || /^tools\/(plugins|android)\//.test(file));
}
function inspectArchive(archiveRoot, projectRoot = path.resolve(__dirname, '../..')) {
  const issues = [], entries = [], expected = [...core];
  const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  function scan(root, relative, visit, skipGenerated = false) {
    const target = path.join(root, relative);
    if (!fs.existsSync(target)) { issues.push(`Ausente: ${relative || 'diretório de arquivo'}`); return; }
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink()) { issues.push(`Link simbólico não aprovado: ${relative}`); return; }
    if (stat.isDirectory()) {
      if (skipGenerated && relative && /(^|\/)(build|node_modules|\.gradle)$/.test(relative)) return;
      for (const child of fs.readdirSync(target).sort()) scan(root, relative ? `${relative}/${child}` : child, visit, skipGenerated);
    } else visit(relative, target);
  }
  for (const folder of ['src','assets','modules','tools/plugins','tools/android']) {
    scan(projectRoot, folder, file => { if (allowed(file)) expected.push(file); }, true);
  }
  scan(archiveRoot, '', (file, target) => {
    if (!allowed(file)) issues.push(`Arquivo não autorizado: ${file}`);
    const bytes = fs.readFileSync(target);
    entries.push({ path: file, bytes: bytes.length, sha256: hash(bytes) });
    const source = path.join(projectRoot, file);
    if (!fs.existsSync(source) || !bytes.equals(fs.readFileSync(source))) issues.push(`Diferente da fonte atual: ${file}`);
  });
  for (const file of expected) if (!entries.some(entry => entry.path === file)) issues.push(`Fonte necessária ausente no envio: ${file}`);
  entries.sort((a,b) => a.path.localeCompare(b.path));
  return { ok: issues.length === 0, issues, files: entries.length,
    bytes: entries.reduce((sum,entry) => sum + entry.bytes,0),
    manifestSha256: hash(JSON.stringify(entries)),
    scope: 'Arquivo local de envio, comparado às fontes atuais; não aprova APK nem execução.' };
}
module.exports = { allowed, inspectArchive };
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Informe o diretório gerado por eas build:inspect --stage archive.');
  const report = inspectArchive(path.resolve(process.argv[2]));
  console.log(JSON.stringify(report,null,2));
  process.exitCode = report.ok ? 0 : 1;
}
