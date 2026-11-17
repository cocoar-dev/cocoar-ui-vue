# Markdown sub-states — gallery scenes and browser checks

Written 2026-11-16 on `feat/compact-presentation`. It covers the gaps G5, G8 and G9 of
`tmp/compact-design-037399/ts-render-audit.json`, plus the floating toolbar and the table handles. Run: Chromium
(Playwright, desktop, 1600 × 1000; the Mermaid frame pages at 900 × 1000) against the playground on
port 5188, `e2e/compact-markdown-states.spec.ts`. Measured values come from the `[measure]` lines of that spec.
`.coar-mobile`, WebKit, the Docker visual harness and real devices were **not** run. Nothing here claims more
than the states listed.

## Scenes (new, profile-neutral; the gallery decides legacy/compact, light/dark)

| Gallery id | File | Isolation | What it holds |
| --- | --- | --- | --- |
| `markdown-mermaid-integration` | `scenes/compact-markdown-mermaid-integration.vue` | frame (Mermaid config is page-global) | `CoarMarkdown` + `createMermaidFenceRenderers({ zoomable: true })`: prose, a valid and a broken ```mermaid fence, an unregistered ```ts fence, two author color spans; a second `CoarMarkdown` + `mermaidFenceRenderers` (zero-config) |
| `markdown-advanced` | `scenes/compact-markdown-advanced.vue` | inline | one `CoarMarkdownEditor` (`flavor="cocoar"`, floating toolbar): frontmatter, color span, ```typescript code block, registered `:::metric` embed, GFM table; `uploadImage` = local callback that waits until the "Upload abschließen" button resolves it with an inline SVG data URL |
| `markdown-form-layouts` | `scenes/compact-markdown-form-layouts.vue` | inline | `CoarMarkdownForm` with two `layout=row` and two `layout=stacked` paragraphs (one filled, one required-empty each), v-model |

No new product feature and no mock renderer: the fence goes through the real registry
(`CoarMarkdown → DefaultCodeBlock → div.coar-markdown-fence → CoarMermaidFence → CoarMermaidDiagram`), the spinner
through the editor's real `imageUpload` plugin (a real `paste` event with an image `File`), the menus through
the real components. The `metric` embed viewer is consumer content (the registry is the consumer's). No request
leaves localhost (checked by every test).

## Results per source and sub-state

### `markdown-mermaid/src/registry.ts` via `CoarMarkdown` (G5) — light and dark, separate documents

| Check | legacy light | compact light | legacy dark | compact dark |
| --- | --- | --- | --- | --- |
| Fences → diagrams | 2 fences: rendered + error; ts fence stays `CoarCodeBlock` | same | same | same |
| Node label font (Mermaid) | Poppins 16 px | Inter 16 px | Poppins 16 px | Inter 16 px |
| Reading text beside it | Poppins 16/24 | Inter 14/21 | Poppins 16/24 | Inter 14/21 |
| Node fill | rgb(210, 232, 251) | rgb(227, 236, 249) | rgb(0, 53, 95) | rgb(31, 41, 56) |
| Zoom controls | 3 × 26 px | 3 × 28 px | 3 × 26 px | 3 × 28 px |
| Fence width = prose width | 852 = 852 | yes | yes | yes |
| Gap paragraph → fence → paragraph | 16 / 16 | 16 / 16 | 16 / 16 | 16 / 16 |

- **Operated:** zoom-in control changes the content transform (all four documents). The zero-config registry renders
  without the `--zoomable` class and without controls.
- **Isolation:** in the gallery (dark) each profile is an iframe with `dark-mode` on its `<html>`; the gallery document
  itself contains no `.coar-mermaid`. Each document initializes Mermaid with its own profile (fills differ).
- **Open:** in compact the fence keeps a 16 px rhythm while compact blocks use 12 px (h3 → p 12, code block → p 12):
  `div.coar-markdown-fence` has no rule; the space is `.coar-mermaid { margin: var(--coar-spacing-m, 1rem) 0 }`
  (`packages/mermaid/src/CoarMermaidDiagram.vue:186`). Diagram text is Mermaid's 16 px in both profiles (no
  `fontSize` mapped in `theme-bridge.ts`), larger than the 14 px compact reading text. Both are design decisions,
  not defects; not changed. Edge-label contrast in dark was not measured.

### Author color span (`markdown-core/src/lib/color-span.ts`, `DefaultColorSpan`, editor `textColorMark`)

- Viewer (`.coar-markdown-color`): `#2563eb` → rgb(37, 99, 235) and `#b91c1c` → rgb(185, 28, 28) in legacy and compact,
  light and dark. Editor (`span[style*=color]` in ProseMirror): rgb(37, 99, 235) in all four. Saved colors are not
  re-tinted in either profile, as intended. Their contrast on the dark surface is a content question, not measured.

### Editor NodeViews (G9) — light and dark

