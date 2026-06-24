# Markdown Editor <Badge type="warning" text="Preview" />

WYSIWYG Markdown editor for Vue 3 based on [Milkdown](https://milkdown.dev/) (Kit approach), styled with the Cocoar Design System. Markdown-first: lossless round-trip between text and editor state. Shares the same remark stack — and the same render registry — as `@cocoar/vue-markdown-core` and `<CoarMarkdown>`.

::: info Separate Package
```bash
pnpm add @cocoar/vue-markdown-editor @cocoar/vue-markdown @cocoar/vue-ui
```
`@cocoar/vue-markdown`, `@cocoar/vue-ui` and `vue` are peer dependencies. Milkdown is bundled as a regular dependency — no extra setup required. The peer-dep on `@cocoar/vue-markdown` is what makes the **shared rendering registry** work — code blocks, tables, etc. look identical here and in `<CoarMarkdown>`.

Import the stylesheets once at your app's entry — same pattern as `@cocoar/vue-ui`:

```css
/* app/main.css */
@import "@cocoar/vue-ui/styles";
@import "@cocoar/vue-markdown/styles";        /* ← shared block styles */
@import "@cocoar/vue-markdown-editor/styles"; /* ← editor-specific chrome */
```
:::

::: warning Preview release
The package is on the `0.0.x` line. The render layer, `v-model` contract, toolbar API, form-field integration, and code-block view/edit toggle are **stable enough to ship in internal Cocoar apps** — the source format is plain Markdown, so any content written today round-trips through future API changes.

Still missing for a `1.0`: a link insertion dialog and hover-based table edge-handles (row/column selection). See [TODO](#todo) below.
:::

## Basic Usage

The editor exposes a plain `v-model` for the markdown string and renders a floating toolbar on text selection.

<preview path="./markdown-editor/demos/MarkdownEditorBasic.vue" />

```vue
<template>
  <CoarMarkdownEditor v-model="value" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';

const value = ref('# Hello\n\nStart typing **markdown**.');
</script>
```

::: tip Sizing
The editor fills its parent container. Wrap it in a parent with explicit height (`height: 360px`, `flex: 1` inside a column flexbox, etc.).
:::

## Toolbar Modes

`toolbarMode` controls the layout. Three values:

| Value | Description |
|---|---|
| `'floating'` (default) | Appears on text selection, teleported to `<body>`, context-aware (text vs. table) |
| `'fixed'` | `CoarSidebar` collapsed with icon buttons and flyout submenus, persistent. Sits on any of the four edges — see `toolbarPosition` |
| `'both'` | Both active simultaneously |

When `toolbarMode` is `'fixed'` or `'both'`, `toolbarPosition` controls which edge the toolbar attaches to. All four edges are supported — `'left'` and `'right'` give a vertical icon column, `'top'` and `'bottom'` switch to a horizontal toolbar above or below the editor area. Flyout submenus open in the corresponding direction (right for `left`, downward for `top`, etc.).

<preview path="./markdown-editor/demos/MarkdownEditorSidebar.vue" />

```vue
<CoarMarkdownEditor
  v-model="value"
  toolbar-mode="fixed"
  toolbar-position="top"
/>
```

## Flavors (portability)

The **`flavor`** prop is a portability contract: it picks which features the editor offers and **hard-enforces** them — it only registers the matching Milkdown plugins, so a non-flavor construct can't be typed *or pasted* (it degrades to plain text), and its toolbar buttons are hidden.

This matters when the same Markdown is rendered somewhere stricter than the web — e.g. a **native SwiftUI Markdown view** that only understands CommonMark, or CommonMark+GFM. Pick the flavor that matches your strictest renderer and authors physically can't produce content it won't render.

| Flavor | Adds on top of CommonMark | Renders in |
|---|---|---|
| `'commonmark'` | _(nothing — the portable floor)_ headings, bold/italic, lists, links, images, code, blockquote, hr | **any** Markdown renderer |
| `'gfm'` | tables, task lists, strikethrough | GFM-capable renderers (GitHub, swift-markdown-ui, …) |
| `'cocoar'` _(default)_ | inline **text color** (non-portable raw HTML) | the Cocoar viewer / your own renderer |

```vue
<!-- Strict: only portable CommonMark can be authored -->
<CoarMarkdownEditor v-model="value" flavor="commonmark" toolbar-mode="both" />

<!-- Fine control: GFM tables etc. but no color, via a capability object -->
<CoarMarkdownEditor v-model="value" :flavor="{ gfm: true, textColor: false }" />
```

A capability object (`{ gfm?, textColor? }`) is **opt-in** — unspecified capabilities are off, so `{}` ≡ `'commonmark'`. The default is `'cocoar'`, so existing editors are unchanged.

::: tip flavor vs. tools
`flavor` is the **hard format contract** (what can exist in the document). The [`tools`](#restricting-the-toolbar) whitelist is **soft toolbar curation** (which buttons show) *within* the flavor — e.g. keep GFM parsing but hide the table button. They compose.
:::

::: warning Changing flavor at runtime
Plugin registration happens once at mount. To switch `flavor` on a live editor, **re-key** the component (`:key="flavor"`) so it remounts and re-registers — otherwise only the toolbar updates, not the parser. Switching to a stricter flavor degrades unsupported constructs already in the document (a table becomes its literal `| … |` text). The standalone `<CoarMarkdown>` viewer has its own parse options and is not affected by the editor's flavor.
:::

## Readonly

```vue
<CoarMarkdownEditor v-model="value" readonly />
```

In `readonly` mode the editor accepts no input, the floating toolbar is suppressed, and the sidebar buttons are inert. The fixed toolbar still renders so the layout stays stable when toggling between view and edit.

## Placeholder

Pass a `placeholder` string to show a hint while the editor is empty. The
placeholder **is itself Markdown** — it renders through the same viewer the
editor uses for content, so `**bold**`, lists, and headings all work and match
the editor's typography.

```vue
<CoarMarkdownEditor
  v-model="value"
  :placeholder="'**Describe the change…**\n\n- What changed?\n- Why?'"
/>
```

<preview path="./markdown-editor/demos/MarkdownEditorPlaceholder.vue" />

::: tip Never persisted — unlike pre-filling the value
The placeholder is a muted, click-through **overlay** of the `<CoarMarkdown>` viewer, shown only while the document is empty. It never enters `modelValue`. An untouched editor therefore still emits an empty string — so you can leave the field genuinely blank.

Do **not** work around a missing placeholder by writing the hint into `v-model`: that turns the hint into real content, which then gets saved even when the user meant to leave the field empty.
:::

The hint disappears the moment the document has any content and reappears if it's emptied again. It tracks the live `placeholder` prop, so you can swap it at runtime. Because it's a real Markdown render, the placeholder also picks up [custom renderers](#code-blocks-view-edit-toggle) you provide via `MARKDOWN_RENDERERS_KEY`.

## Frontmatter

A leading YAML frontmatter block (`---` … `---`) is recognised and shown as muted, italic `key: value` lines instead of being mis-parsed as a thematic break + setext heading (which collapses the whole block onto one line). It renders the same way in the [viewer](/components/markdown#frontmatter), so editing and reading look identical.

<preview path="./markdown-editor/demos/MarkdownEditorFrontmatter.vue" />

The frontmatter is an **atomic block**: display-only in the rendered editor (muted + italic, like disabled text), selectable/deletable as a unit, and — crucially — it **round-trips**. The raw YAML is preserved verbatim, so `v-model` keeps emitting the `---` … `---` block untouched while you edit the body. To **edit** the YAML values, switch to [Source view](#source-view-raw-markdown).

::: info Parsing & nesting
Detection is powered by [`remark-frontmatter`](https://github.com/remarkjs/remark-frontmatter) on Milkdown's shared remark instance (and the matching parse path in `@cocoar/vue-markdown-core`). Only a YAML block at the very **top** of the document is treated as frontmatter — a `---` in the middle stays a horizontal rule. Malformed YAML falls back to showing the raw text in the card rather than collapsing.
:::

## Source view (raw Markdown)

Set `source-toggle` to add a **Rendered ↔ Source** switch. In Source mode the entire document — body **and** the frontmatter YAML — is editable as raw Markdown in a `<textarea>`; switching back re-parses and re-renders it.

```vue
<CoarMarkdownEditor v-model="value" source-toggle toolbar-mode="fixed" />
```

<preview path="./markdown-editor/demos/MarkdownEditorSourceToggle.vue" />

This is the way to hand-edit frontmatter, fix up exact Markdown, or paste raw content. The toggle is **off by default** — without `source-toggle` the editor is WYSIWYG-only with no extra chrome.

::: info Where the toggle lives
With a **fixed** sidebar toolbar (`toolbar-mode` `'fixed'` / `'both'`) the toggle is the **first item in the sidebar** — and in Source mode the sidebar collapses to just that toggle (the formatting buttons act on the hidden rich editor, so they're hidden). With the default **floating** toolbar there's no persistent toolbar, so a small toggle button appears in the editor's top-right corner instead.
:::

::: info Behaviour
The rich editor stays mounted in Source mode (just hidden), so switching is cheap and the toolbar stays put. `readonly` / `disabled` and the `CoarFormField` wiring carry over to the Source `<textarea>`. Switching back re-seeds the rich editor from the current value, so raw edits (incl. frontmatter) are picked up — the rich editor's undo history resets across a mode switch.
:::

## Images

Images round-trip as standard Markdown — `![alt](url "title")` — so anything you paste from another CMS (a WordPress export, say) renders as-is in both the editor and `<CoarMarkdown>`.

There are three ways to add one:

- **Insert by URL** — the **Insert Image** button in the sidebar opens a small dialog for `url` / `alt` / `title`. (Like the table and code-block buttons, it lives in the **sidebar**, so use `toolbar-mode="fixed"` or `"both"`.)
- **Paste** an image from the clipboard (e.g. a screenshot).
- **Drag & drop** an image file into the writing area.

Paste and drop require an `upload-image` callback. It receives the dropped/pasted `File`, stores it wherever you like, and resolves with the resulting `url` (plus optional `alt`). A spinner placeholder is shown at the insertion point until it resolves, then is replaced by the image. Without the callback, image files fall through to the browser's default handling.

```vue
<CoarMarkdownEditor
  v-model="value"
  toolbar-mode="both"
  :upload-image="uploadImage"
/>

<script setup lang="ts">
async function uploadImage(file: File) {
  const url = await myAssetService.upload(file) // your storage
  return { url, alt: file.name }
}
</script>
```

<preview path="./markdown-editor/demos/MarkdownEditorImages.vue" />

### Custom image source (`pickImage`)

To wire the **Insert Image** button to your own asset library or gallery, pass a `pickImage` callback. When set, it **replaces** the built-in URL dialog: clicking the button calls your callback with a context bound to the cursor position — `insertImage(...)` plus the `selectedText` (a handy default for `alt`). Open your own modal, then call `ctx.insertImage(...)` for each chosen image. The modal can stay open and insert several; the editor keeps ownership of cursor handling and the Markdown round-trip, so you never touch ProseMirror.

```vue
<CoarMarkdownEditor v-model="value" toolbar-mode="both" :pick-image="openGallery" />

<script setup lang="ts">
function openGallery(ctx) {
  myGalleryModal.open({
    defaultAlt: ctx.selectedText,
    onPick: (asset) => ctx.insertImage({ url: asset.url, alt: asset.title }),
  })
}
</script>
```

`pickImage` (button → your picker) and `uploadImage` (paste / drop) are orthogonal and compose — wire both for a full gallery-plus-paste experience.

<preview path="./markdown-editor/demos/MarkdownEditorImageGallery.vue" />

::: info Resize / alignment / captions
Width, alignment, and captions aren't part of standard Markdown, so they're not supported yet — a richer image block (a separate slice) is planned. Today an image is the plain `![alt](url "title")`.
:::

## Tables

GFM tables are portable (they render on GitHub, in `swift-markdown-ui`, etc.), so they're available in the `'gfm'` and `'cocoar'` [flavors](#flavors-portability). The editor offers a full set of table operations:

**Create** — two ways:
- The **Insert Table** sidebar button opens a small **grid size picker** — hover (or tap) to choose `cols × rows`, then click to insert.
- Type **`|3x4|`** followed by a space anywhere — a GFM input rule turns it into a 3-column × 4-row table. This needs no toolbar, so it's the way to create a table in the default `floating` mode.

**Edit** — with the cursor inside a cell, the in-table toolbar (floating, and the sidebar in `fixed`/`both` mode) offers:
- Insert row above / below, insert column left / right
- **Column alignment** — left / center / right, applied to the whole column (round-trips as GFM `:--` / `:-:` / `--:`); the active alignment is highlighted
- **Delete cell** and **Delete table**

::: info Hover edge-handles
Selecting a whole row/column by pointing at its border (Notion/Word-style) isn't built yet — it needs pointer/hover detection rather than ProseMirror's `CellSelection` (which doesn't fire `selectionchange`). It's prototyped in the playground table testbed.
:::

## Code blocks — view / edit toggle

Code blocks have a richer UX than the rest of the editor. When the cursor is **outside** a code block it renders as `CoarCodeBlock` with full Prism syntax highlighting — same component, same look as `<CoarMarkdown>` produces in the viewer. When the cursor moves **inside** the block it switches to plain editable mode plus a language selector at the top.

| State | What renders | Why |
|---|---|---|
| Cursor **outside** | `CoarCodeBlock` (Prism-highlighted, copy button, language label) | Read-mode aesthetic — matches the viewer |
| Cursor **inside** | Plain editable text + `CoarSelect` for the language | Editing on top of Prism-highlighted DOM is fragile (cursor jumps, IME issues). Plain text avoids that. |

Switching directions:
- **Render → edit**: hover the code block to reveal a small **Edit** button (top-right), or simply click into the text via PM's natural cursor placement
- **Edit → render**: click anywhere outside the code block. PM's selection moves out → the NodeView swaps back automatically

Supported languages match what `CoarCodeBlock` ships with: `typescript`, `javascript`, `json`, `css`, `scss`, `html`, `bash`, plus `''` (Plain text — no highlighting). The language string is persisted exactly as picked into the markdown fence (` ```json `).

::: tip Custom code-block renderer
The render-mode component is the registry's `codeBlock` slot. Override it in `provide(MARKDOWN_RENDERERS_KEY, { ...defaults, codeBlock: MyCustom })` and the editor's render mode picks up the same custom component without any extra wiring.
:::

## Form Integration

`CoarMarkdownEditor` is a full citizen of the Cocoar form ecosystem. Drop it inside `CoarFormField` and the label, error message, `aria-describedby` wiring, and `disabled` state propagate automatically — the same way `CoarTextInput`, `CoarSelect`, and `CoarScriptEditor` behave.

<preview path="./markdown-editor/demos/MarkdownEditorInForm.vue" />

```vue
<template>
  <CoarFormField label="Body" :error="bodyError" hint="Markdown" required>
    <CoarMarkdownEditor v-model="form.body" />
  </CoarFormField>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { CoarFormField } from '@cocoar/vue-ui';
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';

const form = reactive({ body: '' });
const bodyError = computed(() => form.body.trim().length === 0 ? 'Body cannot be empty.' : '');
</script>
```

What gets auto-wired from the surrounding `<CoarFormField>`:

| Form-field state | Effect on the editor |
|---|---|
| `id` | Set as the editor wrapper's `id` (so `<label for="...">` association works) |
| `error` | Sets `aria-invalid="true"` and applies the error outline |
| `disabled` | Combined with the editor's own `readonly` prop — `disabled || readonly` controls editability. `disabled` also dims the editor and blocks pointer events |
| `messageId` | Set as `aria-describedby` so screen readers announce the form-field's error/hint when the editor is focused |

You can also pass these props directly without `CoarFormField` (`error`, `disabled`, `id`) — direct props win over the injected context.

## Text Color

Apply inline color to a selection. Click the **palette** button in the floating toolbar (or the sidebar item in fixed mode) to open the picker — pick a swatch from the 8-color palette or use the native browser color input for a custom hex value. The color persists to markdown as plain inline HTML so the document stays readable in any standard renderer:

```markdown
The quick <span style="color: #dc2626">red</span> fox.
```

<preview path="./markdown-editor/demos/MarkdownEditorTextColor.vue" />

The picker is rendered through the same overlay primitive (`menuPreset`) that powers menus, popovers, and sidebar flyouts: anchor-relative positioning, viewport flipping, scroll-reposition, plus outside-click and `Escape` dismissal — no bespoke layout or click-handling logic in the editor.

::: info Why a whitelist?
The viewer (`@cocoar/vue-markdown` and `@cocoar/vue-markdown-core`) and the editor share a single `sanitizeColor` helper that accepts only:

- Hex (`#rgb`, `#rrggbb`, with optional alpha)
- `rgb()` / `rgba()` and the modern space-separated form
- `hsl()` / `hsla()` and the modern space-separated form
- A small set of named CSS colors (`red`, `blue`, …, `transparent`, `currentcolor`)

Anything else — `var(--token)`, `url(...)`, `expression(...)`, multi-declaration styles, foreign attributes — is rejected. A failed sanitization falls through to plain text in the viewer and keeps the surrounding content intact in the editor. There's no way for a hostile markdown payload to leak inline style beyond a single `color` declaration.

The picker palette (`COAR_TEXT_COLOR_PALETTE`) is exported so consumers can mirror it in custom UI.
:::

## Editor ↔ Viewer Parity

`<CoarMarkdownEditor>` and `<CoarMarkdown>` (the viewer) read the **same shared stylesheet** (`@cocoar/vue-markdown/styles`) so a markdown document looks pixel-identical whether you're editing it or rendering it for display. The two render through different DOM shapes — the editor's PM-managed contenteditable emits bare `<li>` / `<td>` / `<blockquote>` nodes inside a `.ProseMirror` wrapper, while the viewer emits class-tagged elements (`.coar-markdown-list-item`, etc.) — and the shared stylesheet covers both via parallel `:where(…)` selectors:

| Concern | Note |
|---|---|
| Vertical rhythm | Block margins apply to direct children of `.coar-markdown` (viewer) **and** `.coar-markdown .ProseMirror` (editor). |
| Typography | Heading sizes, blockquote inset, list indentation, `<strong>` weight (700), inline-code color, link underline — all defined once. |
| Tables | Zebra alternation uses `:nth-child(<n> of :not([data-is-header]))` to handle Milkdown's `<tr data-is-header>`-inside-`<tbody>` shape and the viewer's classic `<thead>` / `<tbody>` split with one rule. |
| Task lists | `<li data-item-type="task" data-checked="true">` in both panes; the visual checkbox is a `::before` pseudo-element (no native `<input>`). Completed items get the muted-color strikethrough. |
| Cell padding | `<p>` user-agent margin reset to `0` inside `<li>` / `<td>` / `<th>` — without the reset PM's auto-wrapped paragraph would add ~1em of vertical whitespace per row. |

If you embed the editor next to a viewer pane (the playground's "viewer pane" toggle does exactly this), the two should render the same source identically. Differences narrow down to design tokens you can override globally:

| Variable | Default | Effect |
|---|---|---|
| `--coar-markdown-heading-block-start` | `var(--coar-spacing-xl, 2rem)` | Extra space above every top-level heading. Lower for tighter docs, raise for more whitespace. |
| `--coar-markdown-space-2` | `var(--coar-spacing-m, 1rem)` | Default block-end margin. Drives paragraph / list / table / blockquote spacing. |
| `--coar-markdown-link` | `var(--coar-text-brand-primary)` | Link color (also applied to inline code). |
| `--coar-markdown-border` | `var(--coar-border-neutral-tertiary)` | Used by tables, blockquote, `<hr>`. |

## Restricting the Toolbar

Pass a `tools` array to limit which buttons the toolbar exposes. When omitted, all tools are shown. Order does not matter — the canonical order is preserved.

```vue
<!-- Minimal subset (matches the default rich-text editor in older Cocoar apps) -->
<CoarMarkdownEditor
  v-model="value"
  :tools="['bold', 'italic', 'bulletList', 'orderedList', 'outdent', 'indent', 'clearFormatting']"
/>

<!-- All tools except tables -->
<script setup lang="ts">
import { COAR_MARKDOWN_EDITOR_ALL_TOOLS } from '@cocoar/vue-markdown-editor';
const tools = COAR_MARKDOWN_EDITOR_ALL_TOOLS.filter(t => t !== 'table' && t !== 'tableOps');
</script>
<CoarMarkdownEditor v-model="value" :tools="tools" />
```

### Tool identifiers

| Tool | Description |
|---|---|
| `bold` `italic` `strikethrough` `inlineCode` | Inline marks |
| `textColor` | Text color picker — see [Text Color](#text-color) |
| `headings` | Heading flyout (H1–H6 + paragraph) |
| `bulletList` `orderedList` `taskList` | List variants |
| `indent` `outdent` | List nesting controls |
| `blockquote` `horizontalRule` | Block elements |
| `codeBlock` `table` `image` | Insert blocks (sidebar only) |
| `tableOps` | Insert/Delete row/col, shown contextually when cursor is inside a table |
| `clearFormatting` | Strip all marks + reset block to paragraph |
| `undo` `redo` | History |

::: info Markdown-only formatting
Only formatting that round-trips through Markdown is exposed. There is intentionally **no underline, font-family, font-size, or alignment** — these have no Markdown representation and would silently break round-trip persistence. **Text color** is the one exception: it round-trips as plain inline HTML through a strict whitelist sanitizer (see [Text Color](#text-color)).

When migrating from a richtext editor that exposed those tools, the closest Markdown-native substitutes are:

| Richtext tool | Markdown equivalent |
|---|---|
| Font size | `headings` — H1–H6 provide the typographic hierarchy |
| Bold / italic | `bold` / `italic` (no change) |
| Bulleted / numbered list | `bulletList` / `orderedList` |
| Indent / outdent (in lists) | `indent` / `outdent` |
| Clear / eraser | `clearFormatting` |
| Underline, color, alignment, font-family | _no equivalent — drop or accept embedded HTML_ |
:::

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `string` | `''` | Markdown content (use with `v-model`) |
| `readonly` | `boolean` | `false` | Disable editing (keeps the layout, suppresses the toolbar) |
| `disabled` | `boolean` | `false` | Disabled state — non-interactive, dimmed. Auto-picked up from `CoarFormField` |
| `error` | `boolean` | `false` | Error state — adds outline + `aria-invalid`. Auto-picked up from `CoarFormField.error` |
| `id` | `string` | _(auto)_ | HTML id. Auto-generated if omitted; `CoarFormField`'s id takes precedence |
| `name` | `string` | _undefined_ | Reflected as `data-name` for form-submission tooling |
| `required` | `boolean` | `false` | Sets `aria-required="true"` |
| `placeholder` | `string` | `''` | Markdown hint shown while the editor is empty. Overlay-only — never written to `modelValue`. See [Placeholder](#placeholder) |
| `sourceToggle` | `boolean` | `false` | Show a Rendered ↔ Source toggle for editing the raw Markdown. See [Source view](#source-view-raw-markdown) |
| `toolbarMode` | `'floating' \| 'fixed' \| 'both'` | `'floating'` | Toolbar layout |
| `toolbarPosition` | `'left' \| 'right' \| 'top' \| 'bottom'` | `'left'` | Toolbar edge when `toolbarMode` is `'fixed'` or `'both'`. `top`/`bottom` render a horizontal toolbar; flyouts open along the perpendicular axis. |
| `tools` | `CoarMarkdownEditorTool[]` | _all_ | Whitelist of toolbar tools. See [Restricting the Toolbar](#restricting-the-toolbar) |
| `flavor` | `'commonmark' \| 'gfm' \| 'cocoar' \| { gfm?, textColor? }` | `'cocoar'` | Portability contract — hard-enforces which features can be authored. See [Flavors](#flavors-portability) |
| `uploadImage` | `(file: File) => Promise<{ url: string; alt?: string }>` | _undefined_ | Enables paste / drag-drop image upload. Returns the stored image's URL. See [Images](#images) |
| `pickImage` | `(ctx: ImagePickContext) => void` | _undefined_ | Override the Insert Image button with your own asset picker. See [Custom image source](#custom-image-source-pickimage) |

## Events

| Event | Payload | Description |
|---|---|---|
| `update:modelValue` | `string` | Fired on every internal markdown change. The editor de-duplicates — if a parent echoes the value back unchanged, no second update fires. |

## Floating-Toolbar Contexts

The floating toolbar swaps its contents based on what's selected:

| Selection | Toolbar |
|---|---|
| Text outside a table | Bold, Italic, Strikethrough, Inline Code, Headings flyout, Blockquote |
| Text inside a table cell | Row insert above/below, Column insert left/right, Delete cell, plus Bold/Italic/Code |

Detection runs on the ProseMirror selection state via `editorViewCtx`. CellSelections are ProseMirror-internal and don't fire `selectionchange` — the column- and row-handle toolbars referenced in the architecture below are not wired up yet (see [TODO](#todo)).

## Architecture Notes

### Why Milkdown (not TipTap, not Crepe)

| | Milkdown Kit | TipTap | Milkdown Crepe |
|---|---|---|---|
| Data format | **Markdown-first** (lossless round-trip) | JSON-first (lossy markdown export) | Markdown-first |
| Shared stack | Same as `@cocoar/vue-markdown-core`: unified@^11, remark-parse@^11, remark-gfm@^4 | No overlap | Same |
| Bundle | ~137 KB gzip (Kit) | Similar | ~2 MB (CodeMirror, KaTeX, etc.) |
| UI control | Full — headless, own components | Full — headless | Limited — predefined Notion-like UI |
| License | MIT | MIT (core), paid (collab) | MIT |

The Kit approach gives full control over UI while sharing the remark pipeline with the existing `@cocoar/vue-markdown-core` parser and `<CoarMarkdown>` viewer.

### Why no `tableBlock` plugin

`@milkdown/components/table-block` provides edge-handle buttons, button-group popups, and drag-to-reorder, but:

- Clicking in a cell auto-selects all content (breaks normal editing)
- Button-group popup overlaps with the floating toolbar
- CellSelection is internal to ProseMirror — `window.getSelection()` returns `type: "None"`, so `selectionchange` doesn't fire and detection is unreliable
- Requires ~200 lines of CSS to style properly

Table operations are instead exposed via the floating toolbar (when the cursor is inside a cell) and the sidebar toolbar (always available in fixed mode). Custom edge-handles will be built when a stable design is settled.

## TODO

- [ ] Hover-based table edge-handles (point at a row/column border to select it)
- [ ] Link insert/edit dialog
- [x] Image support (insert by URL, paste / drag-drop upload, custom `pickImage`)
- [x] Table create (size picker + `|CxR|`), column alignment, delete table
- [ ] Task list checkbox rendering and toggling
- [ ] Use `computeOverlayCoordinates` for floating toolbar positioning instead of viewport clamping
- [ ] Slash commands for block insertions
- [ ] Block drag handle
- [ ] Code block syntax highlighting (Prism or Shiki)
