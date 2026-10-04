// Builds the client PDF from concept captures + metadata.
// Full deck:      node tools/build-deck.mjs            -> deck/Daybreak_Website_10_Design_Concepts.pdf (+ deck/preview/*.png)
// Concept preview: node tools/build-deck.mjs --concept 03 -> concepts/03-*/captures/deck-preview/ (4 pages, PDF + PNGs)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { GEOMETRY, planDesktopSplit, planMobileColumns } from './geometry.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const ci = args.indexOf('--concept');
const onlyConcept = ci >= 0 ? args[ci + 1].padStart(2, '0') : null;
const noPng = args.includes('--no-png');
const DPR = 2;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const warnings = [];

// ---------- load concepts ----------
const conceptDirs = fs.readdirSync(path.join(ROOT, 'concepts')).filter(d => /^\d\d-/.test(d)).sort();
const concepts = [];
for (const slug of conceptDirs) {
  if (onlyConcept && !slug.startsWith(onlyConcept)) continue;
  const dir = path.join(ROOT, 'concepts', slug);
  const cap = path.join(dir, 'captures');
  const need = ['home-desktop.jpg', 'home-mobile.jpg', 'story.jpg', 'components.png', 'report.json'];
  const miss = need.filter(f => !fs.existsSync(path.join(cap, f)));
  if (!fs.existsSync(path.join(dir, 'concept.json'))) miss.push('concept.json');
  if (miss.length) { warnings.push(`${slug}: skipped, missing ${miss.join(', ')}`); continue; }
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'concept.json'), 'utf8'));
  const report = JSON.parse(fs.readFileSync(path.join(cap, 'report.json'), 'utf8'));
  concepts.push({ slug, dir, cap, meta, report });
}
if (!concepts.length) { console.error('No complete concepts found.\n' + warnings.join('\n')); process.exit(1); }

const outBase = onlyConcept ? path.join(concepts[0].cap, 'deck-preview') : path.join(ROOT, 'deck');
const assetDir = path.join(outBase, 'assets');
fs.rmSync(assetDir, { recursive: true, force: true });
fs.mkdirSync(assetDir, { recursive: true });

// ---------- crop jobs ----------
const jobs = [];
for (const c of concepts) {
  const t = c.report.targets;
  const H = t['home-desktop'].height;
  let split = planDesktopSplit(H, t['home-desktop'].sections);
  if (!split.ok) { warnings.push(`${c.slug}: desktop split not at a section boundary (${split.reason}); cutting at ${GEOMETRY.homeDesktopCap1}px`); split = { cut: Math.min(GEOMETRY.homeDesktopCap1, H) }; }
  const part2 = Math.min(H - split.cut, GEOMETRY.homeDesktopCap2);
  if (H - split.cut > GEOMETRY.homeDesktopCap2) warnings.push(`${c.slug}: desktop part 2 truncated by ${H - split.cut - GEOMETRY.homeDesktopCap2}px`);
  const a = c.assets = { id: c.slug };
  const src = f => path.join(c.cap, f);
  const out = f => path.join(assetDir, `${c.slug}-${f}`);
  jobs.push({ src: src('home-desktop.jpg'), out: out('home-1.jpg'), box: [0, 0, 1280 * DPR, split.cut * DPR], quality: 86 });
  jobs.push({ src: src('home-desktop.jpg'), out: out('home-2.jpg'), box: [0, split.cut * DPR, 1280 * DPR, (split.cut + part2) * DPR], quality: 86 });
  jobs.push({ src: src('home-desktop.jpg'), out: out('thumb.jpg'), box: [0, 0, 1280 * DPR, 720 * DPR], width: 1100, quality: 84 });
  a.home1 = { file: out('home-1.jpg'), h: split.cut }; a.home2 = { file: out('home-2.jpg'), h: part2 };
  a.thumb = out('thumb.jpg');
  const Hm = t['home-mobile'].height;
  let mplan = planMobileColumns(Hm, t['home-mobile'].sections);
  if (!mplan.ok) { warnings.push(`${c.slug}: mobile does not fit 3 columns (${mplan.reason}); truncating`); }
  a.mobile = mplan.columns.slice(0, 3).map(([y0, y1], i) => {
    const y1c = Math.min(y1, y0 + GEOMETRY.homeMobileColumnCap);
    jobs.push({ src: src('home-mobile.jpg'), out: out(`mobile-${i + 1}.jpg`), box: [0, y0 * DPR, 390 * DPR, y1c * DPR], quality: 88 });
    return { file: out(`mobile-${i + 1}.jpg`), h: y1c - y0 };
  });
  const Hs = t['story'].height;
  const hs = Math.min(Hs, GEOMETRY.storyMax);
  if (Hs > GEOMETRY.storyMax) warnings.push(`${c.slug}: story truncated by ${Hs - GEOMETRY.storyMax}px`);
  jobs.push({ src: src('story.jpg'), out: out('story.jpg'), box: [0, 0, 1280 * DPR, hs * DPR], quality: 86 });
  a.story = { file: out('story.jpg'), h: hs };
  jobs.push({ src: src('components.png'), out: out('components.png') });
  a.components = out('components.png');
}
execFileSync('python3', [path.join(ROOT, 'tools/crop.py')], { input: JSON.stringify(jobs), stdio: ['pipe', 'inherit', 'inherit'] });

