// Renders one concept's pages with Chromium, runs automated QA checks and writes captures.
// Usage: node tools/capture.mjs concepts/03-research-evidence [--only home-desktop,home-mobile,story,components] [--no-review]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { GEOMETRY, planDesktopSplit, planMobileColumns } from './geometry.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const conceptArg = args.find(a => !a.startsWith('--'));
if (!conceptArg) { console.error('Usage: node tools/capture.mjs concepts/<id> [--only a,b] [--no-review]'); process.exit(2); }
const conceptDir = path.resolve(conceptArg);
const rel = path.relative(ROOT, conceptDir).split(path.sep).join('/');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? new Set(args[onlyIdx + 1].split(',')) : null;
const review = !args.includes('--no-review');
const outDir = path.join(conceptDir, 'captures');
const reviewDir = path.join(outDir, 'review');
fs.mkdirSync(outDir, { recursive: true });
if (review) { fs.rmSync(reviewDir, { recursive: true, force: true }); fs.mkdirSync(reviewDir, { recursive: true }); }

// --- tiny static server so fonts/images load over http (file:// blocks web fonts) ---
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.gif': 'image/gif' };
const missing = new Set();
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { missing.add(p); res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const TARGETS = [
  { id: 'home-desktop', file: 'index.html', width: GEOMETRY.desktopWidth, height: 900 },
  { id: 'home-mobile', file: 'index.html', width: GEOMETRY.mobileWidth, height: 844, mobile: true },
  { id: 'story', file: 'story.html', width: GEOMETRY.desktopWidth, height: 900 },
  { id: 'components', file: 'components.html', width: GEOMETRY.desktopWidth, height: 400, element: '#components' },
];

// In-page QA, runs after fonts/images settle.
function pageQA() {
  const vw = document.documentElement.clientWidth;
  const out = { height: Math.ceil(document.documentElement.scrollHeight), scrollWidth: document.documentElement.scrollWidth, viewport: vw };
  // sections
  out.sections = [...document.querySelectorAll('[data-section]')].filter(el => !el.parentElement.closest('[data-section]')).map(el => {
    const r = el.getBoundingClientRect();
    return { name: el.getAttribute('data-section'), top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), height: Math.round(r.height) };
  });
  // horizontal overflow offenders (visible elements poking outside the viewport)
  const offenders = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.right > vw + 1 || r.left < -1) {
      let clipped = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (/(hidden|clip|auto|scroll)/.test(cs.overflowX)) { const ar = a.getBoundingClientRect(); if (ar.right <= vw + 1 && ar.left >= -1) { clipped = true; break; } }
      }
      if (!clipped) offenders.push({ el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''), left: Math.round(r.left), right: Math.round(r.right) });
    }
  }
  out.overflow = offenders.slice(0, 12);
  // images
  out.brokenImages = [...document.images].filter(i => i.loading !== 'lazy' || i.complete).filter(i => !i.complete || !i.naturalWidth).map(i => i.getAttribute('src'));
  // fonts: first family of every text-bearing element
  const fams = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let textChars = 0;
  while (walker.nextNode()) {
    const t = walker.currentNode; const s = t.textContent.trim(); if (!s) continue;
    const el = t.parentElement; const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    textChars += s.length;
    const fam = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
    const key = `${fam}|${cs.fontWeight}|${cs.fontStyle}`;
    fams.set(key, (fams.get(key) || 0) + s.length);
  }
  const generic = new Set(['serif', 'sans-serif', 'monospace', 'system-ui', 'cursive', 'fantasy', 'ui-sans-serif', 'ui-serif']);
  out.fonts = [];
  for (const [key, chars] of fams) {
    const [fam, weight, style] = key.split('|');
    const loadedFaces = [...document.fonts].filter(f => f.family.replace(/^["']|["']$/g, '') === fam && f.status === 'loaded');
    const anyFace = [...document.fonts].some(f => f.family.replace(/^["']|["']$/g, '') === fam);
    const exactWeight = loadedFaces.some(f => String(f.weight) === String(weight) && f.style === style);
    out.fonts.push({ family: fam, weight, style, chars, declared: anyFace, loaded: loadedFaces.length > 0, exactFace: exactWeight, generic: generic.has(fam) });
  }
  out.fonts.sort((a, b) => b.chars - a.chars);
  // placeholder / leftover text
  const body = document.body.innerText;
  out.placeholderHits = [...new Set([...(body.match(/\blorem\b|\bipsum\b|\bTODO\b|\bTBD\b|\bFIXME\b|placeholder text|\bx{3,}\b|\[insert/gi) || []), ...(body.match(/\bundefined\b|\bNaN\b|\[object Object\]/g) || [])].map(s => s.toLowerCase()))];
  // contrast check on solid backgrounds
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lowContrast = [];
  const seen = new Set();
  const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w2.nextNode()) {
    const t = w2.currentNode; const s = t.textContent.trim(); if (s.length < 2) continue;
    const el = t.parentElement; if (seen.has(el)) continue; seen.add(el);
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const rect = el.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
    let fg = parse(cs.color); if (!fg) continue;
    let bg = null; let overImage = false;
    const layers = [];
    for (let a = el; a; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (acs.backgroundImage && acs.backgroundImage !== 'none') { overImage = true; break; }
      const c = parse(acs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    if (overImage) continue;
    // elements positioned over an <img>/<picture>/<video>/<canvas>/<svg> sibling are treated as over-image
    let base = { r: 255, g: 255, b: 255, a: 1 };
    bg = layers.reverse().reduce((acc, l) => blend(l, acc), base);
    if (fg.a < 1) fg = blend(fg, bg);
    const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize); const bold = Number(cs.fontWeight) >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    if (ratio < need) {
      // skip if something visual sits underneath (absolute text on imagery)
      const mid = document.elementsFromPoint(rect.left + rect.width / 2, Math.min(rect.top + rect.height / 2, innerHeight - 1));
      if (mid.some(m => /^(IMG|PICTURE|VIDEO|CANVAS|svg)$/i.test(m.tagName) && m !== el)) continue;
      lowContrast.push({ text: s.slice(0, 60), ratio: Math.round(ratio * 100) / 100, need, size: cs.fontSize, color: cs.color });
    }
  }
  out.lowContrast = lowContrast.slice(0, 15);
  out.textChars = textChars;
  return out;
}

const browser = await chromium.launch();
const report = { concept: rel, generatedAt: new Date().toISOString(), geometry: GEOMETRY, targets: {}, problems: [], warnings: [] };
const external = [];
for (const t of TARGETS) {
  if (only && !only.has(t.id)) continue;
  const src = path.join(conceptDir, t.file);
  if (!fs.existsSync(src)) { report.problems.push(`${t.id}: missing ${t.file}`); continue; }
  const ctx = await browser.newContext({ viewport: { width: t.width, height: t.height }, deviceScaleFactor: 2, isMobile: !!t.mobile, hasTouch: !!t.mobile });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => consoleErrors.push(String(e).slice(0, 200)));
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    external.push(u); return route.abort();
  });
  await page.goto(`${BASE}/${rel}/${t.file}`, { waitUntil: 'load' });
  // trigger lazy content, then return to top
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); }
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
  });
  await page.waitForTimeout(250);
  const qa = await page.evaluate(pageQA);
  qa.consoleErrors = consoleErrors;
  report.targets[t.id] = qa;
  if (t.element) {
    const el = await page.$(t.element);
    if (!el) report.problems.push(`${t.id}: no ${t.element} element`);
    else {
      const box = await el.boundingBox();
      qa.element = { width: Math.round(box.width), height: Math.round(box.height) };
      await el.screenshot({ path: path.join(outDir, `${t.id}.png`) });
      if (box.width > GEOMETRY.componentsMax.width || box.height > GEOMETRY.componentsMax.height) report.problems.push(`${t.id}: #components is ${Math.round(box.width)}×${Math.round(box.height)} css px; max ${GEOMETRY.componentsMax.width}×${GEOMETRY.componentsMax.height}`);
    }
  } else {
    await page.screenshot({ path: path.join(outDir, `${t.id}.jpg`), fullPage: true, type: 'jpeg', quality: 86 });
    if (review) {
      // 1x review slices for visual QA by humans/agents
      const ctx1 = await browser.newContext({ viewport: { width: t.width, height: t.height }, deviceScaleFactor: t.mobile ? 2 : 1, isMobile: !!t.mobile, hasTouch: !!t.mobile });
      const p1 = await ctx1.newPage();
      await p1.route('**/*', route => route.request().url().startsWith(BASE) ? route.continue() : route.abort());
      await p1.goto(`${BASE}/${rel}/${t.file}`, { waitUntil: 'load' });
      await p1.evaluate(async () => { await document.fonts.ready; });
      await p1.waitForTimeout(200);
      const H = qa.height; const step = t.mobile ? 820 : 1000; let i = 1;
      for (let y = 0; y < H; y += step) {
        const h = Math.min(step + (t.mobile ? 24 : 40), H - y);
        await p1.screenshot({ path: path.join(reviewDir, `${t.id}-${String(i).padStart(2, '0')}.jpg`), fullPage: true, type: 'jpeg', quality: 80, clip: { x: 0, y, width: t.width, height: h } });
        i++;
      }
      await ctx1.close();
    }
  }
  // per-target checks
  const id = t.id;
  if (qa.scrollWidth > qa.viewport + 1) report.problems.push(`${id}: horizontal scroll (scrollWidth ${qa.scrollWidth} > ${qa.viewport})`);
  if (qa.overflow.length) report.warnings.push(`${id}: elements extend past the viewport: ${qa.overflow.slice(0, 5).map(o => `${o.el} [${o.left}→${o.right}]`).join('; ')}`);
  if (qa.brokenImages.length) report.problems.push(`${id}: broken images: ${qa.brokenImages.join(', ')}`);
  const badFonts = qa.fonts.filter(f => !f.generic && !f.loaded);
  if (badFonts.length) report.problems.push(`${id}: fonts not loaded (fallback rendering): ${[...new Set(badFonts.map(f => f.family))].join(', ')}`);
  const genericFonts = qa.fonts.filter(f => f.generic && f.chars > 20);
  if (genericFonts.length) report.warnings.push(`${id}: text rendered with a generic family (${[...new Set(genericFonts.map(f => f.family))].join(', ')}) — use the concept fonts`);
  const synth = qa.fonts.filter(f => f.loaded && !f.exactFace && !f.generic && f.chars > 30);
  if (synth.length) report.warnings.push(`${id}: weights/styles without a matching font file (browser will synthesize or substitute): ${synth.slice(0, 6).map(f => `${f.family} ${f.weight} ${f.style}`).join('; ')}`);
  if (qa.placeholderHits.length) report.problems.push(`${id}: placeholder-looking text found: ${qa.placeholderHits.join(', ')}`);
  if (qa.lowContrast.length) report.warnings.push(`${id}: low-contrast text on solid backgrounds: ${qa.lowContrast.slice(0, 6).map(c => `"${c.text}" ${c.ratio}:1 (needs ${c.need})`).join('; ')}`);
  if (qa.consoleErrors.length) report.warnings.push(`${id}: console errors: ${qa.consoleErrors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// geometry constraints for the PDF layout
const hd = report.targets['home-desktop'];
if (hd) {
  if (!hd.sections.length) report.problems.push('home-desktop: no top-level [data-section] elements; mark each major band with data-section="name"');
  const plan = planDesktopSplit(hd.height, hd.sections);
  report.desktopSplit = plan;
  if (hd.height > GEOMETRY.homeDesktopMax) report.problems.push(`home-desktop: height ${hd.height}px exceeds the ${GEOMETRY.homeDesktopMax}px maximum for the two PDF pages`);
  if (!plan.ok) report.problems.push(`home-desktop: ${plan.reason}`);
}
const hm = report.targets['home-mobile'];
if (hm) {
  const plan = planMobileColumns(hm.height, hm.sections);
  report.mobileColumns = plan;
  if (hm.height > GEOMETRY.homeMobileMax) report.problems.push(`home-mobile: height ${hm.height}px exceeds the ${GEOMETRY.homeMobileMax}px maximum (3 columns on one PDF page)`);
  if (!plan.ok) report.problems.push(`home-mobile: ${plan.reason}`);
}
const st = report.targets['story'];
if (st) {
  if (st.height > GEOMETRY.storyMax) report.problems.push(`story: height ${st.height}px exceeds the ${GEOMETRY.storyMax}px maximum for one PDF page`);
  if (st.height < GEOMETRY.storyMin) report.warnings.push(`story: height ${st.height}px is short; the PDF page has room for up to ${GEOMETRY.storyMax}px`);
}
if (external.length) report.problems.push(`external requests were blocked (everything must be local): ${[...new Set(external)].slice(0, 5).join(', ')}`);
if (missing.size) report.problems.push(`missing local files (404): ${[...missing].slice(0, 8).join(', ')}`);
// concept.json sanity
const cj = path.join(conceptDir, 'concept.json');
if (!fs.existsSync(cj)) report.problems.push('concept.json missing');
else { try { JSON.parse(fs.readFileSync(cj, 'utf8')); } catch (e) { report.problems.push('concept.json is not valid JSON: ' + e.message); } }

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
await browser.close(); server.close();
const fmt = (k, v) => v ? `${k}: ${v.height}px` : null;
console.log([fmt('home-desktop', hd), fmt('home-mobile', hm), fmt('story', st)].filter(Boolean).join(' | '));
if (report.desktopSplit) console.log(`desktop split: ${JSON.stringify(report.desktopSplit)}`);
if (report.mobileColumns) console.log(`mobile columns: ${JSON.stringify(report.mobileColumns)}`);
console.log(report.problems.length ? `PROBLEMS (${report.problems.length}):\n- ` + report.problems.join('\n- ') : 'PROBLEMS: none');
console.log(report.warnings.length ? `WARNINGS (${report.warnings.length}):\n- ` + report.warnings.join('\n- ') : 'WARNINGS: none');
if (review) console.log(`review slices: ${path.relative(process.cwd(), reviewDir)}/`);
process.exit(report.problems.length ? 1 : 0);
