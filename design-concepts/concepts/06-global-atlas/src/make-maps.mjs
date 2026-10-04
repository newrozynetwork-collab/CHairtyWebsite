// Global Atlas: derives every map asset for this concept from the shared Equal Earth projection
// (same projection and 2000x1000 frame as shared/images/world-map.svg and world-countries-paths.json).
// Run from the project root:  node concepts/06-global-atlas/src/make-maps.mjs
import fs from 'node:fs';
import path from 'node:path';
import { geoEqualEarth, geoPath, geoGraticule10, geoGraticule, geoContains } from 'd3-geo';
import { feature, mesh, merge } from 'topojson-client';

const ROOT = '/home/user/CHairtyWebsite/design-concepts';
const OUT = path.join(ROOT, 'concepts/06-global-atlas/maps');
fs.mkdirSync(OUT, { recursive: true });
const topo = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/world-atlas/countries-110m.json'), 'utf8'));
const W = 2000, H = 1000;
const projection = geoEqualEarth().fitExtent([[20, 20], [W - 20, H - 20]], { type: 'Sphere' });
const P = (digits = 1) => geoPath(projection).digits(digits);

// ---------- palette ----------
const C = {
  paper: '#EFE8D8', ocean: '#D3E3EE', oceanDeep: '#C3D8E7', grat: '#FFFFFF', neutral: '#DDD3BE', neutralLine: '#CFC3A9',
  topo: '#2D7A63', coral: '#EE5D48', ink: '#14202E', navy: '#0B2340', ice: '#CFE1EE',
};
// Five tints of topo green: calm, close in value, distinct enough to separate neighbouring regions.
const REGION_FILL = { americas: '#8DBAA3', africa: '#7BAC90', mena: '#C9D7BA', eca: '#A6C8C0', asia: '#9EC4A1' };
// Cartographic water-lining: concentric rings offshore, drawn as alternating strokes beneath the land.
const waterlines = (d, sc = 1) => `<defs><path id="coastL" d="${d}" fill="none" stroke-linejoin="round"/></defs>` + [[34, '#BACFDF'], [30, C.ocean], [21, '#BACFDF'], [17.5, C.ocean], [9, '#B3CADB'], [6, C.ocean]]
  .map(([w, col]) => `<use href="#coastL" stroke="${col}" stroke-width="${(w * sc).toFixed(1)}"/>`).join('\n');

