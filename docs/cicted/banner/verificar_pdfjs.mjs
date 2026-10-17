// Prova de abertura/renderização num segundo leitor independente (PDF.js).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const dependencies = 'C:/Users/Nicolas Venciguerra/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const require = createRequire(path.join(dependencies, 'package.json'));
const canvas = require('@napi-rs/canvas');
for (const key of ['DOMMatrix', 'ImageData', 'Path2D']) {
  if (canvas[key]) globalThis[key] = canvas[key];
}
class CanvasFactory {
  create(width, height) {
    const surface = canvas.createCanvas(Math.ceil(width), Math.ceil(height));
    return { canvas: surface, context: surface.getContext('2d') };
  }
  reset(item, width, height) { item.canvas.width = width; item.canvas.height = height; }
  destroy(item) { item.canvas.width = item.canvas.height = 0; item.canvas = item.context = null; }
}
const pdfjs = await import(pathToFileURL(path.join(dependencies, 'pdfjs-dist/legacy/build/pdf.mjs')).href);
const input = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
const pdf = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(input)),
  CanvasFactory, disableFontFace: true, useSystemFonts: false,
  standardFontDataUrl: dependencies + '/pdfjs-dist/standard_fonts/' }).promise;
const page = await pdf.getPage(1);
const size = page.getViewport({ scale: 1 });
const viewport = page.getViewport({ scale: 1800 / size.width });
const target = new CanvasFactory().create(viewport.width, viewport.height);
await page.render({ canvasContext: target.context, viewport }).promise;
fs.writeFileSync(output, target.canvas.toBuffer('image/png'));
const pixels = target.context.getImageData(0, 0, target.canvas.width, target.canvas.height).data;
let nonWhite = 0;
for (let i = 0; i < pixels.length; i += 4) {
  if (pixels[i] < 245 || pixels[i + 1] < 245 || pixels[i + 2] < 245) nonWhite++;
}
console.log(JSON.stringify({ input, pages: pdf.numPages, width: size.width, height: size.height,
  nonWhitePercent: 100 * nonWhite / (pixels.length / 4), output }));
if (nonWhite < pixels.length / 400) throw new Error('O PDF parece estar em branco.');
await pdf.destroy();
