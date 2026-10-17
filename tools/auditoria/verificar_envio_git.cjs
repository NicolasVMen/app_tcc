// Pré-envio somente leitura: não imprime valores de possíveis segredos.
// Não substitui auditoria de segurança nem validação de cada documento/imagem.
const fs = require('node:fs');
const cp = require('node:child_process');
const args = process.argv.includes('--staged')
  ? ['diff','--cached','--name-only','--diff-filter=ACMR','-z']
  : ['ls-files','--cached','--others','--exclude-standard','-z'];
const files = [...new Set(cp.execFileSync('git',args,{encoding:'utf8'}).split('\0'))]
  .filter(file => file && fs.existsSync(file) && fs.statSync(file).isFile());
const patterns = [
  ['private-key', /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['oauth-access-token', /\bya29\.[A-Za-z0-9_-]{30,}/g],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}/g],
  ['openai-key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{35,}/g],
  ['service-account-json', /"type"\s*:\s*"service_account"/g],
];
const issues = [], large = [];
let bytes = 0;
for (const file of files) {
  const size = fs.statSync(file).size;
  bytes += size;
  if (size > 10 * 1024 * 1024) large.push({file,bytes:size});
  if (size >= 100 * 1024 * 1024) issues.push({file,rule:'github-file-size-limit'});
  if (/(^|\/)(node_modules|\.expo|dist|local_tools)(\/|$)|^backups\/releases\/|(^|\/)\.env(?:$|\.local$|\..*\.local$)|(^|\/)(credentials\.json|google-services\.json|GoogleService-Info\.plist)$|\.(jks|keystore|key|p12|apk|aab)$/i.test(file)) {
    issues.push({file,rule:'local-or-private-file'});
  }
  if (size > 10 * 1024 * 1024 || !(/\.(tsx?|jsx?|cjs|mjs|json|md|ya?ml|xml|ps1|py|ino|h|cpp|txt|log|csv|scad|gradle|properties)$/.test(file) || ['.npmrc','.env.example'].includes(file))) continue;
  const text = fs.readFileSync(file,'utf8');
  for (const [rule,regex] of patterns) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) issues.push({file,rule,line:text.slice(0,match.index).split('\n').length});
  }
}
console.log(JSON.stringify({ok:issues.length === 0,files:files.length,bytes,large,issues,
  scope:'Padrões de alto risco em texto e caminhos/tamanho. Não cobre segredos arbitrários, binários ou histórico remoto.'},null,2));
process.exitCode = issues.length ? 1 : 0;
