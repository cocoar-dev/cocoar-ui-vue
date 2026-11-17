# Compact audit — data-grid, document-viewer, map

Scope: `packages/data-grid/**`, `packages/document-viewer/**`, `packages/map/**`, their docs pages.
This is a record for the parent, **not** a claim of complete verification: no visual baseline, no
browser run and no native device run has been made for any surface below (see "Pending").

## Patterns used (all three packages)

| Kind of value | How it is bound | Default (no `.coar-compact`) |
| --- | --- | --- |
| Opt-in shared roles (`--coar-ui-font-size`, `--coar-caption-font-size`, `--coar-field-font-size`, `--coar-label-font-weight`, `--coar-interactive-row-height`, `--coar-control-radius`, `--coar-panel-radius`, `--coar-content-gap`, `--coar-ui-line-height`, `--coar-ui-font-weight`) | Read in place as `var(<role>, <exact original value>)` | Role undefined → original value |
| Always-defined tokens (colors, elevation, focus) and AG Grid params | Compact-scoped rules in a new package-local CSS file; selector covers class on an ancestor **and** on the component root | Rule does not match |
| Package roles with literal compact defaults (sizes) | `:where(.coar-compact)` + mobile variants `:where(.coar-compact.coar-mobile, .coar-compact .coar-mobile, .coar-mobile .coar-compact)`; literals only, so inheritance never freezes a token resolved in another scope | Undefined → original fallback |
| Derived color roles | Declared on the component root (viewer root, map root, grid wrapper), so light/dark/nested scopes resolve in the component's own context | Not declared |

Unit tests guard: every opt-in/package-role read in the default sources has a fallback; every compact rule
is scoped to `.coar-compact`; (grid) every `--ag-*` the adapter sets is read by AG Grid 35; `cocoarTheme`
params unchanged; (viewer) consumer `--coar-color-*` overrides stay first in every chain; (map) Leaflet
`iconSize`/`iconAnchor` unchanged and touch targets grow only via a centred pseudo-element.

**Nested reset**: compact-scoped selectors match any `.coar-compact` ancestor. If the parent introduces a
"compact off" class for a subtree, the selectors in the three new CSS files (and the two SFC rules named
below) need a `:not()` / reset; opt-in role reads need no change if the reset sets the roles to `initial`.

## data-grid

AG Grid fact (verified in `ag-grid-community@35.0.0` `_getPerInstanceCss`): every theming-API param is
emitted as `--ag-x: var(--ag-inherited-x, <param>)` on the grid root and the root's parent maps the
inherited `--ag-x` into `--ag-inherited-x`. So **CSS on `.ag-theme-cocoar` (or any ancestor) wins over the
TS params**. Of the 41 `--ag-*` names in `ag-theme-cocoar.css`, 20 are pre-v33 names AG Grid 35 no longer
reads (`--ag-header-foreground-color` is still read by our own `CoarGridHeader`). Effective default look is
therefore a mix: sizes/most colors from the CSS file, spacing/borders/header text color/accent from the TS
theme or Quartz defaults (`headerTextColor` resolves to `#1a1a1a` because `--coar-color-text-primary` does
not exist; accent is Quartz `#2196f3`). **Unification decision**: the default stays byte-identical
(`cocoarTheme` untouched, legacy CSS untouched); the compact profile is one CSS block that sets only *live*
AG Grid variables from the semantic roles, so in compact there is a single source. A TS-side profile
theme is not possible: the profile is a DOM scope and one theme instance serves both looks.

