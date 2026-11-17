# Library gallery — complex packages in the design-review page

Record of the initial supplemental comparison gallery and subsequent colour-regression checks.
It is not an approval. It does not close the inventory's matrix. Chromium only, against the
normal playground dev server (`vite.config.ts`, which aliases the package sources). `vite.visual.config.ts` lacks
those aliases and is guarded, so it was not changed and these scenes have no visual baselines.

## Open it

| URL | Shows |
| --- | --- |
| `/design-review?kind=<scene>` | Legacy beside compact, same synthetic data; controls: mode, mobile (`.coar-mobile`), compact font |
| `…&mode=dark&mobile=true&profile=compact` | One profile (`legacy`/`compact`), dark, mobile class |
| `…&isolate=true` | Every scene in one iframe per profile, not only the isolated ones |
| `/design-review?frame=1&kind=<scene>&profile=compact&mode=dark&mobile=false&font=Inter` | The frame page: one profile, with profile, mode and mobile on `<html>` |

The core kinds (`typography`, `fields`, `selection`, `dates`, `states`), their selectors and
`e2e/compact-presentation.spec.ts` are unchanged (5/5 pass).

## Files

- `src/views/CompactDesignReviewView.vue`: the library scenes in the `Bereich` select, the frame page, iframes.
- `src/design-review/library-scenes.ts`: the scene registry (id, packages, isolation, ready selector).
- `src/design-review/scenes/*.vue`: **profile-neutral now**. The hardcoded `.coar-compact` is gone. Scenes that drew
  default and compact side by side (markdown viewer, editor, panels, form, mermaid) now draw one profile, and the
  gallery decides. When a draft is promoted to a visual story, wrap it in `.coar-compact`, as
  `CompactPresentationScene.vue` does for the core kinds. The `ready` selector
  `.coar-pdf-annotation-popover.coar-compact` of `grid-viewer-map.json` assumes such a wrapper.
- New scenes: `compact-script-editor.vue` and `compact-composition.vue`.
- `e2e/compact-library.spec.ts`: the browser checks below.

`@cocoar/vue-markdown-form` has no alias in `vite.config.ts` and is not a playground dependency. The scenes import
its source and stylesheet by path. Its own imports resolve through the playground aliases, so only one instance of
each package is loaded.

## Initial scenes

The registry now also includes follow-up state scenes; this table records the initial delegated scope.

| Scene (`kind`) | Packages | Isolation | Covers |
| --- | --- | --- | --- |
| `data-grid` | data-grid | inline | search toolbar, selection checkboxes, sortable header, date/currency/number/tag/checkbox/icon renderers |
| `data-grid-tree` | data-grid | inline | tree toggles, indentation, child counts, quick-filter search |
| `document-viewer` | document-viewer | inline | toolbar, thumbnails, annotations panel, all annotation types (inline SVG gallery) |
| `document-viewer-open` | document-viewer | inline | annotation popover (teleported to body), item menu (`CoarPopover`) |
| `document-viewer-pdf` | document-viewer | inline | local 2-page PDF painted by pdf.js in a worker, PDF info rows, thumbnails |
| `map` | map | inline | Leaflet controls and attribution, pins, route, legend, caption, point list (no tile layer) |
| `map-editor` | map | inline | editor pins and vertices, property popup with the point form |
| `markdown-viewer` | markdown, markdown-core | inline | h1–h6, reading text, lists, task list, quote, table, frontmatter, code block, unknown embed |
| `markdown-editor` | markdown-editor | inline | fixed toolbar, external toolbar of a group, empty placeholder |
| `markdown-editor-panels` | markdown-editor | inline | table size picker, color picker, image dialog body, code-block shell (mounted inline) |
| `markdown-form` | markdown-form | inline | Cocoar and basic controls, block Markdown field, shown errors, invalid template, readonly |
| `mermaid` | mermaid | **frame** | zoomable diagram and controls, error state |
| `markdown-phone` | editor, markdown, form, mermaid | **frame** | phone composition at 390 px |
| `page-builder` | page-builder | inline | structure drawer open, field selected, inspector, canvas, empty container |
| `script-editor` | script-editor | **frame** | editor with a locked line and extra-lib types, inline variant in form fields (hint, error), readonly, placeholder |
| `composition` | ui, data-grid, map, markdown, markdown-form, mermaid | **frame** | field-service screen: editable and filterable grid (text and select editors, floating filter), map of the same sites, Markdown note in a card, visit form, approval flow, buttons and tags |

