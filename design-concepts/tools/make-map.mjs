// Writes shared/images/world-map.svg (Natural Earth data via world-atlas, ISC licence; public-domain geography)
import fs from 'node:fs';
import { geoEqualEarth, geoPath, geoGraticule10 } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-110m.json', 'utf8'));
const W = 2000, H = 1000;
const land = feature(topo, topo.objects.land);
const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b);
const projection = geoEqualEarth().fitExtent([[20, 20], [W - 20, H - 20]], { type: 'Sphere' });
const p = geoPath(projection);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<path class="sphere" d="${p({ type: 'Sphere' })}" fill="none" stroke="currentColor" stroke-opacity=".25"/>
<path class="graticule" d="${p(geoGraticule10())}" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width=".8"/>
<path class="land" d="${p(land)}" fill="currentColor" fill-opacity=".9"/>
<path class="borders" d="${p(borders)}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/>
</svg>`;
fs.writeFileSync('shared/images/world-map.svg', svg);
// Also export country features with ids/names for concepts that highlight regions
const countries = feature(topo, topo.objects.countries).features.map(f => ({ id: f.id, name: f.properties.name, d: p(f), centroid: p.centroid(f).map(v => Math.round(v)) }));
fs.writeFileSync('shared/images/world-countries-paths.json', JSON.stringify({ width: W, height: H, projection: 'Equal Earth, fit to 2000x1000', countries }));
console.log('map written', (fs.statSync('shared/images/world-map.svg').size / 1024).toFixed(0) + 'KB', countries.length, 'countries');
