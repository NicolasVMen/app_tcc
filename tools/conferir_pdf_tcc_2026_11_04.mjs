import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const dependency = path.join(process.env.LOCALAPPDATA, '..', '..', '.cache');
// Caminho do runtime fornecido pela integração do aplicativo, não por download arbitrário.
const lib = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/legacy/build/pdf.mjs');
const pdfjs = await import(pathToFileURL(lib));
const file = path.join(root, 'docs/tcc/TCC_Escolta_UNITAU_ATUALIZADO_2026-11-04.pdf');
const document = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: true }).promise;
const pages = [];
const full = [];
for (let i=1;i<=document.numPages;i++) {
  const page = await document.getPage(i);
  const content = await page.getTextContent();
  const items = content.items.filter(x => typeof x.str === 'string' && x.str.trim());
  const text = items.map(x => x.str).join(' ');
  const out = items.filter(x => x.transform[4] < -1 || x.transform[5] < -1 || x.transform[4]+x.width > page.view[2]+1 || x.transform[5] > page.view[3]+1);
  pages.push({page:i,characters:text.length,first:text.slice(0,110),last:text.slice(-110),outsidePage:out.map(x=>x.str), minY:Math.min(...items.map(x=>x.transform[5])),maxX:Math.max(...items.map(x=>x.transform[4]+x.width))});
  full.push(`\n===== PÁGINA ${i} =====\n${text}`);
}
const text = full.join('\n');
const absent = ['Capítulo reservado', 'A etapa seguinte deste capítulo', 'Zhang et al. (2020)', 'referência utilizada é -71', '[[GATT]]'].filter(x=>text.includes(x));
const report = {pages:document.numPages,emptyPages:pages.filter(x=>x.characters<5).map(x=>x.page),outsidePage:pages.filter(x=>x.outsidePage.length).map(x=>x.page),obsoleteFragments:absent,pagesInfo:pages};
fs.writeFileSync(path.join(root,'docs/tcc/VERIFICACAO_PDF_2026-11-04.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(root,'.expo/tcc-revisao-2026-11-04/pdf_extraido.txt'),text);
console.log(JSON.stringify(report,null,2));
if (absent.length || report.emptyPages.length || report.outsidePage.length) process.exitCode=1;
await document.destroy();
