# Compact presentation — audit of the markdown / diagram / script-editor scope

Scope: `packages/markdown`, `markdown-editor`, `markdown-form`, `markdown-core`, `markdown-mermaid`, `mermaid`,
`script-editor`, and their docs pages. Worktree `mighty-phoenix-4dns`, uncommitted. Written 2026-11-15.

This records what was inspected and decided, file by file. It is **not** a claim of complete verification:
nothing here was compared in the Docker visual harness, and nothing was checked on a real iOS/Android device.

## How the profile is wired (applies to every package below)

- **Legacy stays exact.** Every changed legacy declaration now reads `var(--coar-<pkg>-<role>, <exact legacy value>)`.
  The roles are defined only under `.coar-compact`. `tmp/compact-markdown-fallback-check.py` unwraps every new
  role to its fallback and compares the result with `HEAD`: all 11 changed style sources match (comments and
  `@import` lines aside). A declaration the legacy CSS never made (for example the viewer's `font-size`) is added
  only in a `.coar-compact …` rule, never as a `var(role, inherit)`, because that would beat lower-specificity
  consumer rules.
- **Per-package roles, one new CSS file per package**, imported by the existing style entry:
  `markdown/styles/markdown-compact.css` (via `markdown-blocks.css`), `markdown-form/styles/markdown-form-compact.css`
  (via `markdown-form.css`), `markdown-editor/src/styles/markdown-editor-compact.css`, `mermaid/src/styles/mermaid-compact.css`,
  `script-editor/src/styles/script-editor-compact.css` (each via its SFC `<style>`, so it lands in `dist/index.css`;
  checked by building).
- **Scope resolution.** Literal and size/shape roles are set on `.coar-compact`, and declared again for
  `.coar-compact.coar-mobile`, `.coar-compact .coar-mobile`, `.coar-mobile .coar-compact` (html/body, local and nested).
  Roles that read a **color** or a shared UI role (`--coar-ui-font-size`, `--coar-field-font-size`) are set on the
  component element (`.coar-compact .coar-markdown`, `.coar-compact .coar-markdown-form`, `.coar-compact .coar-mermaid`),
  so a light/dark or mobile scope between `.coar-compact` and the component still applies.
- **Shared roles consumed, with fallbacks** (the parent defines them): `--coar-ui-font-size`, `--coar-field-font-size`,
  `--coar-caption-font-size`, `--coar-label-font-weight`, `--coar-interactive-row-height`, `--coar-control-radius`,
  `--coar-panel-radius`; semantic `--coar-background-*`, `--coar-text-*`, `--coar-border-*`, `--coar-border-input`,
  `--coar-focus-color`, `--coar-border-focus`; `--coar-component-xs-height` / `--coar-control-xs-height`.
  Not used: `--coar-ui-line-height`, `--coar-ui-font-weight`, `--coar-panel-padding`, `--coar-content-gap`
  (document spacing got its own `--coar-markdown-*` roles: a 14 px reading text needs 12/24 px, not 8 px).
- **Teleported chrome.** The floating toolbar and the table handles use a plain `<Teleport to="body">`, so they
  leave the profile. `compactProfileClasses(origin)` (`markdown-editor/src/compact-profile.ts`) adds `coar-compact`
  (plus `coar-mobile` when the origin also sits in a mobile area) **only when the origin is inside `.coar-compact`**;
  outside it returns nothing, so legacy markup is identical. Overlays (color picker, table picker, image dialog,
  table context menu) rely on the parent's overlay-outlet work to carry `.coar-compact`; the color picker is anchored
  on a floating-toolbar button, which now carries the classes, so an outlet that looks at `anchor.closest('.coar-compact')`
  finds them.

## packages/markdown (viewer + shared stylesheet)

| File | Decision | Details |
| --- | --- | --- |
| `styles/markdown-blocks.css` | **changed** (role hooks only) | Hooks with exact fallbacks: `--coar-markdown-space-1/2`, `heading-block-start`, `radius` derived from new `tight/block/section-spacing`, `box-radius`; `h1`–`h6` size/weight/line-height; inline code padding/radius/background/color; table font size, line height, cell padding, header size/weight/color/transform/letter-spacing; frontmatter color; unknown-embed gap/padding/font size. `@import './markdown-compact.css'` at the top. |
| `styles/markdown-compact.css` | **new** | Document roles, not UI roles. Reading text 14 px / 1.5 (mobile 15 px). Headings 24/18/16/14/13/12 px, all 600 (legacy: 32/24/20/16/14/12, 700 for h1/h2). Spacing 8/12/24 px (legacy 8/16/32). Inline code: code font stack (as `CoarCodeBlock`), 0.875em, neutral-tertiary chip, primary text (legacy: bare accent text). Tables 13 px / 1.45 (mobile 14), cells 8×12 (mobile 10×12), header 12 px 600 sentence case, secondary text color (legacy uppercase + tracking). Frontmatter `--coar-text-neutral-tertiary` (legacy gray-400 #c0c0c0 fails 4.5:1 on white). Links get 1 px underline at 2 px offset. Unknown embed: UI text, 8×12 padding, panel radius. |
| `src/CoarMarkdown.vue` | unchanged | Only a `div.coar-markdown` wrapper plus the stylesheet import; the profile acts through the stylesheet. |
| `src/default-renderers.ts` | unchanged | Emits the `coar-markdown-*` classes styled above. `DefaultColorSpan` writes the author's sanitized `color` inline — consumer/document color, deliberately untouched. Code blocks are `CoarCodeBlock` (ui, parent scope). Table header/cell markup unchanged. |
| `src/embeds.ts` | unchanged | Unknown-embed placeholder markup (🧩 + label); its look comes from the stylesheet roles above. The registered embed components are the consumer's. |
| `src/RenderNode.ts`, `fences.ts`, `registry.ts`, `helpers.ts`, `index.ts` | unchanged, nonvisual | Dispatch, registries, helpers. No markup of their own besides what the renderers produce. |
| Mobile | supported, limited | Reading/table sizes step up under `coar-mobile`. Limited (pre-existing): a wide table has no own horizontal scroll container (`width: 100%`), and `CoarCodeBlock` lines overflow horizontally (seen in both profiles). Not changed: product work, not presentation. |
| Tests | `src/compact-styles.test.ts` | Profile file imported; every selector contains `.coar-compact`; every role read by the block stylesheet is defined by the profile and vice versa. |

## packages/markdown-core

Pure parsing/serialization (`parse`, `serialize`, `frontmatter`, `embed-directive`, `color-span`, `id`, `transform`,
`types`). No DOM, no styles. `color-span.ts` sanitizes author colors (`sanitizeColor`) — saved content and
consumer colors, deliberately not a UI token. **No change.** Existing 208 tests pass.

## packages/markdown-mermaid

`src/registry.ts`: a fence renderer that only forwards to `CoarMermaidDiagram` (`zoomable` option). No markup or
styles of its own. The diagram detects its profile from its own DOM position, so this adapter needs nothing.
**No change.** Its 4 tests pass (needed `@cocoar/vue-mermaid` built locally, see Verification).

## packages/mermaid

| File | Decision | Details |
| --- | --- | --- |
| `src/CoarMermaidDiagram.vue` | **changed** | Hooks: viewport/controls/error radius `--coar-mermaid-radius`, control size `--coar-mermaid-control-size`, padding `--coar-mermaid-padding`, UI text `--coar-mermaid-ui-font-size`, error source `--coar-mermaid-code-radius`/`-code-font-size`. Passes `'compact'`/`'default'` to `renderMermaid` from `container.closest('.coar-compact')`. Zoom glyphs (− + ⤢) unchanged. |
| `src/styles/mermaid-compact.css` | **new** | Panel radius 8 px, zoom buttons 28 px (mobile 44 px: on touch the buttons are the only zoom, there is no pinch), state padding 12 px, UI text via `--coar-ui-font-size` (resolved on `.coar-mermaid`), error source 13 px code text. |
| `src/internal/mermaid-loader.ts` | **changed** | Mermaid config is page-global (`mermaid.initialize`). `renderMermaid(config, code, profile = 'default')` re-initializes with the rendering diagram's config only when the profile differs from the last one. A one-profile page initializes exactly once, as before (test). Renders stay serialized, so the re-init cannot race. Mixed pages: the default diagrams after a compact one use their own tokens instead of the first default diagram's (only on pages that use the profile). Uses Mermaid's public `initialize`; no new option guessed. |
| `src/internal/theme-bridge.ts` | **changed** | Color resolution accepts the diagram container and resolves `light-dark()` / `currentColor` there before Canvas normalization, so a local light/dark boundary does not accidentally use the document scheme. Existing container font-family reading is retained. Diagram text size and coordinates remain Mermaid geometry; no `fontSize` mapping was added. |
| `src/internal/pan-zoom.ts` | unchanged, nonvisual | Transform math and pointer handling. No touch pinch (pre-existing; documented). |
| Tests | `src/internal/mermaid-loader.test.ts`, `src/CoarMermaidDiagram.test.ts`, `src/styles/mermaid-compact.test.ts` | Init once per one-profile page; re-init on profile change with strict security kept; component passes the right profile; stylesheet scoped. |

## packages/markdown-editor

| File | Decision | Details |
| --- | --- | --- |
| `src/CoarMarkdownEditor.vue` | **changed** | Hooks: writing-area and placeholder padding, source textarea size/line height, corner button size/radius, fixed-toolbar strip size, floating toolbar padding/radius, float button size/radius, separator height, heading-menu item padding/radius/font size, raw `pre` radius, selected-embed outline color. `@import './styles/markdown-editor-compact.css'`. Floating toolbar gets `compactProfileClasses(rootEl)`. Legacy finding: `--coar-border-accent` (selected embed) is not a defined token, so the outline is always #2563eb; fixed only inside the profile. |
| `src/styles/markdown-editor-compact.css` | **new** | Writing text = field text (`--coar-field-font-size`, 14 desktop / 16 mobile against iOS focus zoom; measured 14/16 px in Chromium). Area padding 8×12. Source view 13 px code text (mobile: field size 16). Toolbar strip `--coar-interactive-row-height` (measured 36+1 / 44+1 px). Floating buttons 28 px (mobile 44 px, toolbar wraps within `100vw - 16px`). Heading menu rows one interactive row, UI text. Captions via `--coar-caption-font-size`; table-picker label 500 instead of 600, hint 12 px instead of 11 px; mobile cells 28 px. Color picker 264 px with 44 px custom input on mobile. Image dialog `min-width: min(22rem, 100%)`. Placeholder takes the writing size so it stays on the caret line. |
| `src/compact-profile.ts` | **new** | Profile mirroring for body-teleported chrome (see above). |
| `src/CoarMarkdownToolbar.vue` | **changed** | External toolbar strip height/width → `--coar-markdown-editor-toolbar-size`. Disabled look (opacity/saturate) unchanged. |
| `src/CoarMarkdownEditorGroup.vue`, `editor-group.ts` | unchanged, nonvisual | Provide/inject only, slot without markup. |
| `src/code-block-view/CodeBlockShell.vue` | **changed** | Edit button caption size, label weight, radius. Not changed: host radius and the 36 px language row, which mirror `CoarCodeBlock` (ui, parent scope) so render and edit mode do not jump; must change together with it. Code text keeps `--coar-component-s-font-size`/1.5. Language `CoarSelect` is ui. |
| `src/code-block-view/CodeBlockNodeView.ts`, `index.ts` | unchanged | Mount host class only. |
| `src/embed/index.ts` | unchanged | Host + selected class; the outline color is the CSS hook above. |
| `src/frontmatter/index.ts` | unchanged | Emits the same frontmatter classes as the viewer (styled by `markdown-compact.css`). |
| `src/image/ImageInsertDialog.vue` | **changed** | Gap and min-width hooks. Fields/buttons are ui (parent). Opened via `useDialog` → profile depends on the parent's overlay context. |
| `src/image/imageUpload.ts`, `pickImage.ts` | unchanged | Upload spinner is em-sized (`.coar-md-image-uploading`, scales with text); pick is nonvisual. |
| `src/placeholder/PlaceholderOverlay.vue` | unchanged | A muted `CoarMarkdown`; positioning/size in the editor stylesheet. |
| `src/table/TableHandles.vue` | **changed** | `.coar-md-th` gets `compactProfileClasses(area)`. Handle geometry (`HANDLE = 14`, hover zones) is JS layout logic: unchanged. Colors are accent/neutral tokens. The `CoarContextMenu` is ui (parent overlay context). |
| `src/table/TableSizePicker.vue` | **changed** | Gap, cell size/gap, label size/weight, hint size hooks. |
| `src/text-color/ColorPickerPanel.vue` | **changed** | Width, panel radius, swatch radius, caption size, custom-input height hooks. Swatch colors are document colors. |
| `src/text-color/index.ts`, `textColorMark.ts` | unchanged | `COAR_TEXT_COLOR_PALETTE` is written into saved Markdown (`<span style="color:#…">`): saved content, deliberately not re-tinted. |
| `src/flavor.ts`, `toolbar-helpers.ts`, `index.ts` | unchanged, nonvisual | |
| Mobile | supported, limited | Fixed/external toolbar and source view are touch-sized in the profile. **Limited:** the floating toolbar is positioned by JS with a 108 px half-width clamp (`positionFloating`), so a wrapped 44 px toolbar can still be clipped at the viewport edges for a selection near the edge; the table handles are hover-driven (no touch); recommend `toolbar-mode="fixed"` on phones. Not changed (logic). |
| Tests | `src/compact-profile.test.ts` | Mirroring only inside the profile (also local/nested mobile); stylesheet scoped; every `--coar-markdown-editor-*` role read by any `.vue` is defined. |

## packages/markdown-form

| File | Decision | Details |
| --- | --- | --- |
| `styles/markdown-form.css` | **changed** (hooks) | Legacy uses fixed light colors (#abc0c7, #fbfdfd, #326b8c, #1c3c4b, #9aa5aa, #aebbc0, #fff, #25353d) and `--coar-color-danger-*` names the token set does not define (so always the hex fallback), i.e. no dark mode and no accent. All wrapped with exact fallbacks. |
| `styles/markdown-form-compact.css` | **new** | Roles on `.coar-compact .coar-markdown-form`. Issues box: semantic error subtlest/bold, panel radius, UI text. Block field: `--coar-border-input` dashed, control radius (legacy 3/10 px leaf), primary surface, focus color + 30 % ring. Errors: semantic error colors, 12 px caption (legacy 11.2 px), 1.35. Readonly value 600 primary (legacy 700 #1c3c4b), underline `--coar-border-input`, empty text `--coar-text-neutral-disabled`. Basic controls: height `max(component-xs, control-xs)` like the Cocoar xs inputs (so 44 px on mobile), field font size, input border, control radius. |
| `src/CoarMarkdownForm.vue`, `FieldHost.vue`, `BlockFieldEmbed.vue`, `InlineTextRenderer.ts`, `ParagraphRenderer.ts` | unchanged | Markup and classes only; looks come from the stylesheet. Inline width style from template `width` is author layout. |
| `src/fields/*.vue` (Text, Number, Select, Date, DateTime, Boolean, Markdown, MarkdownReadonly) | unchanged | Cocoar design = ui controls at `size="xs"` (parent). Basic design = native controls styled by the hooks above. Markdown field = editor with external toolbar (editor profile). |
| `src/context.ts`, `registry.ts`, `template-parser.ts`, `field-layout.ts`, `types.ts`, `index.ts` | unchanged, nonvisual | |
| Mobile | supported, limited | Basic controls reach 44 px; error text 12 px. Limited (pre-existing, frontmatter `devices: phone partial`): select/date fields open desktop panels (ui). |
| Tests | `src/compact-styles.test.ts` | Imported; scoped; read roles == defined roles. |

## packages/script-editor

| File | Decision | Details |
| --- | --- | --- |
| `src/theme.ts` | **changed** | `coar-light`/`coar-dark` names and colors unchanged (test pins them). New `coar-compact-light`/`coar-compact-dark` (slate: fg #292f3b, line numbers #64748b ≈ 4.8:1 on white, line highlight #f6f8fb; dark bg #161b24, numbers #8691a3). `isCompactDocument()` = `.coar-compact` on `<html>`/`<body>`; `resolveTheme` maps to the compact variant only then. Fixed hex (Monaco requires it): no token/accent following. |
| `src/composables/useMonacoEditor.ts` | **changed** | `auto`: unchanged. Explicit `light`/`dark`: a watcher that calls `setTheme` only when the resolved name changes (entering/leaving a compact document), so a default page never gets an extra call (test). Code text stays 13 px / 1.5 / Cascadia Code (code role, not UI). |
| `src/CoarScriptEditor.vue` | **changed** | Radius hook (compact: control radius) and placeholder font-family hook (compact: Monaco's stack; legacy lists Fira Code first, which Monaco does not use). |
| `src/styles/script-editor-compact.css` | **new** | The two roles above. |
| `src/index.ts` | **changed** | Exports `COAR_THEME_COMPACT_LIGHT/DARK`, `isCompactDocument`. |
| `src/composables/useConstrainedRegions.ts`, `useExtraLibs.ts`, `useFormFieldContext.ts`, `src/constrained/*` | unchanged | Decoration class names styled in the SFC (marker/locked-line roles unchanged); the rest nonvisual. |
| Constraint | documented | Monaco themes are global: compact Monaco colors only for a compact **document**; a local `.coar-compact` area gets the compact frame but legacy Monaco colors. Mixed old/new editors on one page are not supported. No iframe wrapper, no new engine. |
| Mobile | limited (pre-existing) | Monaco has no supported touch editing; nothing changed for touch. |
| Tests | `src/theme.compact.test.ts`, additions in `CoarScriptEditor.test.ts` | Mapping only for html/body; legacy theme contents; hex-only compact colors; explicit theme switches only on profile change; editor created with compact theme in a compact document. |

## Docs (own pages)

`apps/docs/components/markdown.md`, `markdown-editor.md`, `markdown-form.md`, `mermaid.md`, `script-editor.md`: one
"Compact presentation" section each with the Preview badge (working title `coar-compact`). Device frontmatter
unchanged (no capability changed). `pnpm skill:sync` not run (parent).

## Visual stories (new, not in stories.json — fragment `tmp/compact-markdown-stories.json`)

`compact-markdown-viewer`, `-editor`, `-editor-panels`, `-form`, `-mermaid` (default column | `.coar-compact` column
from the same fixed data) and `compact-markdown-phone` (mobile only, 390 × 844).

- **Blocker for the Docker harness:** `vite.visual.config.ts` aliases only ui, localization, fragment-parser and
  calendar to source. `@cocoar/vue-markdown`, `-markdown-core`, `-markdown-editor`, `-markdown-form`, `-mermaid`
  would resolve to their unbuilt `dist` in a fresh container. Adding aliases changes a guarded harness file
  (maintainer OK). Locally the stories were rendered with a throwaway page (`tmp/compact-markdown-smoke/`, extends
  the visual config with source aliases): all six render without console/page errors in default/mobile ×
  light/dark; the phone story has no horizontal overflow at 390 px.
- `compact-markdown-editor-panels` mounts internal components by relative path (not exported) and a real editor
  (the panels only exist with one; it brings their stylesheet). `ImageInsertDialog` focuses its URL field on mount
  (real behavior): the right column's input shows a focus ring in the capture.
- Mermaid layout in Docker and the zero-tolerance stability are unverified: run `--repeat`.
- No script-editor story: the visual page deliberately does not load Monaco (workers, memory). A compact Monaco
  comparison needs separate documents (html-level profile) — pending decision.

## Verification done

- Fallback equivalence vs `HEAD`: `python3 tmp/compact-markdown-fallback-check.py` → 11/11 ok.
- Unit tests (vitest, worktree code): markdown 23, markdown-core 208, markdown-editor 57, markdown-form 19,
  markdown-mermaid 4, mermaid 12, script-editor 100 — all pass.
- `eslint src/` clean in all seven packages; `vue-tsc --noEmit` 0 errors in all seven (after building ui locally
  for its types); `vite build` of all seven succeeds and each `dist/index.css` contains the compact rules with no
  leftover `@import`.
- Chromium computed values (smoke page): default editor column unchanged (16 px, 8/16 px padding, h2 24/700);
  compact 14 px desktop / 16 px mobile, 8/12 px padding, h2 18/600, toolbar 37 / 45 px with border.

## Pending / honest gaps

- Not run in the Docker visual harness; no baselines; no `--repeat`.
- Parent tokens were absent in this worktree: everything was seen with the fallbacks
  (`--coar-ui-font-size` 13, `--coar-field-font-size` 14/16, `--coar-interactive-row-height` 36/44, radii 6/8).
  Re-check once the shared `.coar-compact` tokens (font, slate palette) exist; especially contrast of frontmatter,
  table header and inline-code chip in dark mode.
- Overlay context (color picker, table picker, image dialog, table context menu) depends on the parent's outlet
  carrying `.coar-compact`; not verified here. Local light/dark scopes are not mirrored onto the teleported
  floating toolbar / table handles (pre-existing for mobile too).
- Native: iOS focus zoom (16 px writing/source text), floating toolbar clipping at the edges, no touch table
  handles, Monaco touch — all unverified on devices.