// ---------- regions (sample areas of work; no country is named anywhere on the site) ----------
const R = {
  africa: ['Tanzania', 'Dem. Rep. Congo', 'Somalia', 'Kenya', 'Chad', 'South Africa', 'Lesotho', 'Zimbabwe', 'Botswana', 'Namibia', 'Senegal', 'Mali', 'Mauritania', 'Benin', 'Niger', 'Nigeria', 'Cameroon', 'Togo', 'Ghana', "Côte d'Ivoire", 'Guinea', 'Guinea-Bissau', 'Liberia', 'Sierra Leone', 'Burkina Faso', 'Central African Rep.', 'Congo', 'Gabon', 'Eq. Guinea', 'Zambia', 'Malawi', 'Mozambique', 'eSwatini', 'Angola', 'Burundi', 'Madagascar', 'Gambia', 'Eritrea', 'Ethiopia', 'Djibouti', 'Somaliland', 'Uganda', 'Rwanda', 'S. Sudan', 'Sudan'],
  mena: ['W. Sahara', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Egypt', 'Israel', 'Palestine', 'Lebanon', 'Syria', 'Jordan', 'Iraq', 'Iran', 'Saudi Arabia', 'Yemen', 'Oman', 'United Arab Emirates', 'Qatar', 'Kuwait'],
  eca: ['Kazakhstan', 'Uzbekistan', 'Russia', 'Norway', 'France', 'Sweden', 'Belarus', 'Ukraine', 'Poland', 'Austria', 'Hungary', 'Moldova', 'Romania', 'Lithuania', 'Latvia', 'Estonia', 'Germany', 'Bulgaria', 'Greece', 'Turkey', 'Albania', 'Croatia', 'Switzerland', 'Luxembourg', 'Belgium', 'Netherlands', 'Portugal', 'Spain', 'Ireland', 'Italy', 'Denmark', 'United Kingdom', 'Iceland', 'Azerbaijan', 'Georgia', 'Armenia', 'Slovenia', 'Finland', 'Slovakia', 'Czechia', 'Cyprus', 'N. Cyprus', 'Bosnia and Herz.', 'Macedonia', 'Serbia', 'Montenegro', 'Kosovo', 'Tajikistan', 'Kyrgyzstan', 'Turkmenistan'],
  americas: ['Canada', 'United States of America', 'Mexico', 'Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Cuba', 'Haiti', 'Dominican Rep.', 'Jamaica', 'Puerto Rico', 'Bahamas', 'Trinidad and Tobago', 'Colombia', 'Venezuela', 'Guyana', 'Suriname', 'Ecuador', 'Peru', 'Brazil', 'Bolivia', 'Paraguay', 'Chile', 'Argentina', 'Uruguay', 'Falkland Is.'],
  asia: ['Afghanistan', 'Pakistan', 'India', 'Bangladesh', 'Bhutan', 'Nepal', 'Sri Lanka', 'Myanmar', 'Thailand', 'Laos', 'Cambodia', 'Vietnam', 'Malaysia', 'Brunei', 'Indonesia', 'Timor-Leste', 'Philippines', 'Papua New Guinea', 'China', 'Taiwan', 'Mongolia', 'North Korea', 'South Korea', 'Japan', 'Australia', 'New Zealand', 'Fiji', 'Vanuatu', 'Solomon Is.', 'New Caledonia'],
};
const regionOf = new Map();
for (const [k, names] of Object.entries(R)) for (const n of names) regionOf.set(n, k);
const geoms = topo.objects.countries.geometries;
const SKIP = new Set(['Antarctica', 'Fr. S. Antarctic Lands']);
const unassigned = geoms.filter(g => !regionOf.has(g.properties.name) && !SKIP.has(g.properties.name)).map(g => g.properties.name);
console.log('unassigned (drawn neutral):', unassigned.join(', '));
const reg = g => regionOf.get(g.properties.name) || null;
const regionGeom = k => merge(topo, geoms.filter(g => reg(g) === k));
const neutralGeom = merge(topo, geoms.filter(g => !reg(g) && !SKIP.has(g.properties.name)));
const allLand = merge(topo, geoms.filter(g => !SKIP.has(g.properties.name)));
const innerBorders = mesh(topo, topo.objects.countries, (a, b) => a !== b && reg(a) && reg(a) === reg(b));
const regionBorders = mesh(topo, topo.objects.countries, (a, b) => a !== b && reg(a) !== reg(b) && !SKIP.has(a.properties.name) && !SKIP.has(b.properties.name));
const coast = mesh(topo, topo.objects.countries, (a, b) => a === b && !SKIP.has(a.properties.name));
const sphere = { type: 'Sphere' };
const grat10 = geoGraticule10();
const grat30 = geoGraticule().step([30, 30])();

const svg = (vb, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${extra}>${body}</svg>\n`;
const write = (name, s) => { fs.writeFileSync(path.join(OUT, name), s); console.log(name.padEnd(28), (s.length / 1024).toFixed(0) + 'KB'); };

// ---------- 1. Hero plate: the world by region ----------
{
  const p = P(1);
  const body = [
    `<defs><clipPath id="s"><path d="${p(sphere)}"/></clipPath></defs>`,
    `<path d="${p(sphere)}" fill="${C.ocean}"/>`,
    `<g clip-path="url(#s)"><path d="${p(grat10)}" fill="none" stroke="${C.grat}" stroke-opacity=".5" stroke-width="1"/>`,
    `<path d="${p(grat30)}" fill="none" stroke="${C.grat}" stroke-opacity=".9" stroke-width="1.6"/>`,
    waterlines(p(allLand)), `</g>`,
    `<path d="${p(neutralGeom)}" fill="${C.neutral}"/>`,
    ...Object.keys(R).map(k => `<path class="r-${k}" d="${p(regionGeom(k))}" fill="${REGION_FILL[k]}"/>`),
    `<path d="${p(innerBorders)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".8" stroke-linejoin="round"/>`,
    `<path d="${p(coast)}" fill="none" stroke="${C.ink}" stroke-opacity=".22" stroke-width=".9" stroke-linejoin="round"/>`,
    `<path d="${p(regionBorders)}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`,
    `<path d="${p(sphere)}" fill="none" stroke="${C.ink}" stroke-opacity=".35" stroke-width="1.4"/>`,
  ].join('\n');
  write('world-regions.svg', svg(`0 0 ${W} ${H}`, body));
}

