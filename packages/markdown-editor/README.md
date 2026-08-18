# @cocoar/vue-markdown-editor

WYSIWYG Markdown editor for Vue 3 based on [Milkdown](https://milkdown.dev/) (Kit approach), styled with the Cocoar Design System.

Markdown-first: lossless round-trip between markdown text and editor state. Shares the same remark stack as `@cocoar/vue-markdown-core` and `<CoarMarkdown>`.

## Install

```bash
pnpm add @cocoar/vue-markdown-editor @cocoar/vue-ui
```

`@cocoar/vue-ui` and `vue` are peer dependencies. Milkdown is bundled as a regular dependency.

Then import the stylesheet **once** at your app's entry, alongside your other Cocoar styles:

```css
/* app/main.css */
@import "@cocoar/vue-ui/styles";
@import "@cocoar/vue-markdown-editor/styles";
```

Or in your `main.ts` if you import CSS through JS:

```ts
import '@cocoar/vue-ui/styles'
import '@cocoar/vue-markdown-editor/styles'
```

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';

const value = ref('# Hello\n\nStart typing **markdown**.');
</script>

<template>
  <CoarMarkdownEditor v-model="value" />
</template>
```

## Toolbar Modes

- `floating` (default) — appears on text selection, teleported to `<body>`, context-aware (text vs. table)
- `fixed` — `CoarSidebar` collapsed with icon buttons and flyout submenus
- `both` — both active simultaneously
- `external` — contributes this editor's commands and tool set to one stable shared toolbar

```vue
<CoarMarkdownEditor
  v-model="value"
  toolbar-mode="fixed"
  toolbar-position="left"
/>
```

### One toolbar for multiple editors

Wrap the toolbar and editors in `CoarMarkdownEditorGroup`, then use
`toolbar-mode="external"` on every participating editor. There is exactly one
toolbar DOM host; focus only switches its active editor controller. Each editor
may expose a different `tools` list without mounting, hiding, or teleporting a
second toolbar. When focus leaves all editors in the group, the host keeps the
last tool set visible but becomes inert and `aria-disabled` until an editor is
focused again.

```vue
<CoarMarkdownEditorGroup>
  <CoarMarkdownToolbar position="top" />

  <CoarMarkdownEditor
    v-model="document"
    toolbar-mode="external"
    :tools="['bold', 'headings', 'embed:page']"
  />
  <CoarMarkdownEditor
    v-model="notes"
    toolbar-mode="external"
    :tools="['bold', 'italic', 'bulletList']"
  />
</CoarMarkdownEditorGroup>
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `string` | `''` | Markdown content (use with `v-model`) |
| `readonly` | `boolean` | `false` | Disable editing |
| `placeholder` | `string` | `''` | Markdown hint shown while empty. Overlay-only — never written to `modelValue` |
| `toolbarMode` | `'floating' \| 'fixed' \| 'both' \| 'external'` | `'floating'` | Toolbar layout; `external` routes tools into a shared `CoarMarkdownToolbar` |
| `toolbarPosition` | `'left' \| 'right' \| 'top' \| 'bottom'` | `'left'` | Sidebar position when `toolbarMode` is `'fixed'` or `'both'` |
| `flavor` | `'commonmark' \| 'gfm' \| 'cocoar' \| { gfm?, textColor? }` | `'cocoar'` | Portability contract — hard-enforces which features can be authored (see [Flavors](#flavors-portability)) |
| `uploadImage` | `(file: File) => Promise<{ url: string; alt?: string }>` | _undefined_ | Enables paste / drag-drop image upload (see [Images](#images)) |
| `pickImage` | `(ctx: ImagePickContext) => void` | _undefined_ | Override the Insert Image button with your own asset picker (see [Custom image source](#custom-image-source-pickimage)) |

## Flavors (portability)

The `flavor` prop is a portability contract — it picks which features the editor offers and **hard-enforces** them (only the matching plugins are registered, so non-flavor constructs can't be typed or pasted; they degrade to plain text).

| Flavor | Adds on top of CommonMark | Renders in |
|---|---|---|
| `'commonmark'` | _(nothing — the portable floor)_ | any Markdown renderer (incl. minimal SwiftUI) |
| `'gfm'` | tables, task lists, strikethrough | GFM-capable renderers |
| `'cocoar'` _(default)_ | inline text color (non-portable HTML) | the Cocoar viewer / your own renderer |

```vue
<CoarMarkdownEditor v-model="value" flavor="commonmark" />
<!-- or fine control -->
<CoarMarkdownEditor v-model="value" :flavor="{ gfm: true, textColor: false }" />
```

Pick the flavor that matches your strictest downstream renderer (e.g. a native SwiftUI Markdown view) and authors can't produce content it won't render. `flavor` is the hard format contract; the `tools` whitelist is soft toolbar curation within it. To change `flavor` on a live editor, re-key it (`:key="flavor"`) so the plugin set re-registers.

## Images

Images round-trip as standard Markdown — `![alt](url "title")`. Three ways to add one:

- **Insert by URL** — the **Insert Image** sidebar button opens a dialog for `url` / `alt` / `title`. Like the table/code-block buttons it lives in the sidebar, so use `toolbar-mode="fixed"` or `"both"`.
- **Paste** an image from the clipboard (e.g. a screenshot).
- **Drag & drop** an image file into the writing area.

Paste and drop require an `upload-image` callback — it receives the `File`, stores it, and resolves with the resulting `url`. A spinner placeholder shows at the insertion point until it resolves, then is replaced by the image. Without the callback, image files fall through to the browser's default handling.

```vue
<CoarMarkdownEditor v-model="value" toolbar-mode="both" :upload-image="uploadImage" />

<script setup lang="ts">
async function uploadImage(file: File) {
  const url = await myAssetService.upload(file)
  return { url, alt: file.name }
}
</script>
```

### Custom image source (`pickImage`)

Wire the **Insert Image** button to your own asset library / gallery with `pickImage`. When set it **replaces** the URL dialog — clicking the button calls it with a context bound to the cursor: `insertImage(...)` plus `selectedText` (a default for `alt`). Open your own modal and call `ctx.insertImage(...)` for each chosen image (it can stay open and insert several). The editor keeps all ProseMirror handling, so you never touch the selection.

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

`pickImage` (button) and `uploadImage` (paste / drop) are orthogonal and compose.

> Resize / alignment / captions aren't part of standard Markdown and aren't supported yet — a richer image block is planned as a separate slice.

## Events

| Event | Payload | Description |
|---|---|---|
| `update:modelValue` | `string` | Fired when markdown changes |
