# Website design concepts: Daybreak Rights Network (provisional brand)

Ten website design concepts inspired by the principles in `../hrw-inspiration/`, delivered as one client PDF:

**`deck/Client_Website_10_Design_Concepts.pdf`** (45 A4 pages)

Each concept has a desktop homepage (1280 px, over two pages), a mobile homepage (390 px), the same interior page (the feature story "The Long Wait"), and a style guide. The PDF closes with a comparison table, a recommendation and a selection form.

"Daybreak Rights Network" is a provisional name. All names, figures, stories and quotations are sample content, and the images are original illustrations standing in for the client's photography.

## Editable sources

| Path | What |
|---|---|
| `concepts/NN-slug/index.html`, `story.html`, `styles.css` | The mockups as static HTML/CSS. Open them in a browser and resize to see the desktop and mobile layouts. |
| `concepts/NN-slug/concept.json` | Concept text, palette and fonts used in the PDF |
| `shared/CONTENT.md` | The provisional brief and the shared sample content |
| `shared/DIRECTIONS.md` | The ten creative directions |
| `shared/BUILD-SPEC.md` | Size and quality rules for the mockups |
| `shared/images/` | Original illustrations (`src/` holds their generator pages) and a world map built from Natural Earth data |
| `shared/fonts/` | Open-licence fonts (SIL OFL 1.1; licence files included) |
| `deck/deck-content.json` | Text for the cover, brief, recommendation and form |

## Rebuilding the PDF

Requires Node 18+, Python 3 with Pillow, Playwright's Chromium and `pdftoppm`.

```sh
npm install                                   # fonts and map data
node tools/capture.mjs concepts/01-editorial-authority   # render + QA one concept (repeat per concept)
node tools/build-deck.mjs                     # assemble deck/Client_Website_10_Design_Concepts.pdf
node tools/build-deck.mjs --concept 01        # preview one concept's four pages
```

`tools/capture.mjs` reports problems such as broken images, missing fonts, low contrast, placeholder text and pages that won't fit the PDF layout. Fix any it reports before building the deck.
