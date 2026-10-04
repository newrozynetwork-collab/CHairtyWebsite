// Copies latin woff2 files from @fontsource packages into shared/fonts and writes shared/fonts.css
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('node_modules/@fontsource');
const out = path.resolve('shared/fonts');
let css = '/* Open-licence fonts (SIL OFL 1.1 unless noted) copied from @fontsource packages. */\n';
const inventory = [];
for (const id of fs.readdirSync(root).sort()) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, id, 'package.json'), 'utf8'));
  const meta = fs.existsSync(path.join(root, id, 'metadata.json')) ? JSON.parse(fs.readFileSync(path.join(root, id, 'metadata.json'), 'utf8')) : null;
  const family = meta?.family || id.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
  const files = fs.readdirSync(path.join(root, id, 'files')).filter(f => /-latin-\d+-(normal|italic)\.woff2$/.test(f));
  fs.mkdirSync(path.join(out, id), { recursive: true });
  const weights = new Set(); let italics = false;
  for (const f of files) {
    const [, w, style] = f.match(/-latin-(\d+)-(normal|italic)\.woff2$/);
    fs.copyFileSync(path.join(root, id, 'files', f), path.join(out, id, f));
    css += `@font-face{font-family:'${family}';font-style:${style};font-weight:${w};font-display:block;src:url('fonts/${id}/${f}') format('woff2');}\n`;
    weights.add(Number(w)); if (style === 'italic') italics = true;
  }
  inventory.push({ family, id, license: pkg.license, weights: [...weights].sort((a, b) => a - b), italics });
}
fs.writeFileSync(path.resolve('shared/fonts.css'), css);
fs.writeFileSync(path.resolve('shared/fonts.json'), JSON.stringify(inventory, null, 1));
console.log(inventory.map(i => `${i.family} [${i.weights.join(',')}]${i.italics ? ' +italic' : ''} ${i.license}`).join('\n'));
