// Organização limitada e reversível. Sem remoções nem sobrescritas.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const pairs = [
  ['hardware/case_3d/AUDITORIA_DIMENSIONAL_V2_4.md', 'hardware/case_3d/documentacao/revisoes/AUDITORIA_DIMENSIONAL_V2_4.md'],
  ['hardware/case_3d/REVISAO_ENCAIXE_2026-09-30.md', 'hardware/case_3d/documentacao/revisoes/REVISAO_ENCAIXE_2026-09-30.md'],
  ['hardware/case_3d/REVISAO_APOIOS_BOTAO_2026-10-02.md', 'hardware/case_3d/documentacao/revisoes/REVISAO_APOIOS_BOTAO_2026-10-02.md'],
  ['hardware/case_3d/revisao_bateria_pilares_v2_6.png', 'hardware/case_3d/documentacao/imagens/revisao_bateria_pilares_v2_6.png'],
  ['hardware/case_3d/revisao_pilares_perspectiva_v2_6.png', 'hardware/case_3d/documentacao/imagens/revisao_pilares_perspectiva_v2_6.png'],
];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'docs/auditoria/inventario-inicial.json'), 'utf8'));
const plan = pairs.map(([from, to]) => {
  const source = path.resolve(root, from), destination = path.resolve(root, to);
  if (![source, destination].every(file => file.startsWith(root + path.sep))) throw new Error('Destino fora da pasta do projeto');
  const initial = baseline.files.find(file => file.path === from);
  if (!initial) throw new Error('Arquivo ausente do inventário inicial: ' + from);
  if (!fs.existsSync(source)) {
    if (fs.existsSync(destination) && hash(destination) === initial.sha256) return { from, to, sha256: initial.sha256, alreadyMoved: true };
    throw new Error('Origem ausente sem destino equivalente: ' + from);
  }
  if (fs.existsSync(destination)) throw new Error('Não sobrescrever destino: ' + to);
  if (hash(source) !== initial.sha256) throw new Error('Origem alterada desde inventário: ' + from);
  return { from, to, sha256: initial.sha256, alreadyMoved: false };
});
if (process.argv.includes('--apply')) {
  const completed = [];
  try {
    for (const move of plan.filter(move => !move.alreadyMoved)) {
      fs.mkdirSync(path.dirname(path.join(root, move.to)), { recursive: true });
      fs.renameSync(path.join(root, move.from), path.join(root, move.to));
      completed.push(move);
      if (hash(path.join(root, move.to)) !== move.sha256) throw new Error('Verificação de integridade falhou: ' + move.to);
    }
    fs.writeFileSync(path.join(root, 'docs/auditoria/movimentos.json'), JSON.stringify({ moves: plan, originalsPreserved: true }, null, 2));
  } catch (error) {
    for (const move of completed.reverse()) fs.renameSync(path.join(root, move.to), path.join(root, move.from));
    throw error;
  }
}
console.log(JSON.stringify({ applied: process.argv.includes('--apply'), moves: plan }, null, 2));