// ---------- 2. Region plates (4:3 crops) ----------
const CROPS = {
  africa: [820, 330, 560, 420],
  americas: [-150, 30, 1120, 840],
  asia: [1210, 150, 880, 660],
  eca: [880, 10, 640, 480],
  mena: [880, 130, 520, 390],
};
for (const [k, [x, y, w, h]] of Object.entries(CROPS)) {
  const p = P(1);
  const others = merge(topo, geoms.filter(g => reg(g) !== k && !SKIP.has(g.properties.name)));
  const sw = w / 560; // keep line weights visually constant across zoom levels
  const body = [
    `<defs><clipPath id="s"><path d="${p(sphere)}"/></clipPath></defs>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.paper}"/>`,
    `<path d="${p(sphere)}" fill="${C.ocean}"/>`,
    `<g clip-path="url(#s)"><path d="${p(grat10)}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="${(1.1 * sw).toFixed(2)}"/>`,
    waterlines(p(allLand), sw * 0.8), `</g>`,
    `<path d="${p(others)}" fill="${C.neutral}" stroke="#fff" stroke-opacity=".7" stroke-width="${(0.9 * sw).toFixed(2)}"/>`,
    `<path d="${p(regionGeom(k))}" fill="${C.topo}"/>`,
    `<path d="${p(mesh(topo, topo.objects.countries, (a, b) => a !== b && reg(a) === k && reg(b) === k))}" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="${(0.9 * sw).toFixed(2)}"/>`,
    `<path d="${p(sphere)}" fill="none" stroke="${C.ink}" stroke-opacity=".3" stroke-width="${(1.4 * sw).toFixed(2)}"/>`,
  ].join('\n');
  write(`region-${k}.svg`, svg(`${x} ${y} ${w} ${h}`, body, 'preserveAspectRatio="xMidYMid slice"'));
}

// ---------- 2b. Focus maps for the mobile region selector and the story context card ----------
for (const k of ['africa', 'eca']) {
  const p = P(1);
  const others = merge(topo, geoms.filter(g => reg(g) !== k && !SKIP.has(g.properties.name)));
  const body = [
    `<defs><clipPath id="s"><path d="${p(sphere)}"/></clipPath></defs>`,
    `<path d="${p(sphere)}" fill="${C.ocean}"/>`,
    `<g clip-path="url(#s)"><path d="${p(grat10)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>`, waterlines(p(allLand), 1.2), `</g>`,
    `<path d="${p(others)}" fill="${C.neutral}" stroke="#fff" stroke-opacity=".75" stroke-width="1.2"/>`,
    `<path d="${p(regionGeom(k))}" fill="${C.topo}"/>`,
    `<path d="${p(sphere)}" fill="none" stroke="${C.ink}" stroke-opacity=".3" stroke-width="2"/>`,
  ].join('\n');
  write(`focus-${k}.svg`, svg(`0 0 ${W} ${H}`, body));
}

// ---------- 3. Locator thumbnails for story tags (tiny world, one region lit) ----------
for (const k of Object.keys(R)) {
  const p = P(0);
  const others = merge(topo, geoms.filter(g => reg(g) !== k && !SKIP.has(g.properties.name)));
  const body = [
    `<path d="${p(sphere)}" fill="${C.ocean}"/>`,
    `<path d="${p(others)}" fill="#BFB49B"/>`,
    `<path d="${p(regionGeom(k))}" fill="${C.coral}"/>`,
    `<path d="${p(sphere)}" fill="none" stroke="${C.ink}" stroke-opacity=".35" stroke-width="10"/>`,
  ].join('\n');
  write(`locator-${k}.svg`, svg(`10 13 1980 974`, body));
}

