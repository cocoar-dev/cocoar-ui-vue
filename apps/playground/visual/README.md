# Visual baselines

Screenshots of components, compared pixel for pixel on every pull request (CI job **Visual**). They prove a
promise of the library: **what runs without `.coar-mobile` looks exactly as before.**

Each story is photographed four times — default and `.coar-mobile`, light and dark:

```
visual/__screenshots__/<story>--default-light.png   <story>--default-dark.png
                       <story>--mobile-light.png    <story>--mobile-dark.png
```

A `--default-` image is the look of every web app that uses the library today. A pull request that changes an
existing one is merged only with the maintainer's explicit OK (`pr.mjs merge N --accept-default-visual-change`,
see `AGENTS.md`). New images and changed `--mobile-` images need no such OK.

The comparison itself is guarded the same way: a pull request that modifies, removes or renames one of its files
(the ones marked † below; the list is `VISUAL_HARNESS` in `.alta/skills/cocoar-pr/scripts/pr.mjs`) is merged only
with the maintainer's explicit OK (`--accept-visual-harness-change`). Otherwise a pull request could loosen the
comparison and change components at once, and "Visual" would stay green. Keep such changes in a pull request of
their own. **Existing stories are guarded too**: a story could bring its own CSS that undoes a component change and
keep its images the same. The list of stories, `src/visual/stories.json`, is data and not guarded: adding a story
(a new file, an entry, new baselines) needs no OK.

## Run

```sh
node apps/playground/scripts/visual.mjs                  # compare everything
node apps/playground/scripts/visual.mjs button switch    # compare some stories
node apps/playground/scripts/visual.mjs --update         # write new and changed baselines
pnpm --filter @cocoar/playground test:visual             # the same as the first line
pnpm --filter @cocoar/playground test:visual:update
```

Needs only Node and a running Docker. The images are made **only** in the Playwright Docker image (the version of
`@playwright/test` in `pnpm-lock.yaml`, `linux/amd64` like CI), never directly on macOS or Windows: every system
rasterises fonts differently, and the comparison has zero tolerance. The script copies the repository into a fresh
container (tracked and untracked files, without `node_modules` and anything ignored), installs there with a pnpm
store kept in the Docker volume `cocoar-visual-cache`, and runs `playwright.visual.config.ts`. A run takes about a
minute, cold or warm. CI runs the same inner command, `visual.mjs --inside`, in the same image.

## Read a failure

The run prints the failing stories. The report is in `apps/playground/visual-results/` (ignored by git):

```sh
pnpm --filter @cocoar/playground exec playwright show-report visual-results/report
```

Each test compares twice. `toHaveScreenshot` waits for a stable capture and, when it fails, shows expected, actual
and a diff image (`visual-results/artifacts/…`). It skips pixels it takes for anti-aliasing even at zero
tolerance, so an exact comparison of every decoded pixel follows; its failure names the count and the first
differing pixel (`3 pixel(s) differ; first at (50,28): expected rgba(…), actual rgba(…)`) and attaches the actual
image to the report. In CI the job uploads the same folder as the artifact `visual-report`.

- **Intended change** (a new state, a mobile token): run with `--update`, look at the changed PNGs in the diff of
  your branch, commit them with the change. Say in the pull request which images changed and why.
- **A `--default-` image changed and you did not mean to:** that is the regression this exists for. Fix the code.
- **Only some runs fail:** do not loosen the tolerance. Find what is not deterministic (an animation, a font that
  was not loaded, a value from the clock) and fix the story or the view.

## Add a story

1. Add `src/visual/stories/<name>.vue` (`<name>` = the component's docs folder, e.g. `date-picker`). Show every
   state side by side, statically: sizes, variants, disabled, readonly, error, with and without value. No
   interaction, no random values, no clock. Use the layout classes of `src/visual/story.css`.
2. Add `{ "name": "<name>" }` to `src/visual/stories.json`. A story file without an entry, an entry without a file,
   or a baseline without a story fails the spec.
3. `node apps/playground/scripts/visual.mjs --update <name>`, look at the four new images, commit them.

See a story in the browser with `pnpm --filter @cocoar/playground dev` and
`http://localhost:5188/visual/<name>?mode=mobile&scheme=dark` (`mode=default|mobile`, `scheme=light|dark`). The
route is bare: no playground navigation and no theme editor, and `<html>` carries only the classes an app would
set (`coar-mobile`, `dark-mode`).

## How it works

| File | Role |
| --- | --- |
| `src/visual/stories.json` | The list of stories (data only), read by the view and by the spec |
| `src/visual/manifest.ts` † | Types and helpers around the list |
| `src/visual/VisualStoryView.vue` † | Route `/visual/:story`: sets the classes on `<html>`, renders the story in a fixed 760px `[data-visual-root]`, sets `data-visual-state="ready"` once mounted and the fonts are loaded |
| `src/visual/story.css` † | The layout classes of the stories |
| `visual/visual.spec.ts` † | One test per story × mode × scheme (`toHaveScreenshot`, then the exact pixel comparison), plus the manifest checks |
| `visual/warm-up.ts` † | Visits every story once before the tests: a cold Vite dev server compiles and may reload pages |
| `playwright.visual.config.ts` † | `maxDiffPixels: 0`, `threshold: 0`, animations off, caret hidden, reduced motion, 1024×768 at scale 1, no retries |
| `scripts/visual.mjs` † | Docker around all of it; `--inside` is what runs in the container and in CI. A failed copy into the container fails the run and copies nothing back |
| `.github/workflows/ci.yml` †, `.alta/skills/cocoar-pr/scripts/pr.mjs` † | The job "Visual", and the merge gate |
