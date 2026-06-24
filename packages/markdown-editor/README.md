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

```vue
<CoarMarkdownEditor
  v-model="value"
  toolbar-mode="fixed"
  toolbar-position="left"
/>
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `string` | `''` | Markdown content (use with `v-model`) |
| `readonly` | `boolean` | `false` | Disable editing |
| `placeholder` | `string` | `''` | Markdown hint shown while empty. Overlay-only — never written to `modelValue` |
| `toolbarMode` | `'floating' \| 'fixed' \| 'both'` | `'floating'` | Toolbar layout |
| `toolbarPosition` | `'left' \| 'right'` | `'left'` | Sidebar position when `toolbarMode` is `'fixed'` or `'both'` |
| `uploadImage` | `(file: File) => Promise<{ url: string; alt?: string }>` | _undefined_ | Enables paste / drag-drop image upload (see [Images](#images)) |

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

> Resize / alignment / captions aren't part of standard Markdown and aren't supported yet — a richer image block is planned as a separate slice.

## Events

| Event | Payload | Description |
|---|---|---|
| `update:modelValue` | `string` | Fired when markdown changes |
