// Usage: node scripts/stills.mjs 120 450 2100 ...   -> out/stills/f<frame>.png
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frames = process.argv.slice(2).map(Number);
const outDir = path.join(root, 'out', 'stills');
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, 'src', 'index.ts'), onProgress: () => {}});
const comp = await selectComposition({serveUrl, id: 'NimInkDemo'});
for (const frame of frames) {
  const output = path.join(outDir, `f${String(frame).padStart(5, '0')}.png`);
  await renderStill({composition: comp, serveUrl, frame, output, scale: 0.5});
  console.log('wrote', output);
}
