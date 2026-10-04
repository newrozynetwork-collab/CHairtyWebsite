# Shared imagery library — art direction

These images stand in for the client's own documentary photography in ten website design concepts. They're original artwork created for this proposal, so they carry no licensing risk. All ten concepts reuse the same set and each concept applies its own treatment (crop, duotone, grayscale, grain, colour grade), so the source images must be **neutral, natural and treatment-friendly**.

## Series style: "documentary illustration"

- Cinematic, painterly digital illustration built from layered shapes, gradients and procedural texture, with **photographic lighting logic**: one clear light source, atmospheric haze, soft cast shadows, and depth from value contrast and blur (near/far).
- Subtle film grain (about 2–4% luminance noise) and a gentle vignette. Avoid flat vector "clip-art" looks, cartoon outlines and drop shadows.
- Palette: natural, slightly muted, warm-neutral bias. Avoid oversaturation. Every image needs a clear value structure: it must read at thumbnail size and still work in grayscale.
- **Dignity first.** People appear only as silhouettes, from behind, or at a distance. No facial features, no identifiable individuals, no suffering imagery, no weapons, no blood, no flags, no religious or political symbols, no logos, and no legible text (handwriting or chalk marks must be illegible scribbles).
- Human figures need natural proportions (head ≈ 1/7.5 of standing height for adults, about 1/5 for small children), a believable stance and weight, and soft edges where they sit in haze. If a figure starts to look awkward, simplify it, push it further into the distance or into backlight. Never leave an anatomically odd figure.
- Composition must survive crops to 16:9, 3:2, 4:5 and 1:1. Keep the key subject inside the central 70% of the width and 80% of the height, and note the focal point. Hero images (empty-chair, valley-dawn, road-dusk, city-dusk) need a calm area (sky or wall) where a headline could sit.
- Quality bar: it must be able to sit in a design agency's comp as a stand-in for commissioned photography without looking amateur. **Prefer bold simplification and beautiful light over fussy detail.**

## Technical requirements

- Source: `shared/images/src/<name>.html`. A self-contained page with a 2400×1600 `<canvas>` (or inline SVG), `margin:0`, no external URLs, and no `Math.random()` without a seeded PRNG (results must be deterministic). Set `window.__done = true` when drawing finishes.
- Render: `node tools/render-image.mjs shared/images/src/<name>.html shared/images/<name>.jpg 2400 1600 88`, run from `/home/user/CHairtyWebsite/design-concepts`.
- Look at every render with the Read tool and iterate: at least 2 revision passes per image, more if it isn't at the quality bar.
- Useful techniques: `ctx.filter = 'blur(…)'` for depth and haze, radial gradients for light pools and bokeh, `globalCompositeOperation` (`screen`, `multiply`, `soft-light`) for light and shade, seeded value noise or fBm for terrain and texture, many low-alpha strokes for painterly surfaces, a per-pixel grain pass via `getImageData`, and light shafts as blurred polygons with `screen` blending.

## The set (15 images, 2400×1600)

| file | subject | used for |
|---|---|---|
| empty-chair | Quiet interior: a simple wooden chair beside a small side table near a tall window. Morning light beam across the floor, dust motes in the beam. A small picture frame on the table, seen from the side or back (no visible photo). Muted plaster wall; calm wall area upper-left for text. Mood: absence, waiting. | Lead feature "The Long Wait" |
| vigil-candles | Night: dozens of small candles in glass jars on stone steps, warm bokeh, out-of-focus silhouettes of standing people behind. | Missing persons, remembrance, human stories |
| school-tent | Inside a large canvas tent used as a classroom: low wooden benches, a blackboard with illegible chalk marks, colourful backpacks hanging on a rope line, warm light glowing through the tent fabric. | Children's education story, report, campaign |
| heat-roofs | Elevated view over dense corrugated-metal roofs of an informal settlement under a white-hot hazy sky, with heat shimmer, water tanks and the sun upper right. | Heat waves and climate research brief |
| press-mics | Close view of a cluster of 6–8 microphones with varied shapes and muted foam covers (no logos) at a podium edge, against a blurred hall backdrop. | Free expression and journalists story |
| legal-clinic | Outdoors under a large tree: a folding table with stacks of papers, a clipboard, a rubber stamp and a thermos, plastic chairs, two seated silhouettes from behind at a distance, fields beyond, dappled light. | Women's land rights and mobile legal clinics |
| road-dusk | A long rural road vanishing to the horizon at dusk. An adult and a child, both silhouettes, walk away from camera carrying bags. Power poles, and a wide warm-to-blue sky with a calm area for text. | Asylum rules Q&A, displacement |
| shelter-ramp | A row of prefabricated shelter units, with a gentle access ramp and handrail leading to a door. An empty wheelchair, or a figure in a wheelchair seen from behind, at the ramp's base. Clear daylight, gravel ground. | Disability-inclusive shelters |
| community-table | A long table set with simple cups and a teapot under string lights in a courtyard at early evening, with chairs and seated silhouettes at the far end. Warm and welcoming. | Volunteering, community, events |
| city-dusk | City skyline at blue hour from a rooftop, with lit windows, generic civic buildings (no recognisable landmarks) and a calm sky for text. | Public briefing event, policy work |
| valley-dawn | Wide mountain valley at dawn: layered ridges in mist, a river catching light, a small village of low houses, strong atmospheric perspective and a calm sky. | Regions and "where we work", about, hero alternative |
| field-notebook | Top-down flat lay on a wooden table: an open notebook with illegible handwriting lines, a pen, a small voice recorder, a folded paper map, a cup of tea and reading glasses. Soft window light from the left. | Research methodology, "how we work" |
| window-silhouette | A woman's silhouette (upper body, side or back view) at a window, holding a small picture frame against her chest. Backlit, sheer curtain, intimate; no facial detail. | Human stories, testimony |
| water-jerrycans | Rows of yellow and blue plastic jerrycans lined up on dusty ground beside a water tap stand. Low camera angle, long morning shadows. | Humanitarian response, impact |
| school-morning | A small single-storey school building with painted walls, in morning light. Several child silhouettes with backpacks walk towards it along a dirt path, with a tree and soft sun. | Impact story (school places), campaign success |

## Manifest

Each image gets an entry in `shared/images/manifest.json` (array) with these fields:
`{ "file": "empty-chair.jpg", "title": "...", "alt": "concise alt text describing the scene", "focal": {"x": 0.62, "y": 0.55}, "calmArea": "upper-left", "palette": ["#...", "#..."], "credit": "Original illustration created for this proposal" }`.
`focal` x and y are fractions of width and height; use them for CSS `object-position`.
