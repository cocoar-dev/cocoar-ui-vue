# Visual baselines

Screenshots of components, compared pixel for pixel on every pull request (CI job **Visual**). They prove a
promise of the library: **what runs without `.coar-mobile` looks exactly as before.**

Each story is photographed four times — default and `.coar-mobile`, light and dark — and four more times
with an element focused by the keyboard when it has a `focus` option:

```
visual/__screenshots__/<story>--default-light.png   <story>--default-dark.png
                       <story>--mobile-light.png    <story>--mobile-dark.png
                       <story>--default-light-focus.png   …
```

A `--default-` image is the look of every web app that uses the library today. A pull request that changes an
existing one is merged only with the maintainer's explicit OK (`pr.mjs merge N --accept-default-visual-change`,
see `AGENTS.md`). New images and changed `--mobile-` images need no such OK.

The comparison itself is guarded the same way: a pull request that modifies, removes or renames one of its files
(the ones marked † below; the list is `VISUAL_HARNESS` in `.alta/skills/cocoar-pr/scripts/pr.mjs`) is merged only
with the maintainer's explicit OK (`--accept-visual-harness-change`). Otherwise a pull request could loosen the
comparison and change components at once, and "Visual" would stay green. Keep such changes in a pull request of
their own. **Existing stories are guarded too**: a story could bring its own CSS that undoes a component change and
keep its images the same. So are the **existing entries of `src/visual/stories.json`**: a changed viewport, action
or capture could stop an image from proving what it proves (a regression at one viewport, the story moved to
another, same image names). `pr.mjs` compares the file at the pull request's base and head entry by entry; a changed
or removed entry needs the same OK. Adding a story (a new file, a new entry, new baselines) needs none.

## Run

```sh
node apps/playground/scripts/visual.mjs                  # compare everything
node apps/playground/scripts/visual.mjs button switch    # compare some stories
node apps/playground/scripts/visual.mjs --update         # write new and changed baselines
node apps/playground/scripts/visual.mjs --repeat 10 tabs # stress: every capture 10 times, each compared exactly
pnpm --filter @cocoar/playground test:visual             # the same as the first line
pnpm --filter @cocoar/playground test:visual:update
```

Needs only Node and a running Docker. The images are made **only** in the Playwright Docker image (the version of
`@playwright/test` in `pnpm-lock.yaml`, `linux/amd64` like CI), never directly on macOS or Windows: every system
rasterises fonts differently, and the comparison has zero tolerance. The script copies the repository into a fresh
container (tracked and untracked files, without `node_modules` and anything ignored), installs there with a pnpm
store kept in the Docker volume `cocoar-visual-cache`, and runs `playwright.visual.config.ts`. A full run (28
stories, 150 images) takes two and a half to three and a half minutes on an Apple-silicon Mac, almost all of it
Chromium running under amd64 emulation (natively a test takes about 1 s instead of 3–4 s); a few stories take well
under one. CI runs the same inner
command, `visual.mjs --inside`, in the same image. The pages are served by their own Vite configuration,
`vite.visual.config.ts`, not the playground's: a plugin or alias added for the playground cannot change what the
baselines render.

Chromium runs with `--disable-lcd-text` and `--disable-partial-raster` (`playwright.visual.config.ts`, with the
measurements next to each flag). Without them a label was now and then drawn with subpixel instead of greyscale
antialiasing, and a rounded corner repainted next to a focus change or an overlay came out 1–2 levels different. A
flag is added only with numbers from `--repeat` runs: with and without it, on the stories that flake. Use
`--repeat` to prove a new story is stable before its baselines are committed.

## Read a failure

The run prints the failing stories. The report is in `apps/playground/visual-results/` (ignored by git):

```sh
pnpm --filter @cocoar/playground exec playwright show-report visual-results/report
```