Isolation is a frame where the renderer keeps its theme for the whole page. Monaco has one theme per page, and the
compact Monaco theme applies only to `.coar-compact` on `<html>`/`<body>`. Mermaid initializes one config per page and
does not read it again when the mode of the same profile changes. The composition scene contains a Mermaid diagram.

## Initial measurements (Chromium, `e2e/compact-library.spec.ts`)

The initial delegated run had 80 cases, repeated twice, including three expected failures for findings 1–2.
That result is historical, not evidence that the current full gallery passed. The markers have since been
removed. A current targeted run passed **20/20 ordinary assertions**: no light colour-scheme island in the
19 inline scenes and the compact dark Monaco surface matching its owner. Log:
`tmp/compact-design-037399/verification/gallery-color-regressions-current.log`.

- **Matrix** (48 tests): every scene × light / dark / dark + `.coar-mobile`, 1600 × 1000.
  - Both columns show the real renderer (the ready selector is visible and the same number of items appears in
    each column).
  - The column classes are right, and the nearest mode scope matches the selected mode.
  - `--coar-ui-font-size` is undefined in legacy, `13px` in compact and `14px` in compact mobile.
  - Every Inter weight the compact text uses has a loaded face after `document.fonts.ready`.
  - No page error, no console error, and no request leaves localhost (no tiles, no remote fonts, no remote PDF).
  - Frame scenes: one iframe per profile; the classes on `<html>` are right; the playground navigation is hidden.
- **Geometry and roles**, legacy → compact (→ compact mobile):
  - grid row and header: 40 → 36 (→ 44); legacy mobile stays 40. Font 14 → 13 (→ 14).
  - grid tree toggle: 20 → 20 (→ 44).
  - viewer header (`.coar-sidebar--side-top`): 44 → 40 (→ 48).
  - markdown h1: 32px/700 → 24px/600. Table header: uppercase → none. Reading text: 16px Poppins → 14px Inter
    (→ 15px).
  - page-builder tree row: 30 → 36 (→ 44).
  - script-editor frame radius: 2px → 6px.
  - composition: select option 36 and grid row 36 in compact.
  - Mermaid label font: Poppins → Inter. Node fill differs per document.
