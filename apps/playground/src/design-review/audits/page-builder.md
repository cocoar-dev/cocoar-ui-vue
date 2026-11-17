# Compact presentation — `packages/page-builder` audit ledger

Scope: `packages/page-builder/**` (all 97 `.vue` files, the TS that produces styles), its docs pages and demos.
Record for the parent agent, **not** a claim of complete verification. Status words:
**changed** (wired to compact roles), **unchanged — reason**, **content** (authored page, deliberately outside the profile).

## Mechanism

- New `src/styles/compact.css`, imported first by `src/index.ts` (so it is part of `@cocoar/vue-page-builder/styles`,
  `dist/index.css`; verified in a local `vite build`, dist removed again). Every rule is scoped by
  `:is(.coar-compact, .coar-compact *)`; nothing global.
- Package roles `--coar-page-builder-*` are declared on the **chrome roots** (`.pb-builder`, `.pb-props`,
  `.pb-select-options` (public `OptionsEditor`), and the three teleported code dialogs), so derived values re-resolve under a
  `.coar-mobile` or any shared-role scope between `.coar-compact` and the builder.
- Components consume `var(--coar-page-builder-X, <exact legacy literal>)`. Outside `.coar-compact` nothing defines a role,
  so default and `.coar-mobile` keep the exact previous values. Checked mechanically: substituting every fallback back into
  the diff reproduces `HEAD` except two equivalent `calc()`s (`calc((32px - 44px) / 2)` = `-6px`, `calc((40px - 24px) / 2)` = `8px`)
  and comments.
- Declarations the default presentation does **not** make (heading/`strong`/`th` weights, add-menu row min-height, chrome
  line-height, native select text colour) live only in `compact.css`: a "legacy" fallback in the component would override a
  host reset (e.g. Tailwind preflight `h3 { font-weight: inherit }`).
