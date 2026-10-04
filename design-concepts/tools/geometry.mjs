// Shared PDF page geometry (A4 portrait) and the planners that decide how long mockups are split across PDF pages.
const MM = 96 / 25.4; // css px per mm
const contentW = 188 * MM; // 210mm page - 2 x 11mm margins
const contentH = 269 * MM; // 297mm page - 14mm top - 14mm bottom
const desktopWidth = 1280;
const mobileWidth = 390;
const desktopScale = contentW / desktopWidth;
const p1MockupH = (269 - 56 - 6 - 4) * MM; // minus concept band (56mm), caption (6mm), browser bar (4mm)
const p2MockupH = (269 - 6) * MM; // minus caption
const mobileAreaH = (269 - 6 - 66 - 4) * MM; // minus caption, style-guide band (66mm), gap
const mobileGap = 5 * MM;
const mobileColW = (contentW - 2 * mobileGap) / 3;
const mobileScale = mobileColW / mobileWidth;

export const GEOMETRY = {
  page: { widthMm: 210, heightMm: 297, marginTopMm: 14, marginBottomMm: 14, marginSideMm: 11 },
  MM, contentW, contentH, desktopWidth, mobileWidth, desktopScale, mobileScale, mobileColW, mobileGap,
  bandMm: 56, captionMm: 6, chromeMm: 4, styleBandMm: 66,
  homeDesktopCap1: Math.floor(p1MockupH / desktopScale), // first PDF page
  homeDesktopCap2: Math.floor(p2MockupH / desktopScale), // second PDF page
  homeDesktopMax: 3100,
  homeMobileColumnCap: Math.floor(mobileAreaH / mobileScale),
  homeMobileMax: 3750,
  storyMax: Math.floor(((269 - 6 - 4) * MM) / desktopScale), // caption + browser bar
  storyMin: 1520,
  componentsMax: { width: 640, height: 150 },
};

// Split the desktop homepage at a top-level section boundary: part 1 must fit cap1, part 2 must fit cap2.
export function planDesktopSplit(height, sections) {
  const { homeDesktopCap1: cap1, homeDesktopCap2: cap2 } = GEOMETRY;
  const bounds = [...new Set(sections.flatMap(s => [s.top, s.bottom]).filter(b => b > 0 && b < height))].sort((a, b) => a - b);
  const valid = bounds.filter(b => b <= cap1 && height - b <= cap2);
  if (valid.length) {
    const cut = valid[valid.length - 1];
    return { ok: true, cut, part1: cut, part2: height - cut, cap1, cap2 };
  }
  const lo = Math.max(0, height - cap2);
  return { ok: false, cap1, cap2, reason: `no top-level section boundary between y=${lo} and y=${cap1} (needed so page 1 holds ≤${cap1}px and page 2 holds ≤${cap2}px). Boundaries found: ${bounds.join(', ') || 'none'}. Adjust section heights or shorten the page.` };
}

// Pack the mobile homepage into 3 columns, cutting at section boundaries where possible.
export function planMobileColumns(height, sections, columns = 3) {
  const cap = GEOMETRY.homeMobileColumnCap;
  const bounds = [...new Set(sections.flatMap(s => [s.top, s.bottom]).filter(b => b > 0 && b < height))].sort((a, b) => a - b);
  const cols = []; let start = 0; const warnings = [];
  for (let c = 0; c < columns && start < height; c++) {
    if (height - start <= cap) { cols.push([start, height]); start = height; break; }
    const fits = bounds.filter(b => b > start + 200 && b <= start + cap);
    let end;
    if (fits.length) end = fits[fits.length - 1];
    else { end = start + cap; warnings.push(`column ${c + 1} cuts mid-section at y=${end}`); }
    cols.push([start, end]); start = end;
  }
  if (start < height) return { ok: false, cap, columns: cols, reason: `does not fit in ${columns} columns of ${cap}px when cut at section boundaries (${height - start}px left over). Shorten the mobile page or make sections smaller.` };
  return { ok: true, cap, columns: cols, warnings };
}