- **Real interaction**:
  - grid: row selection, sort (`aria-sort=ascending`), the tree search filters rows.
  - document viewer:
    - The annotation popover carries `coar-compact coar-mobile dark-mode` in compact and none of them in legacy.
    - The item menu opens in an overlay host with or without `coar-compact`, matching the column.
    - The popover stays inside the viewport.
  - PDF: the canvas has ink in both profiles, and the info shows "Quarterly report".
  - map: no `.leaflet-tile`, 4 markers, 5 point-list rows. The editor's Label field can be edited per column.
  - markdown editor:
    - The real toolbar's table picker opens in an overlay host with `dark-mode`, and `coar-compact` only in
      compact. It stays inside the viewport and closes on Escape.
    - Typing changes only the compact editor.
  - markdown form: one error field per column, and input is accepted.
  - script editor:
    - Legacy documents keep `--vscode-editor-background`/`LineNumber` at `#ffffff`/`#9ca3af` in light and
      `#1a1a1a`/`#6b7280` in dark.
    - In a compact light document, the editor background and the line numbers equal the scene's
      `--coar-background-neutral-primary` and `--coar-text-neutral-tertiary`.
    - IntelliSense (`VisitContext.` → `site`, `user`) opens inside the viewport in both profiles.
  - composition, per profile, dark:
    - The select editor's dropdown opens in a `dark-mode` overlay host, and the chosen value lands in the cell.
    - The floating filter `park` leaves 1 row (Hyde Park). The AG Grid filter popup opens inside the viewport.
    - The map, the Mermaid diagram and the form error are all present.
  - markdown phone at 390 × 844: no horizontal overflow in either profile. The viewer text is 16px in legacy and
    15px in compact (the editor's own text stays 16px).

## Resolved colour findings

1. **Compact dark document roles were overridden by legacy root colours.**
   - Original cause: `packages/ui/styles/tokens/colors-usage.css:182` declares the dark roles on `:root.dark-mode`
     (specificity 0,2,0). On `<html class="coar-compact dark-mode">` that beats `.coar-compact` in
     `tokens/compact.css:19` (0,1,0). Only the descendants re-declared by
     `.coar-compact :where(.dark-mode, …)` get the compact roles.
   - Originally measured in the `script-editor` compact dark frame:
     - `<body>` resolves `--coar-background-neutral-primary` to `rgb(63, 63, 70)`; the scene inside resolves it to
       `rgb(28, 36, 49)`.
     - `--coar-text-neutral-tertiary` is `rgb(212, 212, 216)` on `<body>` and `rgb(168, 182, 202)` in the scene.
   - Original effect: `refreshCompactTheme` (script-editor) probes on `<body>`, so the compact dark Monaco theme received the
     legacy dark zinc (`#3f3f46`, line numbers `#d4d4d8`). Anything else that reads roles at the document level in
     an app with `.coar-compact.dark-mode` on `<html>` (the page background, for one) gets them too. Light
     documents are fine: the selectors have equal specificity there and `compact.css` comes later.
   - Fix: `tokens/compact.css` includes `:root.coar-compact` on the role boundary, matching root specificity.
   - Test: `script editor in a compact dark document matches the dark compact surface` is an ordinary assertion
     and passed in the current targeted run; no `test.fail()` marker remains.
2. **AG Grid forced light colour resolution inside a dark compact area.**
   - Original cause: AG Grid 35 sets `color-scheme: light` on `.ag-root-wrapper`. The compact adapter's `--ag-*` roles are
     `light-dark()` pairs (for example `--ag-background-color: light-dark(#ffffff, #1c2431)`), so they resolve light
     there: `.ag-root-wrapper` background `rgb(255, 255, 255)` while every ancestor has `color-scheme: dark`.
   - Seen in `data-grid`, `data-grid-tree` and the `composition` frame: a white grid on a dark page. Legacy dark is
     not affected (`#3f3f46`).
   - Scan: no other inline scene and no other frame scene has such an island.
   - Fix: the compact adapter supplies `--ag-browser-color-scheme` from the owning compact scheme, covering
     both the wrapper and popup roots rather than overriding the wrapper alone.
   - Tests: `compact dark: no light color-scheme island` passed for all 19 current inline scenes, including
     data-grid and tree, with no expected-failure markers. Open filter popup coverage is recorded separately
     in the grid/viewer/map audit; these island checks alone do not prove every popup state.

## Observations, not failures

- In a gallery column (about 690 px), the `data-grid` scene shrinks its flex Name column to "A…" in both profiles:
  the fixed widths add up to more than the column. The scene was sized for the 1232 px story width.
- The map editor's property popup reaches below the map and the column in both profiles (Leaflet popup placement,
  pre-existing).
- The first inline text input of the legacy markdown form computes `font-size: 11px` (compact: 14px). Default
  presentation, not changed; noted for the form owner.
- The tree search highlight (`searchHighlight()`, search `vue`) produced no element with a `mark`/`highlight` class
  in either profile. Its markup was not investigated, so this is neither a pass nor a failure.

## Not covered

- **No device and no WebKit.** `.coar-mobile` is class emulation in desktop Chromium. Only `markdown-phone` runs at a
  phone viewport, without touch. Native and WebKit runs are separate and are not claimed here.
- **No pixel baselines** for these scenes, because the visual harness can't resolve the packages. The PDF check is
  "ink present", not a pixel comparison.
- **Not opened:**
  - page builder: the Logic tab and the code dialogs (Monaco).
  - document viewer: the search bar, the outline (the fixture has none) and the toolbar flyout.
  - grid: column menus (the custom header has none), and editors other than text and select.
  - markdown editor: the floating toolbar and the table handles (hover-driven).
  - map: dragging.
- **The calendar and UI compact stories** in `src/visual/stories/` are not adapted: they hardcode the profile and that
  folder is protected. The visual harness covers them.
- The duplicated teleport helpers (document viewer `presentation-context.ts`, markdown editor `compact-profile.ts`)
  are left for the parent's shared `useCompactPresentationContext`. Teleported surfaces were checked through their
  real behavior, not their implementation.
- The playground is not part of `pnpm typecheck`. `vue-tsc` on it reports 17 errors that were already there; one of
  them is in this folder (`compact-document-viewer-pdf.vue`, TS7016: `@cocoar/vue-document-viewer/pdf` has no
  declaration in `dist`, the same error as `PdfViewerView.vue`). The gallery view and the new scenes add none.
