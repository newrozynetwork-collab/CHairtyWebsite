# Build spec for each concept

Project root: `/home/user/CHairtyWebsite/design-concepts`. Your concept folder is `concepts/NN-slug/` (see `shared/DIRECTIONS.md`).
Your mockups are **static HTML/CSS pages rendered by Chromium** and placed into an A4 client PDF. They are design comps, not a working site, so polish matters more than functionality.

## Files you must produce (in your concept folder)

| file | what |
|---|---|
| `index.html` | Homepage. **One responsive page**: the desktop composition at a 1280px viewport and an intentional mobile composition at 390px, using media queries rather than shrinking. |
| `story.html` | The interior page: the feature story "The Long Wait" (see CONTENT.md §16). Desktop at 1280px is required; responsive is nice to have. |
| `components.html` | Contains `<div id="components">` with your UI samples in **one row**: primary button, secondary button, text link, and a tag/chip (optionally a small input). Use the concept's background. At most **640×150 CSS px**. It appears in the PDF style guide. |
| `styles.css` | Shared styles (split into more files if you like). |
| `concept.json` | Metadata for the PDF (schema below). |
| `captures/` | Written by the capture tool. Don't hand-edit it. |

Link fonts with `<link rel="stylesheet" href="../../shared/fonts.css">`. Use images from `../../shared/images/<file>.jpg`, plus `world-map.svg` and `world-countries-paths.json`. `shared/images/manifest.json` (or `manifest-*.json`) lists the images with alt text and focal points; use `object-position` with the focal point.

## Hard constraints (the capture tool checks these)

1. **No external requests.** Everything is local. Only font families from `shared/fonts.css`, and only weights and styles that exist (see `shared/fonts.json`), so no synthesized bold or italic.
2. **Desktop homepage** (1280 wide): total height **≤ 3,100px**. Mark every top-level band with `data-section="name"` (header, hero, latest, report, impact, trust, act, footer and so on). The PDF splits the page across two A4 pages at a section boundary, so there must be a boundary **at or before y = 1,382px**, with the remainder **≤ 1,790px**. In practice, end the hero plus one module somewhere between y ≈ 1,150 and 1,380, and keep the total around 2,800–3,050.
3. **Mobile homepage** (390 wide): height **≤ 3,750px**. It's shown as three columns of ≤ 1,268px, cut at `data-section` boundaries, so keep every mobile section ≤ about 1,200px tall. Use the mobile patterns of your direction (stacking, reordering, horizontal scrollers drawn as partially visible rows, a compact header with menu button and donate).
4. **Interior page** (1280 wide): height **1,520–1,760px**, one A4 page. It's a mockup of the whole page, so you may abbreviate the body copy (keep the given paragraphs in order, shortened if needed), and it must end with end-of-article modules and a compact footer.
5. **No horizontal overflow** at either width, no broken images, no console errors.
6. No lorem ipsum, "TBD", "XXX", "[insert…]" or empty grey boxes. All copy comes from `shared/CONTENT.md`.
7. Don't draw browser chrome or device frames (the PDF adds frames). No cookie banners, pop-ups or animations (render the static resting state).

## Legibility and accessibility (the PDF scales desktop to about 55%, mobile to about 58%)

- Desktop body ≥ 17px (long-form reading 18–21px); UI and nav ≥ 15px; captions and metadata ≥ 13px (use 13px sparingly). **Nothing under 13px.**
- Mobile body ≥ 16px; nothing under 13px.
- Text contrast ≥ 4.5:1 (≥ 3:1 for text ≥ 24px, or ≥ 19px bold). Text over images needs a scrim or a calm image area.
- Headlines: avoid orphans and widows (use `text-wrap: balance` for headings and `text-wrap: pretty` for paragraphs) and avoid awkward breaks.
- Use semantic HTML (`header`, `nav`, `main`, `article`, `footer`, `h1`–`h3`), alt text, and visible focus styles defined in CSS. Show the nav and buttons in their resting state.

## Required homepage content (from CONTENT.md)

Header (wordmark, nav, Donate) · lead feature (§8) · at least 4 latest stories (§9) · the featured report (§10) · impact figures with the visible label **"Sample figures for illustration"** (§11) · trust / how we work (§12) · at least 2 participation modules (§13: campaign, donate, volunteer, event, newsletter) · footer (§15).
Emphasis, order and extra modules follow your direction.

## Workflow

1. Read `shared/CONTENT.md`, `shared/DIRECTIONS.md` (your section, and skim the others so you stay distinct), and `shared/fonts.json`. Look at the image library (open the JPEGs in `shared/images/` with Read).
2. Look at reference screenshots relevant to your direction in `/home/user/CHairtyWebsite/hrw-inspiration/screenshots/` (viewports, `slices/`, `*-structure.txt`) and `/home/user/CHairtyWebsite/hrw-inspiration/REPORT.txt`. Borrow **principles only**.
3. Build `index.html`, `styles.css`, `story.html`, `components.html` and `concept.json`.
4. Render and check: `cd /home/user/CHairtyWebsite/design-concepts && node tools/capture.mjs concepts/NN-slug`. It prints PROBLEMS and WARNINGS and writes `captures/report.json`, full renders and review slices in `captures/review/`.
5. **Look at every review slice with Read** (desktop home, mobile home, story) and critique like a senior art director. Check alignment to the grid, spacing rhythm, hierarchy, crops and focal points, text over images, line breaks, clipping or overlap, empty awkward gaps, consistency, and whether it looks like a polished agency comp. Fix and re-run. **At least 3 full visual passes.** Zero PROBLEMS is mandatory, and fix warnings unless they're false positives.
6. Fill in `concept.json` last, so it describes what you actually built.
7. Preview your four PDF pages exactly as the client will see them: `node tools/build-deck.mjs --concept NN` (NN = your two-digit number), then open `concepts/NN-slug/captures/deck-preview/preview/page-1.jpg` … `page-4.jpg` with Read. Check legibility at PDF scale, that the homepage split falls at a sensible point, that the mobile columns read well, and that the concept text fits the band without clipping. Fix and repeat.

## `concept.json` schema (respect the word limits; this text goes straight into the client PDF)

```json
{
  "number": 1,
  "slug": "01-editorial-authority",
  "name": "Editorial Authority",
  "tagline": "≤ 10 words",
  "idea": "≤ 45 words: the design idea, client-facing language",
  "fit": "≤ 35 words: why it suits this client brief",
  "informedBy": ["3 items, ≤ 14 words each, naming reference principles (P-codes are internal; write plain words)"],
  "distinct": "≤ 35 words: what makes this concept different from the other nine",
  "palette": [{"name": "Ink", "hex": "#15171B", "role": "Text"}],
  "fonts": {"heading": {"family": "Newsreader", "weights": "600, 700"}, "body": {"family": "Libre Franklin", "weights": "400, 600"}, "accent": {"family": "optional", "weights": ""}},
  "buttons": "≤ 20 words",
  "imageDirection": "≤ 30 words",
  "navigation": "≤ 20 words",
  "visualCharacter": "≤ 10 words (comparison table)",
  "contentEmphasis": "≤ 10 words (comparison table)",
  "bestFor": "≤ 16 words (comparison table)",
  "tradeoffs": "≤ 22 words (comparison table: honest downsides)"
}
```

Palette: 5–6 colours, each with a role (Text, Background, Primary action, Accent and so on). Write in plain client-facing English, with no internal jargon and no mention of AI or tools.
