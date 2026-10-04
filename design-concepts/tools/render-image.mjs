// Renders an HTML/SVG/canvas artwork file to a JPEG with Chromium.
// Usage: node tools/render-image.mjs shared/images/src/empty-chair.html shared/images/empty-chair.jpg [width=2400] [height=1600] [quality=88]
// The page may set window.__done = true when asynchronous drawing finishes (otherwise waits for load + 300ms).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [input, output, w = '2400', h = '1600', q = '88'] = process.argv.slice(2);
if (!input || !output) { console.error('Usage: node tools/render-image.mjs <input.html> <output.jpg> [width] [height] [quality]'); process.exit(2); }
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${base}/${path.relative(ROOT, path.resolve(input)).split(path.sep).join('/')}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__done === true || document.readyState === 'complete', null, { timeout: 60000 });
await page.waitForTimeout(300);
if (await page.evaluate(() => 'window.__done' in window || typeof window.__done !== 'undefined')) await page.waitForFunction(() => window.__done === true, null, { timeout: 120000 });
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
await page.screenshot({ path: output, type: 'jpeg', quality: Number(q), clip: { x: 0, y: 0, width: Number(w), height: Number(h) } });
await browser.close(); server.close();
if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exit(1); }
console.log(`wrote ${output} (${w}×${h})`);