// ---------- deck content (non-concept pages) ----------
const contentFile = path.join(ROOT, 'deck', 'deck-content.json');
const deck = fs.existsSync(contentFile) ? JSON.parse(fs.readFileSync(contentFile, 'utf8')) : {};
const CLIENT = deck.client || 'Daybreak Rights Network';
const rel = p => path.relative(outBase, p).split(path.sep).join('/');

// ---------- page builders ----------
const pages = [];
const runhead = right => `<div class="runhead"><span>Website Design Concepts · ${esc(CLIENT)} <em>(provisional brand)</em></span><span>${right}</span></div>`;
const runfoot = () => `<div class="runfoot"><span>Design concepts, not functioning websites. All names, figures, stories and images are samples.</span><span class="pn"></span></div>`;
const page = (cls, right, inner, opts = {}) => pages.push(`<section class="page ${cls}">${opts.noHead ? '' : runhead(right)}<div class="content">${inner}</div>${opts.noFoot ? '' : runfoot()}</section>`);
const num = n => String(n).padStart(2, '0');
const fontStack = f => f ? `'${f.family}', 'Inter', sans-serif` : `'Inter', sans-serif`;
const swatches = m => (m.palette || []).map(p => `<span style="background:${esc(p.hex)}"></span>`).join('');