| Sub-state | legacy | compact |
| --- | --- | --- |
| Writing text | Poppins 16/24 | Inter 14/21 |
| Frontmatter NodeView (`:scope > .coar-markdown-frontmatter`, 2 entries) | Poppins 16/24, light rgb(192, 192, 192), dark rgb(113, 113, 122) | Inter 14/21, light rgb(88, 103, 125), dark rgb(168, 182, 202) |
| Code block, render mode | 109 px | 107 px |
| Code block, edit mode (via its Edit button) | 120 px, language row 53 px | 120 px, language row 53 px |
| Code text | Cascadia Code 13/19.5 | Cascadia Code 13/19.5 |
| Embed `:::metric` (registered viewer) | Poppins 16 | Inter 14 |
| Embed selected (keyboard: paragraph start, ArrowLeft → NodeSelection) | class `--selected` set; **outline not painted** (`3px none`), radius 2 px | same: **not painted**, radius 8 px |

- **Package defect (reported to the parent, pre-existing on `develop`):**
  `packages/markdown-editor/src/CoarMarkdownEditor.vue:2287` `.coar-md-area .milkdown [contenteditable] { outline: none }`
  matches the embed host (it carries `contenteditable="false"`, `embed/index.ts:223`) and outranks
  `.coar-markdown-embed-host--selected { outline: 2px solid … }` (`:2143`). A selected embed is therefore never
  outlined in either profile, and the compact role `--coar-markdown-editor-selection-outline-color`
  (`styles/markdown-editor-compact.css:101`) has no visible effect. The spec asserts the painted outline and is red
  until that is fixed.
- The code block's language row is the same 53 px in both profiles (the audit of 2026-11-15 kept it mirroring
  `CoarCodeBlock`).

### Floating toolbar (`CoarMarkdownEditor.vue` `renderFloating`, teleported) — dark

| | legacy | compact |
| --- | --- | --- |
| Profile class on `body > .coar-md-floating-toolbar` | none | `coar-compact` |
| Size | 456 × 40 px | 426 × 38 px |
| Buttons | 30 × 30 px | 28 × 28 px |
| Background in a dark area | rgb(255, 255, 255) | rgb(28, 36, 49) |
| Radius | 6 px | 8 px |

- **Operated:** double-click on a word shows it inside the viewport; its Italic button wraps the selection
  (`strong em`); a click outside hides it.
- **Observed, legacy, pre-existing:** the teleported legacy toolbar is white in a dark area (the legacy look carries
  no theme scope into `body`). Unchanged by design (legacy stays exact).

### Table handles (`table/TableHandles.vue`, teleported) and their action menu — light

| | legacy | compact |
| --- | --- | --- |
| `body > .coar-md-th` profile class | none | `coar-compact` |
| Column grip | 305 × 10 px | 302 × 10 px |
| Menu overlay host | `coar-overlay-host` | `coar-overlay-host coar-compact light-mode` |
| Menu item | Poppins 14/21, 37 px | Inter 13/18.2, 36 px |

- **Operated:** hover near the table shows the handles; hovering a grip activates it and the column highlight; a click
  opens the menu; "Insert column right" adds a column (2 → 3 cells). Leaving the zone removes the handles.
- **Open:** the handles are hover-only (no touch path) — not checked on touch. Drag-to-reorder was not exercised here
  (the parent is changing drag ghosts).

### Image upload spinner (`image/imageUpload.ts`, `.coar-md-image-uploading`) — light

| | legacy | compact |
| --- | --- | --- |
| Size (1.25 em) | 24 × 24 px at 16 px text | 21.5 × 21.5 px at 14 px text |
| Arc / track | rgb(90, 90, 90) / rgb(229, 229, 229) | rgb(70, 82, 104) / rgb(220, 227, 237) |
| Animation | `coar-md-image-spin` | same |

- **Operated:** a paste with an image file shows the spinner and "1 Upload(s) offen"; the button resolves the
  local promise, the spinner is replaced by `img[alt=diagramm]`. Dark mode and the failure path were not run.

### Markdown form paragraphs (`ParagraphRenderer.ts`, `markdown-form.css`) (G8) — light and dark (same values)

| | legacy | compact |
| --- | --- | --- |
| `layout=row` grid | `54.25px 623.75px`, gap 12 px | `44.59px 633.41px`, gap 12 px |
| Row: label centre vs control centre | 0 px | 0 px |
| `layout=stacked` gap | 6 px, label above, same left edge | 6 px, label above, same left edge |
| Control frame height | 29 px | 24 px |
| Label (`strong`) | Poppins 16 / 700 | Inter 14 / 700 |
| Input text | Poppins 11 px | Inter 14 px |
| Error text | Poppins 11.2 px | Inter 12 px |

- **Operated:** typing into the empty stacked field clears its required error.
- **Open:** the 12 / 6 px gaps are literals in both profiles (not role-driven); the compact control is the 24 px `xs`
  input with 14 px text. Whether that is the intended form rhythm is a design decision; not changed. Mobile not run.

## Not covered here

`.coar-mobile` for all of the above, WebKit, touch for the table handles, image-dialog and color-picker panels opened
from this editor (covered inline by `compact-markdown-editor-panels`), drag-to-reorder of table rows/columns, an
embed with an editable `editor` component, the upload failure path, Docker visual baselines.

## Effect on the existing suite

The three new entries in `library-scenes.ts` make `compact-library.spec.ts` › "the gallery lists every library scene"
fail: its option list (`:110-114`) and the `INLINE`/`FRAMED` lists (`:12-17`, compared at `:116`) are exact. They
need `markdown-mermaid-integration` (FRAMED, after `composition`), `markdown-advanced` and
`markdown-form-layouts` (INLINE) — not edited here (outside this change's files).
