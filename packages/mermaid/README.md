# @cocoar/vue-mermaid

A standalone [Mermaid](https://mermaid.js.org/) diagram component for Vue 3.
`<CoarMermaidDiagram :code>` renders a diagram from a Mermaid source string —
Cocoar-themed, lazy-loaded, with opt-in zoom/pan.

It knows **nothing about markdown** or any embedding layer. To render
` ```mermaid ` fenced code blocks inside [`@cocoar/vue-markdown`](../markdown),
use the thin adapter [`@cocoar/vue-markdown-mermaid`](../markdown-mermaid) — it
plugs this component in as a fence renderer.

## Install

```bash
pnpm add @cocoar/vue-mermaid
```

`vue` is the only peer dependency. Mermaid is a regular dependency, dynamically
imported on first render so it lands in its own lazy chunk. Import the stylesheet
once:

```ts
import '@cocoar/vue-mermaid/styles';
```

## Usage

```vue
<template>
  <CoarMermaidDiagram :code="code" zoomable />
</template>

<script setup lang="ts">
import { CoarMermaidDiagram } from '@cocoar/vue-mermaid';

const code = `
flowchart LR
  A[Start] --> B{Choice}
  B -->|yes| C[Do it]
  B -->|no| D[Skip]
`;
</script>
```

| Prop | Type | Description |
| --- | --- | --- |
| `code` | `string` | The Mermaid diagram source. |
| `language` | `string` | Info-string label (default `'mermaid'`); handy when reused. |
| `zoomable` | `boolean` | Enable zoom/pan (default `false`). |

## How it works

- **Rendering** is client-only (Mermaid needs a DOM) and lazy (Mermaid is
  dynamically imported on first mount).
- **Theming** maps Cocoar design tokens onto Mermaid's `themeVariables` (colors
  normalized to sRGB, since Cocoar tokens are `oklch(...)` which Mermaid can't
  read) so diagrams match the app's fonts and palette.
- **Fonts**: rendering waits for `document.fonts.ready` so text isn't clipped by
  boxes measured before the web font loaded.
- **Security**: Mermaid runs with `securityLevel: 'strict'` — author diagram text
  is treated as untrusted (HTML in labels is sanitized).
- **Invalid source** degrades to an error box that still shows the raw source; it
  never throws up to the app.

## Zoom & pan

With `zoomable`, the diagram sits in a fixed-height viewport with:

- **+ / − / ⤢ buttons** (top-right) — the primary, touch-friendly zoom;
- **Ctrl / ⌘ + wheel** — zoom toward the cursor;
- **drag** — pan (mouse / pen);
- **double-click** — reset.

Plain mouse-wheel scrolling is deliberately **not** captured, so a diagram never
traps the page scroll. On touch, one-finger scrolling still scrolls the page.
Set the viewport height with the `--coar-mermaid-height` CSS variable (default
`420px`).

## Exports

| Export | Description |
| --- | --- |
| `CoarMermaidDiagram` | The renderer component (`{ code, language, zoomable }`). |
| `buildMermaidThemeVariables(getToken, resolveColor?)` | Pure Cocoar-token → Mermaid-theme mapping. |
| `makeCssColorResolver()` / `readCssTokens(el?)` | Browser-backed color/token resolvers for the bridge. |