function conceptPages(c) {
  const m = c.meta; const a = c.assets; const n = num(m.number);
  const label = `Concept ${n} · ${esc(m.name)}`;
  const s = GEOMETRY.desktopScale;
  // P1: concept band + desktop part 1
  page('concept p1', label, `
    <div class="band">
      <div class="band-main">
        <div class="kicker"><span class="sw">${swatches(m)}</span>Concept ${n}</div>
        <h2 style="font-family:${fontStack(m.fonts?.heading)}">${esc(m.name)}</h2>
        <p class="tagline">${esc(m.tagline)}</p>
        <p>${esc(m.idea)}</p>
        <p><strong>Why it fits:</strong> ${esc(m.fit)}</p>
      </div>
      <div class="band-side">
        <h3>Informed by the reference study</h3>
        <ul>${(m.informedBy || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        <h3>What makes it different</h3>
        <p>${esc(m.distinct)}</p>
      </div>
    </div>
    <div class="caption"><span>Desktop homepage · 1280 px wide · part 1 of 2</span><span>Design concept</span></div>
    <div class="browser"><i></i><i></i><i></i><span class="url">daybreak.example</span></div>
    <img class="shot" src="${rel(a.home1.file)}" style="height:${(a.home1.h * s).toFixed(2)}px">`);
  // P2: desktop part 2
  page('concept p2', label, `
    <div class="caption"><span>Desktop homepage · continued · part 2 of 2</span><span>Design concept</span></div>
    <img class="shot cont" src="${rel(a.home2.file)}" style="height:${(a.home2.h * s).toFixed(2)}px">`);
  // P3: mobile + style guide
  const ms = GEOMETRY.mobileScale;
  const f = m.fonts || {};
  const fontLine = (k, label) => f[k]?.family ? `<div class="font-row"><span class="spec" style="font-family:${fontStack(f[k])}">Aa</span><div><b>${label}</b><br>${esc(f[k].family)}${f[k].weights ? ` <span class="muted">· ${esc(f[k].weights)}</span>` : ''}</div></div>` : '';
  page('concept p3', label, `
    <div class="caption"><span>Mobile homepage · 390 px wide · read top to bottom, left to right</span><span>Design concept</span></div>
    <div class="mobile-cols">${a.mobile.map((col, i) => `<div class="mcol"><img src="${rel(col.file)}" style="height:${(col.h * ms).toFixed(2)}px"></div>`).join('')}</div>
    <div class="style">
      <h3>Style guide</h3>
      <div class="chips">${(m.palette || []).slice(0, 6).map(p => `<div class="chip"><span class="swatch" style="background:${esc(p.hex)}"></span><b>${esc(p.name)}</b><code>${esc(p.hex.toUpperCase())}</code><em>${esc(p.role)}</em></div>`).join('')}</div>
      <div class="style-row">
        <div class="type">${fontLine('heading', 'Headings')}${fontLine('body', 'Body & interface')}${fontLine('accent', 'Accent')}
          <p class="specimen" style="font-family:${fontStack(f.body)}">Families of the missing are still searching for answers.</p></div>
        <div class="ui"><h4>Buttons &amp; links</h4><div class="comp"><img src="${rel(a.components)}"></div><p>${esc(m.buttons)}</p></div>
        <div class="notes"><h4>Imagery</h4><p>${esc(m.imageDirection)}</p><h4>Navigation</h4><p>${esc(m.navigation)}</p></div>
      </div>
    </div>`);
  // P4: interior
  page('concept p4', label, `
    <div class="caption"><span>Interior page · Feature story “The Long Wait” · 1280 px wide</span><span>Design concept</span></div>
    <div class="browser"><i></i><i></i><i></i><span class="url">daybreak.example/stories/the-long-wait</span></div>
    <img class="shot" src="${rel(a.story.file)}" style="height:${(a.story.h * s).toFixed(2)}px">`);
}