Each test captures until two captures in a row are byte-identical (the picture has settled: positions, scroll
offsets, fonts, every child), then compares every decoded pixel with the baseline. A failure names the count and the
first differing pixel (`3 pixel(s) differ; first at (50,28): expected rgba(…), actual rgba(…)`); the report shows
expected, actual and a diff image (red where they differ) side by side. Playwright's `toHaveScreenshot` is not used:
it skips pixels it takes for anti-aliasing even at zero tolerance, and it stops at the first capture that matches
the baseline that way, without proving the picture has settled. In CI the job uploads the same folder as the artifact
`visual-report`.

- **Intended change** (a new state, a mobile token): run with `--update`, look at the changed PNGs in the diff of
  your branch, commit them with the change. Say in the pull request which images changed and why.
- **A `--default-` image changed and you did not mean to:** that is the regression this exists for. Fix the code.
- **Only some runs fail:** do not loosen the tolerance and do not add retries. Find what is not deterministic (an
  animation, a font that was not loaded, a value from the clock, an overlay still settling) and fix the story or the
  harness.
- **"a focus ring nobody asked for"**: something has `:focus-visible` in an image that is not about focus. An
  overlay that focuses an element itself (a dialog's first button) declares it with `open.focus`.
- **"the picture never settled"**: 11 captures in a row each differed from the one before. Find what keeps changing.
- **"an invalid entry of stories.json"** / **"every entry of stories.json is valid"**: `manifest.ts` checks every
  entry when it loads (known options, allowed values, viewport limits, action kinds); the message says what is wrong,
  and the page shows it too.

## Add a story

1. Add `src/visual/stories/<name>.vue` (`<name>` = the component's docs folder, e.g. `date-picker`). Show every
   state side by side, statically: sizes, variants, disabled, readonly, error, with and without value. No
   interaction, no random values. Use the layout classes of `src/visual/story.css`. Give values that never fit
   their field enough room (two columns instead of three): a clipped value hides what the image should show.
   A component with an open overlay gets a second story, `<name>-open` (`capture: "page"`), when the closed
   states and the overlay do not fit one picture.
2. Add an entry to `src/visual/stories.json` (options below). A story file without an entry, an entry without a
   file, or a baseline without a story fails the spec.
3. `node apps/playground/scripts/visual.mjs --update <name>`, look at every new image, commit them.

See a story in the browser with `pnpm --filter @cocoar/playground exec vite --config vite.visual.config.ts` and
`http://localhost:5188/visual.html#/visual/<name>?mode=mobile&scheme=dark` (`mode=default|mobile`,
`scheme=light|dark`). The page is its own entry (`visual.html`, `src/visual/main.ts`): fonts, styles, the overlay
plugin and host, localization, and nothing of the playground. `<html>` carries only the classes an app would set
(`coar-mobile`, `dark-mode`). Overlays are opened by the spec, not on load: open them in the browser yourself.

## Options in `stories.json`

| Option | What the spec does |
| --- | --- |
| `"capture": "page"` | Photographs the whole 1024×768 viewport instead of `[data-visual-root]`, for overlays teleported to `body`. The page gets the library's background (`--coar-background-neutral-primary`); nothing may scroll (the test fails if the page is larger than the viewport). |
| `"open": { "actions": […], "overlays": N, "ready": "…", "focus": "…" }` | Opens overlays before the capture (needs `capture: "page"`). Prefer a story that opens its overlay on mount (`useDialog()`, `useContextMenu().open`) and leave `actions` out; components without such an API get `actions`: `{ "dispatch": "click", "on": "<selector>" }` dispatches a click on the element, for overlays that open on click — no pointer moves, nothing is hovered, focus does not move; `{ "keyboardFocus": "<selector>" }` gives the element real keyboard focus, for overlays that open on focus (a tooltip, a tag select) — its ring is then part of the picture and must be named in `open.focus`; `{ "press": "Enter", "on": "<selector>" }` presses a real key on the element. The spec then waits until `N` overlays (`.coar-overlay-host`) are shown — the overlay service shows a host once it has positioned it — and until `ready` (a selector) exists; the settled capture does the rest. `focus` names, as a CSS selector, the element that keeps the focus (focused by the overlay itself, like a dialog's first button, or by `keyboardFocus`): its focus ring is then expected. |
| `"clock": "2026-03-10T09:00:00Z"` | Fixes `Date.now()` (and so `Temporal.Now` of the polyfill) before the page loads; timers keep running. Every story that shows "today" needs it. Locale (`en-US`) and time zone (`UTC`) are fixed for all stories; a zoned story names its zone itself (`time-zone="Europe/Vienna"`). |
| `"focus": "<selector>"` | Adds four images `…-focus.png` with that element focused as keyboard focus (`:focus-visible` must match). The selector is a Playwright selector and must match exactly one element (`… >> nth=2`). The four plain images do not change. |
| `"scope": "local"` | The story puts `coar-mobile` on its own container (the page fails without one). Only the mobile mode is photographed, and `<html>` gets no `coar-mobile`. Needs `capture: "page"`: a local scope is about what leaves the container. |
| `"viewport": { "width": 1280, "height": 900 }` | Another viewport than 1024×768: width 1024–1920, height 768–1200. Not smaller: the 760px story root and its overlays need the room, and below 1024px the library's responsive typography (`max-width: 1023px`) leaves its desktop range, so a story could dodge the default presentation by shrinking the page. |

Only these options and values are allowed: `manifest.ts` checks every entry when it loads, and the spec fails on
anything else. Every image also asserts: nothing is hovered (the pointer never enters the page), and no element shows
a focus ring unless the image is about it (`focus`, `open.focus`). Stories import the packages from source
(`vite.visual.config.ts` aliases `@cocoar/vue-ui`, `/styles`, `/fonts`, `@cocoar/vue-localization`,
`@cocoar/vue-fragment-parser`, `@cocoar/vue-calendar` and its `core`, `recurrence` and `recurrence-rrule-temporal`
entries); component styles come with the source, so a story never imports a built `…/styles` such as
`@cocoar/vue-calendar/styles`.

## How it works

| File | Role |
| --- | --- |
| `src/visual/stories.json` ‡ | The list of stories (data only), read by the view and by the spec. ‡ New entries pass the gate; a changed or removed existing entry needs the OK |
| `src/visual/manifest.ts` † | Types, the run-time validation of every entry, helpers |
| `vite.visual.config.ts` † | The server of the visual page: the Vue plugin and source aliases only, dependency scan of `visual.html` only (so dependencies are pre-bundled), independent of the playground's `vite.config.ts` |
| `visual.html` †, `src/visual/main.ts` † | The page: only what an app of the library sets up. The playground's own `main.ts` loads Monaco and a pdf.js worker (14 MB per page), which made 160 parallel captures crash |
| `src/visual/VisualStoryView.vue` † | Route `#/visual/:story`: sets the classes on `<html>`, renders the story in a fixed 760px `[data-visual-root]`, sets `data-visual-state="ready"` once mounted and the fonts are loaded |
| `src/visual/story.css` † | The layout classes of the stories |
| `visual/visual.spec.ts` † | One test per image (settled capture, then the exact pixel comparison), the options above, plus the manifest checks |
| `visual/warm-up.ts` † | Visits every story once before the tests: a cold Vite dev server compiles and may reload pages |
| `playwright.visual.config.ts` † | Starts `vite.visual.config.ts`; reduced motion, 1024×768 at scale 1, `en-US`, UTC, 4 workers, no retries |
| `scripts/visual.mjs` † | Docker around all of it; `--inside` is what runs in the container and in CI. A failed copy into the container fails the run and copies nothing back |
| `.github/workflows/ci.yml` †, `.alta/skills/cocoar-pr/scripts/pr.mjs` † | The job "Visual", and the merge gate |