// ---------- 4. Dot-matrix world for the impact band (60 highlighted dots) ----------
{
  const land = feature(topo, topo.objects.land);
  const step = 15.5;
  const dots = [];
  for (let y = 40; y < 900; y += step) {
    for (let x = 30; x < 1975; x += step) {
      const ll = projection.invert([x, y]);
      if (!ll || !isFinite(ll[0])) continue;
      if (ll[1] < -58) continue; // no Antarctica
      if (geoContains(land, ll)) dots.push([x, y]);
    }
  }
  // 60 supporter countries: a broad, even spread (sample figure; no names are shown)
  const pick = [
    'United States of America', 'Kenya', 'United Kingdom', 'India', 'Brazil', 'Jordan', 'Canada', 'Nigeria', 'Germany', 'Indonesia', 'Mexico', 'Morocco',
    'Colombia', 'South Africa', 'France', 'Philippines', 'Argentina', 'Lebanon', 'Peru', 'Ghana', 'Spain', 'Japan', 'Chile', 'Tunisia',
    'Guatemala', 'Uganda', 'Italy', 'Australia', 'Ecuador', 'Egypt', 'Bolivia', 'Senegal', 'Poland', 'Bangladesh', 'Uruguay', 'Iraq',
    'Honduras', 'Ethiopia', 'Sweden', 'Thailand', 'Venezuela', 'Tanzania', 'Greece', 'Nepal', 'Paraguay', 'Zambia', 'Ukraine', 'Malaysia',
    'Cameroon', 'Turkey', 'Pakistan', 'Mozambique', 'Norway', 'South Korea', 'Angola', 'Kazakhstan', 'New Zealand', 'Madagascar', 'Mongolia', 'Ireland'];
  const cent = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/images/world-countries-paths.json'), 'utf8')).countries.map(c => [c.name, c.centroid]));
  const lit = new Set();
  for (const n of pick) {
    if (lit.size >= 60) break;
    const c = cent.get(n); if (!c) { console.log('missing centroid', n); continue; }
    let best = -1, bd = 1e9;
    dots.forEach((d, i) => { if (lit.has(i)) return; const dd = (d[0] - c[0]) ** 2 + (d[1] - c[1]) ** 2; if (dd < bd) { bd = dd; best = i; } });
    lit.add(best);
  }
  console.log('dots', dots.length, 'lit', lit.size);
  const r = 4.6;
  const base = dots.filter((_, i) => !lit.has(i)).map(([x, y]) => `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`).join('');
  const hot = [...lit].map(i => dots[i]);
  const hotPath = hot.map(([x, y]) => `M${(x - 6.5).toFixed(1)} ${y.toFixed(1)}a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0`).join('');
  const rings = hot.map(([x, y]) => `M${(x - 13).toFixed(1)} ${y.toFixed(1)}a13 13 0 1 0 26 0a13 13 0 1 0 -26 0`).join('');
  const p = P(1);
  for (const [name, baseFill, baseOp, sphereStroke] of [['dots-navy.svg', C.ice, 0.32, 'rgba(207,225,238,.28)'], ['dots-light.svg', '#9FB4C4', 0.75, 'rgba(20,32,46,.25)']]) {
    const body = [
      `<path d="${p(sphere)}" fill="none" stroke="${sphereStroke}" stroke-width="2"/>`,
      `<path d="${base}" fill="${baseFill}" fill-opacity="${baseOp}"/>`,
      `<path d="${rings}" fill="none" stroke="${C.coral}" stroke-opacity=".45" stroke-width="2"/>`,
      `<path d="${hotPath}" fill="${C.coral}"/>`,
    ].join('\n');
    write(name, svg(`10 13 1980 974`, body));
  }
}