- Authored content isolation: in compact, `.pb-canvas__content` and `.pb-builder__preview-frame` pin `font-size: 13px;
  font-weight: 400` — exactly what they inherited from the builder before — so a compact/mobile chrome size (14px) never
  resizes the page being authored. Line height is not pinned (the builder never set one; content keeps the host's).

### Shared roles consumed (parent-owned, fallbacks = the values of the contract)

`--coar-ui-font-size` (13), `--coar-ui-line-height` (1.4), `--coar-caption-font-size` (12), `--coar-label-font-weight` (500),
`--coar-field-font-size` (14), `--coar-interactive-row-height` (36), `--coar-panel-padding` (16), `--coar-content-gap` (8),
`--coar-control-radius` (6), `--coar-panel-radius` (8); existing colour roles `--coar-text-on-bold`, `--coar-surface-input`,
`--coar-background-neutral-*`, `--coar-border-neutral(-tertiary)`, `--coar-text-neutral-secondary`,
`--coar-background-accent-primary`, `--coar-text-semantic-error-bold`, `--coar-shadow-m`.

### Package roles (defined only in `.coar-compact`)

| Role | Compact value | Legacy values it replaces |
| --- | --- | --- |
| `font-size` | `--coar-ui-font-size` (13 / 14 mobile) | 12–13px UI text: root, tab buttons, tree rows, library items, add-menu items, JSON Apply, list titles |
| `label-font-size` | `--coar-caption-font-size` (12) | 12px labels, pane titles, inline form labels |
| `label-font-weight` | `--coar-label-font-weight` (500) | 500 titles; 600 active segment → 500 |
| `meta-font-size` | caption (12) | 11px hints, small actions, toolbar labels, zoom input (raised: 11px was below the profile's floor) |
| `badge-font-size` | `max(11px, caption − 1px)` → 11 / 12 | 9–10px chips, counts, canvas type tabs, tiny code |
| `code-font-size` | caption (12) | JSON editor, translation keys |
| `field-font-size` | `--coar-field-font-size` (14 / 16 mobile) | paragraph textarea 13px |
| `panel-heading-font-size` | 16px | Translations h3 18px, Compositions h3 17px |
| `emphasis-font-weight` | 600 | 600–700 emphasis (fx expression label, eyebrow; UA bold headings/strong via compact.css) |
| `line-height` | `--coar-ui-line-height` | (none; compact-only rule on chrome containers) |
| `header-height` | `max(40px, row)` → 40 / 44 | pane headers 40, tab list 40, inspector header 40/44, canvas + preview toolbars 38 |
| `row-height` | row → 36 / 44 | outline rows 30, library items 30, library group toggles 36, add-menu items (auto) |
| `rail-button-size` | row − 4 → 32 / 40 | activity rail 32, collapsed inspector button 28 (rail stays the 44px JS column) |
| `icon-button-size` | row − 8 → 28 / 36 | pane/undo/redo icon buttons 24 |
| `inline-button-size` | row − 12 → 24 / 32 | outline row actions 22, zoom ± 22, options ± 22, compound toggle 20, add-child 26, options add 24 |
| `panel-padding` | `--coar-panel-padding` (16) | inspector body 14, Translations / Compositions 20 |
| `content-gap` | `--coar-content-gap` (8) | inspector section gap 12 |
| `control-radius` / `panel-radius` | 6 / 8 | 3/4/5/6px controls; 6/7/8px panels, frames, menus |
| `on-accent`, `input-background`, `overlay-shadow`, `error-text`, `hatch`, `dashed-border`, `preview-backdrop` | semantic roles | `#fff` on accent, `white` select bg, menu shadow, `#991b1b`, black/grey `rgba` hatches and dashes, `#f7f7f9` |
| `canvas-border(-hover)`, `canvas-tab-fg/bg/border` | border/text/background roles | `rgba(80,86,96,…)`, `#666b73`, **`#fff` tab background (broken in dark mode before)** |
| `canvas-selection-color` | `--coar-text-accent-primary` | fixed-lightness accent remains the legacy fallback; compact selected labels and frames use theme-aware readable ink |
| `drop-zone-*`, `blocked-*` (derived from `drop-accent`, `error-accent`) | `color-mix` of host accent / error role | fixed blue `rgba(22,102,204,…)`, `rgba(192,57,43,…)`, grey `rgba` |

## Per-file audit

Legend: D = desktop, M = `.coar-mobile` (tablet; builder phone = **no**, renderer phone = **partial**), L/Dk = light/dark.
Tests: `S` = `src/styles/compact.test.ts` (static contract), `E` = `apps/playground/e2e/page-builder-compact.spec.ts`
(computed geometry, Chromium). Additional current state and renderer-image coverage is listed under Verification.

### Builder shell and panels (`src/`, `src/builder/`)

| File | Status | Dimensions / typography / colour | D / M | Tests |
| --- | --- | --- | --- | --- |
| `CoarPageBuilder.vue` | changed | root font + panel radius; activity button size/radius and indicator offset derived from it; pane header height; pane title label size/weight; tab list min-height + tab font; inspector header height; icon/rail buttons; preview toolbar height; bar-control meta size, select radius + input bg (+ select text colour in compact.css); preview frame radius; empty-state meta; JSON hint/error/warning meta, Apply on-accent colour + size/weight + radius, editor code size. **Unchanged:** JS pane geometry (rail 44, drawer/inspector min/default widths, middle 360, 1px dividers with 10px grab area) — layout of the tool, not density; preview frame/scale/zoom styles — they come from the viewport/zoom composables (authored-preview geometry); `.pb-builder__preview` padding 20/24 — backdrop around the page. | D yes; M header/buttons grow (44/36/40) but layout widths unchanged — tablet-only use, partial | S, E |
| `builder/BuilderCanvas.vue` | changed | toolbar height → header height. **Unchanged:** `.pb-canvas` padding 28/24/24 and frame/content styles — canvas geometry and zoom (`useCanvasZoom.ts`). | D/M | S, E |
| `builder/BuilderCanvasNode.vue` | changed (colours, absolute chrome) | node border/hover/tab colours → roles (tab `#fff` → background role fixes dark mode in compact); type tab font 10 → badge; selected weight → label weight; responsive-hidden + blocked hatches and drop zones → accent/error derived roles; node radius → control radius; generic preview dashed border. **Unchanged (canvas geometry):** node padding 11/8/8 and root 14/10/10, drop-zone sizes 10/24px, tab 16px height and −8px offset, delete/duplicate 16px buttons, in-flow hint/placeholder font sizes (blocked 11, empty 12, generic 12 — a size change would move the authored layout); card/section body imitation (content). | D yes; M: 16px node buttons are below the touch target — **limitation**, kept because enlarging them overlaps authored content | S, E (frame + drop zones unchanged under compact/mobile roles) |
| `builder/BuilderOutline.vue` | unchanged — only scroll container padding 4px, structural | — | D/M | E (via outline) |
| `builder/BuilderOutlineNode.vue` | changed | node font → UI size; row height → row role; row/btn/menu radii; key meta; composition chip badge; row action buttons inline size; drop-into zone colours → drop roles; add-child trigger size/label; add menu radius + shadow; menu group label meta; menu items UI size + row min-height (compact.css). **Unchanged:** indentation `8 + depth*16` (inline JS, tree geometry), grip 12px, issue icon 18px + 30px action reserve (fits 2×24 compact buttons; at mobile 2×32 the actions overlay the issue icon reserve — **pending visual check**). | D yes; M rows 44 | S, E |
| `builder/BuilderPalette.vue` | changed | group toggle row height + label; counts badge; item row min-height, radius, UI size; item type chip badge; required weight; empty meta. **Unchanged:** category icon hues `#52749a/#5f6b72/#806b52/#725f88` (categorical identity) — **dark contrast ≈3:1, pending check**; search padding. | D/M | S |
| `builder/BuilderPropsPanel.vue` | changed | header height; title label; body padding → panel padding; section gap → content gap; section titles meta + weight; inline form label size; quick-from/reset/translation code badges; small buttons meta + radius; binding/expression/issue radii and sizes. **Unchanged:** 84px label column (fits 12–13px labels; long German labels wrap via `overflow-wrap`), section separation 20/16, issue colours (semantic roles already). Shared controls (`CoarFormField`, inputs `size="s"/"xs"`) follow the parent's profile. | D yes; M via shared controls | S |
| `builder/BuilderFxButton.vue` | changed | fx glyph meta size (700 italic kept: it is a glyph), expression overlay radius, code meta, label meta + emphasis. **Unchanged:** 24×20 toggle (inline in label row), focus ring (focus roles). | D/M (small target on tablet — limitation) | S |
| `builder/BuilderLogicPanel.vue` | changed | toolbar/footer meta; `strong` weight (compact.css); line-height (compact.css). Editor: `CoarScriptEditor` (Monaco, global theme) — **pending: script-editor peer's adapter**. | D; M: Monaco not made for touch (documented) | S |
| `builder/BuilderTranslationsPanel.vue` | changed | panel padding; h3 heading size (+ weight in compact.css); header text UI size; table radius; thead label size/weight; tbody th label weight; code size; usage/unused/delete meta; empty strong. **Unchanged:** cell padding 9, 760px table min-width (horizontal scroll), `@media (max-width: 820px)` stacking. | D/M | S |
| `builder/BuilderCompositionsPanel.vue` | changed | panel padding; h3 heading size; h3/h4/item strong weights (compact.css); hints meta; section/error radii; eyebrow badge + 600; target/code meta; version badge + select radius + input bg (`background: white` was dark-mode-broken; fixed only in compact) + text colour (compact.css). | D/M | S |
| `builder/BuilderExpressionDialog.vue` | changed | hint meta; editor frame radius; meta `strong` weight (compact.css). Teleported: **needs `.coar-compact` on the overlay host (parent's overlay context)**. | D; M Monaco | S |
| `builder/BuilderElementCodeDialog.vue` | changed | as above | D; M Monaco | S |
| `builder/BuilderPageRootCodeDialog.vue` | changed | as above | D; M Monaco | S |
| `builder/props/BuilderZoomControl.vue` | changed | ± buttons and field → inline size, radii; input/suffix meta. **Unchanged:** 28px input width (fits "400" at 12px tabular). | D/M | S |
| `builder/props/BuilderViewportControl.vue` | changed | group/button radii, button meta. **Unchanged:** 3/7px padding. | D; M small target — limitation | S |
| `builder/props/CompoundLengthProperty.vue` | changed | label size, toggle inline size + radius, hint/detail/note/reset meta. **Unchanged:** 84/64px label columns and the 92px detail indent (aligned with the inspector's 84px column + 8px gap). | D/M | S |
| `builder/props/OptionsEditor.vue` (public export) | changed | label size/weight, ± buttons inline size + radius, add button size/label/radius; root listed as a role root so consumers' custom inspectors get the roles too. | D/M | S |
| `builder/props/StyleProps.vue` | changed | responsive status radius + meta. **Unchanged:** chip button (inherits). | D/M | S |
| `builder/props/ActionPropsEditor.vue` | changed | headings label size (+600 in compact.css); hints/errors/remove meta; row radius; code badge; precedence radius. | D/M | S |

### Element inspectors and default-value inputs (`src/elements/*`)

All inspectors render shared controls (`CoarFormField`, `CoarTextInput`, `CoarSelect`, `CoarCheckbox`, `CoarSwitch`,
`CoarNumberInput`, `CoarButton`, `CoarNotice`) at `size="s"` (169×) / `"xs"` (62×) / `"m"`/`"l"` (6×); their density
is the parent's shared-control work. Each file was opened; verdicts:

| File | Status |
| --- | --- |
| `button/ButtonInspector.vue`, `card/CardInspector.vue`, `checkbox/CheckboxInspector.vue`, `date-input/DateInputInspector.vue`, `datetime-input/DateTimeInputInspector.vue`, `feedback/FeedbackInspector.vue`, `heading/HeadingInspector.vue`, `link/LinkInspector.vue`, `multi-select/MultiSelectInspector.vue`, `note/NoteInspector.vue`, `otp-input/OtpInputInspector.vue`, `password-input/PasswordInputInspector.vue`, `radio-group/RadioGroupInspector.vue`, `repeat/RepeatInspector.vue`, `section/SectionInspector.vue`, `select/SelectInspector.vue`, `spacer/SpacerInspector.vue`, `switch/SwitchInspector.vue`, `text-input/TextInputInspector.vue` | unchanged — no own styles, only shared controls (follow the shared profile); labels sit in the inspector's inline-label grid (`BuilderPropsPanel`). |
| `number-input/NumberInputInspector.vue` | unchanged — only a 2-column grid with 8px gap (layout). |
| `visual-markup/VisualMarkupInspector.vue` | unchanged — error list indent only; text via `CoarNotice`. |
| `stack/StackInspector.vue` | changed — label size/weight, segmented button size/radius, active weight 600 → label weight (500, colour carries selection). Hand-made segmented control kept (no API change); **shared `CoarSegmentedControl` would be the follow-up**, not done here. |
| `paragraph/ParagraphInspector.vue` | changed — native textarea: field font size (13 → 14 desktop / 16 mobile, avoids iOS focus zoom), radius. |
| `image/ImageInspector.vue` | changed — thumb radius, empty-state badges. **Unchanged:** 80px thumbnail (asset preview geometry). |
| `checkbox/`, `date-input/`, `datetime-input/`, `multi-select/`, `number-input/`, `radio-group/`, `select/`, `switch/` `*DefaultInput.vue` | unchanged — each renders one shared control (`size="s"`), no own styles. |

### Canvas previews (authored content representations)

| File | Status |
| --- | --- |
| `heading/HeadingPreview.vue` (28/22/18/15/13/12px, 600), `paragraph/ParagraphPreview.vue` (14px), `link/LinkPreview.vue` (14px, accent) | content — unchanged: stands for authored text; compact must not resize the page being authored. |
| `button/`, `checkbox/`, `date-input/`, `datetime-input/`, `divider/`, `feedback/`, `multi-select/`, `note/`, `number-input/`, `otp-input/`, `password-input/`, `radio-group/`, `select/`, `switch/`, `text-input/` `*Preview.vue` | content — no own styles; render shared controls disabled/readonly, so they show the **host's** presentation (see Risks). |
| `image/ImagePreview.vue` | changed (placeholder only) — dashed border role (black `rgba` invisible in dark). Image radius/size unchanged (content). |
| `spacer/SpacerPreview.vue` | changed — hatch + dashed border roles (black `rgba` invisible in dark). 20px height unchanged (canvas geometry). |
| `visual-markup/VisualMarkupPreview.vue` | changed — backdrop `#f7f7f9` and error `#991b1b` → roles. Aspect ratio, iframe unchanged (content). |

### Renderer (authored page; outside the profile by design)

| File | Status |
| --- | --- |
| `CoarPageRenderer.vue`, `PageNode.vue` | content — unchanged: page box, overflow, form-error spacing (`--coar-spacing-m`). |
| `button/`, `card/`, `checkbox/`, `date-input/`, `datetime-input/`, `divider/`, `feedback/`, `heading/`, `image/`, `link/`, `multi-select/`, `note/`, `number-input/`, `otp-input/`, `paragraph/`, `password-input/`, `radio-group/`, `repeat/`, `section/`, `select/`, `spacer/`, `stack/`, `switch/`, `text-input/`, `visual-markup/` `*Renderer.vue` | content — unchanged. Their styles are layout of authored content (fit-content leaves, stack flex, section title `--coar-body-base-size`, paragraph/heading colours already semantic). The static test asserts no renderer consumes a `--coar-page-builder-*` role. |

### TypeScript that produces styles

| File | Status |
| --- | --- |
| `styleMapping.ts`, `responsive.ts`, `builder/nodeDefaults.ts` (`gap 16px / padding 24px` defaults), `builder/boxSides.ts` | content — saved layout data and its mapping; never touched by chrome density. |
| `builder/useCanvasZoom.ts`, `builder/pointerDnd.ts` (`data-pb-zone-inflate="8"` hit slop), `builder/useBuilderDnd.ts` | geometry — zoom steps, drop hit-testing; unchanged. |
| `CoarPageBuilder.vue` script (`TOOL_RAIL_WIDTH 44`, `DRAWER_MIN 240`, `INSPECTOR_MIN 260`, `MIDDLE_MIN 360`, preview viewport sizes) | geometry — unchanged; the compact rail buttons (32/40) are sized to fit the 44px rail. |

## Devices

- Builder docs keep `desktop: ready, tablet: partial, phone: no` — still accurate; compact does not make the builder a
  phone tool. Mobile (tablet) compact roles enlarge rows to 44 and buttons to 32–40, still with fixed pane widths.
- Renderer docs keep `phone: partial` — unchanged (renderer is outside the profile).

## Verification done

- Current acceptance follow-up: 34 files / 396 package unit tests, lint and typecheck pass.
  `compact-page-builder-states.spec.ts`, `page-builder-compact.spec.ts` and `page-builder-logic.spec.ts`
  pass all 17 Chromium cases. These cover inspectors, outline actions, library categories, canvas/drag,
  translations, compositions, JSON, preview, Logic and code dialogs in both profiles and light/dark;
  mobile classes here are not a native-device check.
- The selected type-tab check previously sampled the neutral ink during its 120ms colour transition.
  Waiting for the final selection ink reproduces the dark failure at 1.996:1. Compact now derives selection
  ink from the shared accent-text role; the default keeps its exact muted accent expression.
  The strengthened check requires 4.5:1 for small tab text and verifies live red/blue brand changes,
  shared-role binding, frame colour and unchanged canvas geometry. It passes three consecutive runs.
- High review found that the more specific hover rule still replaced a selected frame while the pointer
  was on the canvas node. The corrected private hover value now uses compact selection ink in that state
  and keeps the historical neutral hover outside compact. Each child rebinds its own hover value.
  The regression selects a different node first, then clicks the actual canvas frame and verifies
  selection plus `:hover`, text/frame contrast, neutral unselected hover and unchanged legacy hover.
  It passes three repeats; lint/typecheck/build and the full suite (779 passed, seven existing skips)
  pass again. The post-review image comparison is still 448/448 with 60/60 repeats, without new updates.
- The separately authorized renderer harness now has real `builder-editors` / `compact-builder-editors`
  scenes with Monaco JSON, Markdown, Mermaid and actual workers. After the final colour fix, the full Docker
  comparison passes 448/448 and the renderer/zone-list repeat passes 60/60. Exactly four new compact-builder
  references change (2331 pixels desktop / 2348 mobile, selected frame and tab ink only); all 436 other
  images and every tracked legacy reference remain byte-identical. Muted selection fills are unchanged.

### Initial worktree verification (historical)

- `vitest run` in `packages/page-builder`: 34 files / 395 tests passed (baseline 33 / 389; +6 in `compact.test.ts`).
- `eslint src/` clean; `vue-tsc --noEmit` clean; `vite build` OK, compact rules present in `dist/index.css`.
- Fallback substitution vs `HEAD` (script): identical except two equivalent `calc()` and comments.
- Line endings preserved (CRLF files stay CRLF).
- e2e (chromium, playground dev server of this worktree, sources aliased to the worktree):
  `page-builder-compact.spec.ts` 2/2 passed, existing `page-builder-logic.spec.ts` 2/2 passed. Fonts were blocked by Vite's
  fs allow-list (served from the borrowed `node_modules`), so fallback fonts were used; the assertions are px sizes, not glyphs.
  The playground resolves `#page-runtime-worker` to `packages/page-builder/dist`, so a local `vite build` of the package
  is needed before these e2e run in a fresh worktree.
- Dependencies were borrowed by symlinking the main checkout's `node_modules` (root, playground, every package; same commit
  `a7227d3`, `packages/ui` identical); symlinks, `dist` and `test-results` removed afterwards. Nothing installed.

## Pending / not verified

- The renderer images do not prove every inventoried inspector, validation state or authored renderer.
  Current inventory checks and missing state evidence must still be completed explicitly.
- Monaco themes remain document-global; the adapter and the state tests do not promise independent themes
  for two local builders in the same document.
- Native/tablet acceptance (iPad, touch) is still missing. The Chromium mobile-class checks verify outline
  label/action hit testing, not native gestures or acceptable targets for the fixed 16px canvas controls.