// cover, brief + contents
const firstConceptPage = onlyConcept ? 1 : 3;
if (!onlyConcept) {
  page('cover', '', `
    <div class="cover-top">
      <div class="eyebrow">Design proposal · ${esc(deck.date || 'October 2026')}</div>
      <h1>Website Design Concepts</h1>
      <p class="cover-sub">Ten design directions for <strong>${esc(CLIENT)}</strong></p>
      <p class="cover-note">${esc(deck.clientNote || 'Provisional brand name used until the client’s name, logo and brand assets are confirmed.')}</p>
    </div>
    <div class="cover-grid">${concepts.map(c => `<figure><img src="${rel(c.assets.thumb)}"><figcaption><b>${num(c.meta.number)}</b> ${esc(c.meta.name)}</figcaption></figure>`).join('')}</div>
    <div class="cover-foot"><span>Prepared for: ${esc(deck.preparedFor || 'Client name to be confirmed')}</span><span>Draft for client review · Sample content and illustrative images</span></div>`, { noHead: true, noFoot: true });
  const b = deck.brief || {};
  const contents = concepts.map((c, i) => `<li><span class="cn">${num(c.meta.number)}</span><span class="ct">${esc(c.meta.name)}<em>${esc(c.meta.tagline)}</em></span><span class="cp">${firstConceptPage + i * 4}</span></li>`).join('');
  const after = firstConceptPage + concepts.length * 4;
  page('brief', 'Brief & contents', `
    <div class="brief-grid">
      <div class="brief-col">
        <h2>The brief <span class="tag">Provisional</span></h2>
        <p class="lede">${esc(b.lede || '')}</p>
        ${(b.sections || []).map(s => `<h3>${esc(s.title)}</h3>${s.items ? `<ul>${s.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : `<p>${esc(s.text)}</p>`}`).join('')}
      </div>
      <div class="brief-col">
        <h2>Contents</h2>
        <ol class="contents">${contents}
          <li><span class="cn">—</span><span class="ct">Side-by-side comparison</span><span class="cp">${after}</span></li>
          <li><span class="cn">—</span><span class="ct">Our recommendation</span><span class="cp">${after + 1}</span></li>
          <li><span class="cn">—</span><span class="ct">Concept selection form</span><span class="cp">${after + 2}</span></li>
        </ol>
        ${(b.notes || []).map(s => `<div class="note"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join('')}
      </div>
    </div>`);
}
concepts.forEach(conceptPages);
if (!onlyConcept) {
  // comparison
  page('compare', 'Side-by-side comparison', `
    <h2 class="page-title">Side-by-side comparison</h2>
    <p class="page-intro">${esc(deck.compareIntro || 'All ten concepts share the same brief, sitemap and sample content, so the differences below come from design alone.')}</p>
    <table class="cmp"><thead><tr><th class="c0">Concept</th><th>Visual character</th><th>Content emphasis</th><th>Best fit</th><th>Key tradeoffs</th></tr></thead>
    <tbody>${concepts.map(c => `<tr><td class="c0"><img src="${rel(c.assets.thumb)}"><b>${num(c.meta.number)} ${esc(c.meta.name)}</b></td><td>${esc(c.meta.visualCharacter)}</td><td>${esc(c.meta.contentEmphasis)}</td><td>${esc(c.meta.bestFor)}</td><td>${esc(c.meta.tradeoffs)}</td></tr>`).join('')}</tbody></table>`);
  // recommendation
  const r = deck.recommendation || { picks: [] };
  const byNum = Object.fromEntries(concepts.map(c => [c.meta.number, c]));
  page('reco', 'Our recommendation', `
    <h2 class="page-title">Our recommendation</h2>
    <p class="page-intro">${esc(r.intro || '')}</p>
    <div class="picks">${(r.picks || []).map((p, i) => { const c = byNum[p.number]; return c ? `<div class="pick"><img src="${rel(c.assets.thumb)}"><div><div class="pick-rank">${esc(p.rank || (i === 0 ? 'First choice' : 'Also recommended'))}</div><h3>${num(c.meta.number)} · ${esc(c.meta.name)}</h3><ul>${(p.reasons || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : ''; }).join('')}</div>
    ${r.combine ? `<div class="note wide"><h3>${esc(r.combine.title)}</h3><p>${esc(r.combine.text)}</p></div>` : ''}
    ${r.next ? `<div class="note wide"><h3>${esc(r.next.title)}</h3><ol class="steps">${r.next.items.map(i => `<li>${esc(i)}</li>`).join('')}</ol></div>` : ''}`);
  // selection form
  page('form', 'Concept selection form', `
    <h2 class="page-title">Concept selection form</h2>
    <p class="page-intro">${esc(deck.formIntro || 'Please mark your preferences and return this page. Comments on individual concepts are welcome.')}</p>
    <table class="sel"><thead><tr><th>Concept</th><th>First choice</th><th>Second choice</th><th>Not for us</th><th class="notes-col">Comments</th></tr></thead>
      <tbody>${concepts.map(c => `<tr><td><b>${num(c.meta.number)}</b> ${esc(c.meta.name)}</td><td><span class="box"></span></td><td><span class="box"></span></td><td><span class="box"></span></td><td class="line"></td></tr>`).join('')}</tbody></table>
    <div class="form-grid">
      <div><h3>Elements to carry over from other concepts</h3><div class="lines"><span></span><span></span><span></span></div></div>
      <div><h3>Brand inputs still needed</h3><ul class="checks">${(deck.inputs || ['Organisation name', 'Logo files', 'Brand colours and fonts', 'Photography or image library', 'Languages to support', 'Final page list']).map(i => `<li><span class="box"></span>${esc(i)}</li>`).join('')}</ul></div>
    </div>
    <div class="signoff"><div><span>Name</span></div><div><span>Role</span></div><div><span>Date</span></div><div><span>Signature</span></div></div>`);
}

// ---------- HTML ----------
const css = fs.readFileSync(path.join(ROOT, 'tools/deck.css'), 'utf8');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Website Design Concepts — ${esc(CLIENT)}</title>
<link rel="stylesheet" href="${rel(path.join(ROOT, 'shared/fonts.css'))}"><style>${css}</style></head><body>${pages.join('\n')}
<script>document.querySelectorAll('.page').forEach((p,i,all)=>{const s=p.querySelector('.pn'); if(s) s.textContent=(i+1)+' / '+all.length;});</script></body></html>`;
const htmlFile = path.join(outBase, onlyConcept ? 'deck-preview.html' : 'deck.html');
fs.writeFileSync(htmlFile, html);

// ---------- print ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { warnings.push('404 ' + req.url); res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const pg = await browser.newPage();
await pg.goto(`http://127.0.0.1:${server.address().port}/${path.relative(ROOT, htmlFile).split(path.sep).join('/')}`, { waitUntil: 'networkidle' });
await pg.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; }))); });
// layout checks: anything overflowing its page or content box?
const overflow = await pg.evaluate(() => {
  const issues = [];
  document.querySelectorAll('.page').forEach((p, i) => {
    const pr = p.getBoundingClientRect(); const c = p.querySelector('.content'); const cr = c.getBoundingClientRect();
    c.querySelectorAll('*').forEach(el => { const r = el.getBoundingClientRect(); if (r.height && (r.bottom > cr.bottom + 1 || r.right > cr.right + 1)) issues.push(`page ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> overflows content box by ${Math.round(Math.max(r.bottom - cr.bottom, r.right - cr.right))}px`); });
    p.querySelectorAll('.band, .note, .chip, td, .pick').forEach(el => { if (el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflow !== 'visible') issues.push(`page ${i + 1}: text clipped in .${el.className}`); });
    const bi = [...p.querySelectorAll('img')].filter(im => !im.naturalWidth); if (bi.length) issues.push(`page ${i + 1}: ${bi.length} broken image(s)`);
  });
  return issues.slice(0, 40);
});
const pdfFile = path.join(outBase, onlyConcept ? 'deck-preview.pdf' : (deck.fileName || 'Daybreak_Website_10_Design_Concepts.pdf'));
await pg.pdf({ path: pdfFile, preferCSSPageSize: true, printBackground: true });
await browser.close(); server.close();
console.log(`PDF: ${path.relative(ROOT, pdfFile)} · ${pages.length} pages · ${(fs.statSync(pdfFile).size / 1048576).toFixed(1)} MB`);
if (!noPng) {
  const prevDir = path.join(outBase, 'preview');
  fs.rmSync(prevDir, { recursive: true, force: true }); fs.mkdirSync(prevDir, { recursive: true });
  execFileSync('pdftoppm', ['-r', onlyConcept ? '110' : '80', '-jpeg', '-jpegopt', 'quality=82', pdfFile, path.join(prevDir, 'page')]);
  console.log(`page previews: ${path.relative(ROOT, prevDir)}/`);
}
if (overflow.length) console.log('LAYOUT ISSUES:\n- ' + overflow.join('\n- '));
if (warnings.length) console.log('WARNINGS:\n- ' + warnings.join('\n- '));