| File | Decision | Dimensions / typography / colors | Mobile | Tests / scenes |
| --- | --- | --- | --- | --- |
| `src/theme/ag-theme-cocoar-compact.css` (new) | Compact adapter | font 13/14 (`--coar-ui-font-size`), header weight 500, row/header/list-item = interactive row 36/44, cell padding 12, control radius 6 / panel radius 8 (roles), accent/header text/subtle text/icon/chrome/checkbox/input/focus/menu/popup colors on tokens, drop markers on accent/error tokens (legacy reads non-existent `--coar-surface-accent-subtle`, `--coar-border-accent`), tree/wrapper hover chip on neutral tertiary, quick-filter highlight on accent | rows/header 44 via shared role; tree toggle 44 | `ag-theme-cocoar-compact.test.ts`; `compact-data-grid`, `compact-data-grid-tree` |
| `src/theme/ag-theme-cocoar.css` | Unchanged | Default look; dead names kept (removing them changes nothing visible but is a public-looking contract) | — | default stories none exist for the grid |
| `src/theme/cocoar-theme.ts` | Unchanged | see fact above; test pins row 40 / header 40 / font 14 / weight 600 | — | test |
| `src/CoarDataGrid.vue` | Imports compact CSS after the default theme (equal specificity → compact wins) | toolbar gap/margin 8 = content gap; border-top `--coar-border-neutral` already a token; unchanged | toolbar search uses `CoarTextInput` (parent field roles) | stories |
| `src/CoarDataGridPanel.vue` | Unchanged (deprecated wrapper, no styles) | — | — | — |
| `src/CoarDataGridSearch.vue` | bordered/elevated radius → `var(--coar-panel-radius, var(--coar-radius-s))` | rest token-based | input is `CoarTextInput` | — |
| `src/header/CoarGridHeader.vue` | Unchanged | label inherits size/weight from the adapter; color `--ag-header-foreground-color` → text secondary in both looks; sort glyph 0.65em relative, opacity .6 | header 44 on compact mobile | stories (sortable column) |
| `cell-renderers/TreeCellRenderer.vue` | indent `calc(depth * var(--coar-data-grid-tree-indent, 20px))` (inline), toggle/spacer `var(--coar-data-grid-tree-toggle-size, 20px)`, radius `var(--coar-control-radius, 4px)`, count `var(--coar-caption-font-size, 0.85em)` | hover chip color in adapter | toggle 44px target, indent stays 20 | `compact-data-grid-tree` |
| `cell-renderers/WrapperCellRenderer.vue` | clickable item radius → control radius role | hover chip in adapter; gaps `--coar-spacing-xs` | item hit area only 2px padding: **limited on touch** (consumer content) | no scene (pending) |
| `cell-renderers/TagCellRenderer.vue`, `CoarMultiSelectCellRenderer.vue` | Unchanged | `CoarTag` (ui, parent); gaps 4 | — | `compact-data-grid` (tag) |
| `CoarCheckboxCellRenderer.vue` / `Editor.vue` | Unchanged | `CoarCheckbox` size s; overrides only centre the box | `.coar-mobile` target floors stripped by existing `min-height: 0 !important` (default behaviour kept) | `compact-data-grid` (renderer) |
| `CoarText/Number/Select/MultiSelect/TagSelect/PlainDate/PlainDateTime/ZonedDateTime CellEditor.vue` | Unchanged | ui fields size `s` (32 desktop, parent's compact mobile 44) fit rows 36/44; chrome stripped so the cell is the frame; dropdown/picker panels are ui overlays (parent overlay context) | fits 44 row on compact mobile; **default mobile**: s=48 > row 40 (pre-existing, unchanged) | no editing scene (needs interaction; pending) |
| `CoarPlainDate/PlainDateTime/ZonedDateTime/Select CellRenderer.vue`, `Date/Number/Currency/IconCellRenderer.vue` | Unchanged | text/flex centering only; inherit grid font | — | `compact-data-grid` (date, currency, number, icon) |
| `use-popup-editor-focus-guard.ts`, builders, configurators, models, `useDataGrid.ts`, `index.ts` | No visual surface (logic only); builder adds the `coar-drop-target*` classes styled above | — | — | — |
| AG Grid internal surfaces (column menu, filter popups, floating filters, overlays loading/no-rows, tooltips, pagination) | Reached through the live variables set by the adapter (popups render inside the grid root) | chrome bg, menu border/shadow, input border/focus, list-item height | list items 44 on compact mobile | **no scene** — need interaction (pending) |

## document-viewer

The viewer reads a private vocabulary `--coar-color-*` that no token file defines, so the default chrome
is always the light fallback (also in dark mode). Every read became
`var(--coar-color-X, var(--coar-document-viewer-<role>, <original>))` (110 sites, mechanical, each checked by
test): consumer overrides first, compact role second, original last. Roles are defined only in
`src/compact.css` under the profile.

| File | Decision | Dimensions / typography / colors | Mobile | Tests / scenes |
| --- | --- | --- | --- | --- |
| `src/compact.css` (new) | Role definitions | header 40, buttons 28, inputs 28; colors from neutral/accent/error tokens, veil and selection via `color-mix`, popover shadow `--coar-elevation-high` | header 48, buttons 44, inputs 36, swatches 32 (deliberately <44 so a palette fits; ≥24 + 6px gap) | `compact.test.ts`; all three viewer stories |
| `CoarDocumentViewer.vue` | header heights → role (44 default); overlay text ui size; loading veil, backdrop, selection, pin fg → roles; error card panel radius, retry control radius + min target; passes `contextEl` to popovers | page canvas `#fff`, page shadow, search highlight yellow/orange, textLayer = **document content, unchanged** | retry 44 | stories |
| `internal/DocumentToolbar.vue` | inline page/zoom readouts ui size; inputs field size + input-height role + control radius; flyout width buttons target role; swatches swatch role | `CoarSidebar` items are ui (parent) | inputs 36/16px (no iOS zoom); flyout opens on hover only (**limited on touch**, pre-existing) | stories (toolbar); flyout pending |
| `internal/DocumentSearchBar.vue` | ui size, input height/field size/radius, buttons target role | colors via chain | buttons 44 | **no scene** (opens by toolbar click; pending) |
| `internal/DocumentSidebar.vue` | ui size, tab min target + label weight 500 + radius, close target, thumb radius, outline link radius; compact rule: outline links flex rows at interactive-row height (scoped SFC rule) | thumbnail canvas white = document | tabs/close 44, outline rows 44 | `compact-document-viewer` (thumbs), `-pdf` (thumbs); outline needs a PDF with outline (**fixture has none**, pending) |
| `internal/PdfOutlineList.vue` | Unchanged (styled by sidebar; inline depth indent 8+12/level kept) | — | — | pending (fixture) |
| `internal/DocumentAnnotationPanel.vue` | ui size; count/group header/meta caption (meta 10→12, group 11→12 in compact); group header weight 500; close/filter/menu target role; search input field size + min height; radii | selection tint/accent bar via roles | targets 44 | `compact-document-viewer`, `-open` (item menu = `CoarPopover`, ui) |
| `internal/DocumentInfoSection.vue` | title caption + label weight; rows ui size | divider/hover via roles | header row is a 12px-padded button (~40px): acceptable | `compact-document-viewer-pdf` |
| `internal/AnnotationPopover.vue` | ui size, panel radius, popover shadow role, swatch role, textarea field size + control radius, buttons min target + radius, primary text on-accent role; **teleport context**: `:class` from `presentationContextClasses(contextEl)` | — | buttons 44, swatches 32 | `compact-document-viewer-open`; `compact.test.ts` (context) |
| `internal/presentation-context.ts` (new) | Mirrors `coar-compact`, local `coar-mobile`, local `light-mode`/`dark-mode` from the viewer onto the popover, only when a compact context exists (default: nothing) | — | — | 5 unit tests |
| `internal/AnnotationLayer.vue` | Pin unchanged (22px, anchor = centre, `#fff` ring = document annotation); compact+mobile: 44px `::before` hit area, anchor unchanged (scoped SFC rule) | ink/marker/freetext = document content; freetext font `--coar-font-family` (non-existent → sans-serif) kept | pin target 44 | stories (pins) |
| `usePageRenderer.ts`, `useAnnotationEditor.ts`, `usePdfSearch.ts`, `usePositionMemory.ts`, `useDocumentLoader.ts`, `page-provider.ts`, `effective-tools.ts`, `sources/*`, `types.ts`, `source-types.ts`, `index.ts` | No styling except canvas/thumbnail rasterization (document pixels) | — | — | existing tests |

## map

| File | Decision | Dimensions / typography / colors | Mobile | Tests / scenes |
| --- | --- | --- | --- | --- |
| `src/internal/map-compact.css` (new) | Roles on map root (text, muted, error, selection color/ring, popup shadow); Leaflet DOM via real selectors anchored at `.coar-map__canvas` (= the Leaflet container): container font/size/line-height; `.leaflet-bar` radius/shadow/colors/hover/disabled, zoom glyph body font + weight 400; attribution caption on translucent surface, link accent; `.leaflet-popup-content-wrapper/-tip` surface, text, panel radius, shadow, content ui size, close button colors; `.leaflet-tooltip` surface/border/text/radius/shadow + all four arrow colors; `.coar-map-popup__note` | specificity kept above Leaflet's lazily loaded CSS | zoom buttons 44; pins and editor vertices 44px `::before` target (marker box + `iconAnchor` unchanged); point-list handle 44 | `compact.test.ts`; `compact-map`, `compact-map-editor` |
| `src/internal/map-base.css` | gap content-gap; canvas radius `var(--coar-map-radius, var(--coar-panel-radius, 10px))` (public var first); selection ring role; caption caption size + `var(--coar-map-caption-color, var(--coar-map-text-muted, #666))`; no-config message ui size + error role | canvas surface `#e8eef3` kept (note: Leaflet's later `.leaflet-container{background:#ddd}` overrides it today), pin 26px/emoji 14px/white ring = map data | see compact file | stories |
| `src/CoarMap.vue` | fallback list ui size, text roles; legend ui size | route `#3b82f6`, shape dot `#475569`, legend swatches = data colors, unchanged | — | `compact-map` (legend, caption, selected pin); no-JS fallback **pending** (visible only before hydration) |
| `src/CoarMapEditor.vue` | vertex selection color/ring roles; edit popup panel radius + shadow role | vertex `#fff`/`#475569` = geometry; popup tail inherits surface tokens | close button is `CoarButton xs` (ui) | `compact-map-editor` (popup open via `selected`) |
| `src/CoarMapPointList.vue` | row/main radius control role; main row min-height interactive row; label weight 500; coords caption; empty ui size; handle min target role | selection colors already tokens | rows 44, handle 44; **drag reorder uses HTML5 DnD → not available on touch** (pre-existing; ↑/↓ in the point form remain) | `compact-map` |
| `src/internal/MapPointForm.vue` | field labels caption + label weight | fields/buttons are ui (`s`) | ui field roles | `compact-map-editor` |
| `use-map-editor.ts`, `map-model.ts`, `map-edit.ts`, `context.ts`, `types.ts`, `index.ts` | Unchanged; `divIcon` sizes/anchors kept (test) | — | — | existing tests |

## Docs

`apps/docs/components/data-grid.md`, `document-viewer/coar-document-viewer.md`, `map/index.md`: a short
"Compact presentation" section with the Preview badge. Device frontmatter unchanged (it describes the
default library; compact is opt-in). **Parent runs `pnpm skill:sync`.**

## Pending / fixture needs for the parent

1. **Visual harness (maintainer OK needed, not done by me):** `vite.visual.config.ts` has no aliases for
   `@cocoar/vue-data-grid`, `@cocoar/vue-document-viewer`, `@cocoar/vue-document-viewer/pdf`, `@cocoar/vue-map`
   (in a fresh container they resolve to unbuilt `dist/`), and `optimizeDeps.entries: ['visual.html']` will
   discover `ag-grid-community`, `ag-grid-vue3`, `leaflet`, `pdfjs-dist` only at runtime (re-optimisation
   reload → flaky). Needs aliases to `packages/<pkg>/src/...` and `optimizeDeps.include` for those four.
2. Append `tmp/compact-grid-viewer-map-stories.json` to `stories.json`; generate baselines and run
   `--repeat` for stability. `compact-document-viewer-open` relies on the annotation popover getting
   `.coar-compact` (its `ready` selector) — this proves the teleport adapter.
3. PDF fixture uses non-embedded Helvetica; pdf.js warns about `standardFontDataUrl` and falls back to a
   system font — deterministic inside the Playwright image, but confirm with `--repeat`. No outline in the
   fixture (outline list unverified visually).
4. Overlay context: the annotation popover uses a local mirror (`presentation-context.ts`); replace with
   the parent's shared overlay-context helper when it exists. Grid editor dropdowns, the annotation item
   menu and map form selects go through `useOverlay` (parent's `CoarOverlayOutlet`).
5. No scene yet: AG Grid column menu/filter popups/loading & no-rows overlays, cell editors open, wrapper
   column, viewer search bar, toolbar flyouts, Leaflet popup/tooltip open, map no-JS fallback.
6. Not checked in a browser at all: computed geometry, contrast of compact colors (depends on the parent's
   Slate tokens), dark mode, real devices (iOS/Android keyboard on viewer inputs, touch on pins).

## Pre-existing defects seen (default look, left unchanged)

- `cocoar-theme.ts` reads non-existent `--coar-color-*` tokens: AG-native header text is `#1a1a1a` in dark
  mode; 20 variables of `ag-theme-cocoar.css` are pre-v33 names AG Grid 35 ignores.
- Document viewer: `--coar-color-*` chrome is light-only in dark mode; README says `--coar-pdf-*` can be
  set "on any ancestor", but the viewer root redefines them, and `--coar-pdf-highlight-color` is read nowhere.
