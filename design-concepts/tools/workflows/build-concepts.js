export const meta = {
  name: 'build-concepts',
  description: 'Build website design concepts (HTML mockups), critique each as an art director, refine until ready',
  phases: [
    { title: 'Build', detail: 'one designer agent per concept' },
    { title: 'Critique', detail: 'independent art-director review per concept' },
    { title: 'Refine', detail: 'fix critique findings, re-render, re-verify' },
  ],
}

const ROOT = '/home/user/CHairtyWebsite/design-concepts'
const CONCEPTS = args // e.g. [{num: '01', slug: '01-editorial-authority', name: 'Editorial Authority'}]

const BUILD_SCHEMA = { type: 'object', properties: {
  slug: { type: 'string' }, captureProblems: { type: 'number' }, homeDesktopHeight: { type: 'number' }, homeMobileHeight: { type: 'number' }, storyHeight: { type: 'number' },
  visualPasses: { type: 'number' }, summary: { type: 'string' }, knownWeaknesses: { type: 'string' },
}, required: ['slug', 'captureProblems', 'summary', 'knownWeaknesses'] }

const CRIT_SCHEMA = { type: 'object', properties: {
  verdict: { type: 'string', enum: ['ready', 'needs-work'] },
  strengths: { type: 'string' },
  issues: { type: 'array', items: { type: 'object', properties: {
    severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
    area: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' },
  }, required: ['severity', 'area', 'problem', 'fix'] } },
}, required: ['verdict', 'issues'] }

const designerBrief = c => `You are a senior web/UI designer at a top design agency, producing ONE of ten website design concepts for a client PDF. Your concept: ${c.num} · ${c.name}. Folder: ${ROOT}/concepts/${c.slug}/ (create it).
Read these first, completely: ${ROOT}/shared/BUILD-SPEC.md (how to build/check — follow it exactly), ${ROOT}/shared/CONTENT.md (the brief and verbatim content), ${ROOT}/shared/DIRECTIONS.md (your direction "${c.num} · ${c.name}"; skim the other nine to stay distinct), ${ROOT}/shared/fonts.json, and ${ROOT}/shared/images/manifest.json (image library; view the JPEGs you plan to use with Read).
Reference study (borrow principles only, never copy): ${ROOT}/../hrw-inspiration/REPORT.txt and screenshots in ${ROOT}/../hrw-inspiration/screenshots/.
Quality bar: this goes to a paying client next to nine other concepts. It must look like a polished, art-directed agency comp — confident typography, a clear grid, deliberate spacing rhythm, beautiful image crops, and a composition that is unmistakably "${c.name}" (not a generic template with new colours).
Work only inside your concept folder (never edit shared/ or tools/). No network.`

async function critique(c, round) {
  return agent(`You are an exacting creative director at a top agency doing the final review of website design concept ${c.num} · ${c.name} (${ROOT}/concepts/${c.slug}/) before it goes into a client PDF beside nine other concepts. Round ${round}.
Read ${ROOT}/shared/BUILD-SPEC.md, ${ROOT}/shared/CONTENT.md, and ${ROOT}/shared/DIRECTIONS.md (this concept's direction, and the others to judge distinctness).
First re-render so you review the current state: cd ${ROOT} && node tools/capture.mjs concepts/${c.slug} && node tools/build-deck.mjs --concept ${c.num}
Then LOOK (with Read) at every image in concepts/${c.slug}/captures/review/ and at concepts/${c.slug}/captures/deck-preview/preview/page-1..4.jpg. Read the HTML/CSS and concept.json too.
Judge hard, as the client and a design-award juror would:
- Brief compliance: every required homepage module present; copy verbatim from CONTENT.md (spot-check headlines, dates, figures); "Sample figures for illustration" label present and legible; nothing invented beyond CONTENT.md; English only; no HRW copying (no blue+orange pairing, no white headline panel over photo hero, no dark utility row + blue nav).
- Craft: hierarchy, grid alignment, spacing rhythm, typographic quality (sizes, leading, measure, rag, widows/orphans), image crops/focal points, text over images legible, consistent components, no clipping/overlap/awkward gaps, footer complete, nothing looks unfinished or placeholder-ish.
- Mobile: an intentional composition (not shrunk desktop); header with menu + donate; reads well in the three PDF columns.
- Interior page: complete, coherent feature story page with end modules + compact footer; fits one PDF page.
- Legibility at PDF scale (deck-preview pages): body text readable, nothing too small.
- Distinctness: is it unmistakably this direction and clearly different from the other nine directions? Does it fulfil the direction's signature elements?
- concept.json: client-facing wording, accurate to what was built, within word limits, palette roles correct, no jargon.
Severity: "blocker" = would embarrass us in front of the client / breaks the brief; "major" = clearly noticeable quality or compliance problem; "minor" = polish. Give precise, actionable fixes (what element, what to change). verdict "ready" only if there are no blockers/majors.
Do not edit any files.`, { label: `critique:${c.num}:r${round}`, phase: 'Critique', schema: CRIT_SCHEMA })
}

const results = await pipeline(
  CONCEPTS,
  c => agent(`${designerBrief(c)}

Build the concept now: index.html (responsive desktop 1280 + mobile 390), story.html, components.html, styles.css, concept.json — then run the capture tool, inspect every review slice, iterate (at least 3 full visual passes), and preview the four PDF pages with build-deck --concept ${c.num}. Finish with ZERO capture PROBLEMS.
Return the final heights, how many visual passes you did, a summary of the design, and an honest note on its weakest points.`,
    { label: `build:${c.num}`, phase: 'Build', schema: BUILD_SCHEMA }),
  async (built, c) => {
    let round = 1
    let crit = await critique(c, round)
    const history = []
    while (crit && crit.verdict !== 'ready' && round <= 2) {
      const must = crit.issues.filter(i => i.severity !== 'minor')
      const minors = crit.issues.filter(i => i.severity === 'minor')
      const fix = await agent(`${designerBrief(c)}

Your concept already exists. An exacting creative director reviewed it (round ${round}). Fix EVERY blocker and major issue, and as many minor issues as is sensible, without breaking what works or the hard constraints:
${must.map(i => `- [${i.severity}] (${i.area}) ${i.problem} → FIX: ${i.fix}`).join('\n')}
${minors.length ? 'Minor:\n' + minors.map(i => `- (${i.area}) ${i.problem} → ${i.fix}`).join('\n') : ''}
After fixing: cd ${ROOT} && node tools/capture.mjs concepts/${c.slug} (must report zero PROBLEMS), inspect the affected review slices with Read, then node tools/build-deck.mjs --concept ${c.num} and check the four preview pages. Update concept.json if the design changed.
Return a short list of what you changed and anything you could not fix (with reason).`,
        { label: `refine:${c.num}:r${round}`, phase: 'Refine' })
      history.push({ round, issues: crit.issues.length, fixSummary: fix })
      round++
      crit = await critique(c, round)
    }
    return { slug: c.slug, built, finalVerdict: crit?.verdict, remainingIssues: crit?.issues || [], strengths: crit?.strengths, rounds: history.length }
  },
)
return results
