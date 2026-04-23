# Markdown Editor

WYSIWYG Markdown editor for Vue 3 based on [Milkdown](https://milkdown.dev/) (Kit approach), styled with the Cocoar Design System. Markdown-first: lossless round-trip between text and editor state. Shares the same remark stack as `@cocoar/vue-markdown-core` and `<CoarMarkdown>`.

::: info Separate Package
```bash
pnpm add @cocoar/vue-markdown-editor @cocoar/vue-ui
```
`@cocoar/vue-ui` and `vue` are peer dependencies. Milkdown is bundled as a regular dependency — no extra setup required.

Import the stylesheet once at your app's entry — same pattern as `@cocoar/vue-ui` and `@cocoar/vue-data-grid`:

```css
/* app/main.css */
@import "@cocoar/vue-ui/styles";
@import "@cocoar/vue-markdown-editor/styles";
```
:::

::: warning Early version
The `0.0.x` series is the first extraction from the prototype. The render layer, v-model contract, and toolbar API are stable; **table edge handles, link/image dialogs, and a placeholder are not yet implemented**. See [TODO](#todo) below.
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
| `'fixed'` | `CoarSidebar` collapsed with icon buttons and flyout submenus, persistent |
| `'both'` | Both active simultaneously |

When `toolbarMode` is `'fixed'` or `'both'`, `toolbarPosition` (`'left'` or `'right'`) controls the sidebar side.

<preview path="./markdown-editor/demos/MarkdownEditorSidebar.vue" />

```vue
<CoarMarkdownEditor
  v-model="value"
  toolbar-mode="fixed"
  toolbar-position="left"
/>
```

## Readonly

```vue
<CoarMarkdownEditor v-model="value" readonly />
```

In `readonly` mode the editor accepts no input, the floating toolbar is suppressed, and the sidebar buttons are inert. The fixed toolbar still renders so the layout stays stable when toggling between view and edit.

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
| `headings` | Heading flyout (H1–H6 + paragraph) |
| `bulletList` `orderedList` `taskList` | List variants |
| `indent` `outdent` | List nesting controls |
| `blockquote` `horizontalRule` | Block elements |
| `codeBlock` `table` | Insert blocks |
| `tableOps` | Insert/Delete row/col, shown contextually when cursor is inside a table |
| `clearFormatting` | Strip all marks + reset block to paragraph |
| `undo` `redo` | History |

::: info Markdown-only formatting
Only formatting that round-trips through Markdown is exposed. There is intentionally **no underline, font-family, font-size, text color, or alignment** — these have no Markdown representation and would silently break round-trip persistence.

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
| `toolbarMode` | `'floating' \| 'fixed' \| 'both'` | `'floating'` | Toolbar layout |
| `toolbarPosition` | `'left' \| 'right'` | `'left'` | Sidebar position when `toolbarMode` is `'fixed'` or `'both'` |
| `tools` | `CoarMarkdownEditorTool[]` | _all_ | Whitelist of toolbar tools. See [Restricting the Toolbar](#restricting-the-toolbar) |

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

- [ ] Custom table edge-handles (column/row selection + dedicated toolbars)
- [ ] Link insert/edit dialog
- [ ] Image upload support
- [ ] Placeholder text
- [ ] Task list checkbox rendering and toggling
- [ ] Use `computeOverlayCoordinates` for floating toolbar positioning instead of viewport clamping
- [ ] Slash commands for block insertions
- [ ] Block drag handle
- [ ] Code block syntax highlighting (Prism or Shiki)