// ---------- 5. Topographic contour texture (seeded value noise + marching squares) ----------
function contours({ w, h, cell, levels, seed, stroke, opacity, width, name, scale = 1 }) {
  let s = seed >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const G = 64; const perm = Array.from({ length: G * G }, rand);
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const g = (a, b) => perm[((a % G) + G) % G + (((b % G) + G) % G) * G]; return (g(xi, yi) * (1 - u) + g(xi + 1, yi) * u) * (1 - v) + (g(xi, yi + 1) * (1 - u) + g(xi + 1, yi + 1) * u) * v; };
  const fbm = (x, y) => { let a = 0, amp = 0.55, f = 1; for (let o = 0; o < 5; o++) { a += amp * vn(x * f, y * f); amp *= 0.5; f *= 2.03; } return a; };
  const nx = Math.ceil(w / cell) + 1, ny = Math.ceil(h / cell) + 1;
  const F = []; for (let j = 0; j < ny; j++) { F[j] = []; for (let i = 0; i < nx; i++) F[j][i] = fbm(i * cell / 260 * scale + 3.1, j * cell / 260 * scale + 7.7); }
  let out = '';
  for (const lv of levels) {
    const segs = [];
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = F[j][i], b = F[j][i + 1], c = F[j + 1][i + 1], d = F[j + 1][i];
      const idx = (a > lv) | ((b > lv) << 1) | ((c > lv) << 2) | ((d > lv) << 3);
      if (idx === 0 || idx === 15) continue;
      const x = i * cell, y = j * cell;
      const t = (p, q) => (lv - p) / (q - p);
      const top = [x + cell * t(a, b), y], right = [x + cell, y + cell * t(b, c)], bottom = [x + cell * t(d, c), y + cell], left = [x, y + cell * t(a, d)];
      const L = { 1: [[left, top]], 2: [[top, right]], 3: [[left, right]], 4: [[right, bottom]], 5: [[left, top], [right, bottom]], 6: [[top, bottom]], 7: [[left, bottom]], 8: [[bottom, left]], 9: [[bottom, top]], 10: [[top, right], [bottom, left]], 11: [[bottom, right]], 12: [[right, left]], 13: [[right, top]], 14: [[top, left]] }[idx];
      for (const sg of L) segs.push(sg);
    }
    // join segments into polylines
    const key = p => p[0].toFixed(2) + ',' + p[1].toFixed(2);
    const byStart = new Map();
    segs.forEach((sg, i) => { const k = key(sg[0]); if (!byStart.has(k)) byStart.set(k, []); byStart.get(k).push(i); });
    const used = new Set();
    for (let i = 0; i < segs.length; i++) {
      if (used.has(i)) continue; used.add(i);
      const line = [segs[i][0], segs[i][1]];
      for (;;) { const nxt = (byStart.get(key(line[line.length - 1])) || []).find(k => !used.has(k)); if (nxt === undefined) break; used.add(nxt); line.push(segs[nxt][1]); }
      if (line.length < 4) continue;
      // Catmull-Rom smoothing to cubic Béziers
      let d = `M${line[0][0].toFixed(1)} ${line[0][1].toFixed(1)}`;
      for (let k = 0; k < line.length - 1; k++) {
        const p0 = line[Math.max(0, k - 1)], p1 = line[k], p2 = line[k + 1], p3 = line[Math.min(line.length - 1, k + 2)];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      out += d;
    }
  }
  write(name, svg(`0 0 ${w} ${h}`, `<path d="${out}" fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`, `width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"`));
}
const LV = Array.from({ length: 16 }, (_, i) => 0.18 + i * 0.05);
contours({ w: 1400, h: 900, cell: 9, levels: LV, seed: 11, stroke: '#14202E', opacity: 0.09, width: 1.1, name: 'contours-sand.svg' });
contours({ w: 1400, h: 900, cell: 9, levels: LV, seed: 29, stroke: '#CFE1EE', opacity: 0.13, width: 1.1, name: 'contours-navy.svg' });
contours({ w: 600, h: 800, cell: 7, levels: LV, seed: 5, stroke: '#EFE8D8', opacity: 0.32, width: 1.3, name: 'contours-cover.svg', scale: 1.6 });
