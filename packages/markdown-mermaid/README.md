# @cocoar/vue-markdown-mermaid

Opt-in [Mermaid](https://mermaid.js.org/) diagram renderer for
[`@cocoar/vue-markdown`](../markdown). Renders ` ```mermaid ` fenced code blocks
as diagrams — Cocoar-themed and lazy-loaded.

The markdown packages have **no dependency on Mermaid**. Installing this package
and registering it is the opt-in; a consumer that doesn't opt in still sees a
readable, syntax-highlighted code block. The markdown stays portable.

## Install

```bash
pnpm add @cocoar/vue-markdown-mermaid
```

`vue` and `@cocoar/vue-markdown` are peer dependencies. Mermaid itself is a
regular dependency of this package, dynamically imported on first render so it
lands in its own lazy chunk.

Import the stylesheet once (it carries the diagram wrapper, error box and
zoom-viewport styles):

```ts
import '@cocoar/vue-markdown-mermaid/styles';
```

## Usage

```vue
<script setup lang="ts">
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { mermaidFenceRenderers } from '@cocoar/vue-markdown-mermaid';
import { parse } from '@cocoar/vue-markdown-core';

const doc = parse(`
# Flow

\`\`\`mermaid
flowchart LR
  A[Start] --> B{Choice}
  B -->|yes| C[Do it]
  B -->|no| D[Skip]
\`\`\`
`);
</script>

<template>
  <CoarMarkdown :doc="doc" :fence-renderers="mermaidFenceRenderers" />
</template>
```

Merge it with other fence renderers if you have them:

```ts
const fenceRenderers = { ...mermaidFenceRenderers, dot: MyGraphvizRenderer };
```

## Zoom & pan

The fence-renderer contract only passes `{ code, language }` to a registered
component, so per-diagram options are configured on the **registry** via
`createMermaidFenceRenderers`:

```ts
import { createMermaidFenceRenderers } from '@cocoar/vue-markdown-mermaid';

const fenceRenderers = createMermaidFenceRenderers({ zoomable: true });
```

With `zoomable`, each diagram sits in a fixed-height viewport with:

- **+ / − / ⤢ buttons** (top-right) — the primary, touch-friendly zoom;
- **Ctrl / ⌘ + wheel** — zoom toward the cursor;
- **drag** — pan (mouse / pen);
- **double-click** — reset.

Plain mouse-wheel scrolling is deliberately **not** captured, so a diagram never
traps the page scroll. On touch, one-finger scrolling still scrolls the page
(zoom via the buttons). Set the viewport height with the `--coar-mermaid-height`
CSS variable (default `420px`).

`CoarMermaidDiagram` also accepts `zoomable` directly if you mount it yourself
outside the fence registry.

## How it works

- **On disk** a diagram is just a fenced code block (` ```mermaid `). It
  round-trips losslessly and degrades to a code block anywhere Mermaid isn't
  available (strict CommonMark renderers, viewer-only builds, native mobile
  renderers).
- **Rendering** is client-only (Mermaid needs a DOM) and lazy (Mermaid is
  dynamically imported on first mount).
- **Theming** maps Cocoar design tokens onto Mermaid's `themeVariables` via
  `buildMermaidThemeVariables` so diagrams match the app's fonts and palette.
- **Security**: Mermaid runs with `securityLevel: 'strict'` — author diagram
  text is treated as untrusted (HTML in labels is sanitized).
- **Invalid source** degrades to an error box that still shows the raw diagram
  source; it never throws up to the app.

## Exports

| Export | Description |
| --- | --- |
| `mermaidFenceRenderers` | Ready-to-spread `FenceRegistry` fragment (`{ mermaid }`), no zoom. |
| `createMermaidFenceRenderers(options?)` | Build a registry with options baked in — `{ zoomable }`. |
| `CoarMermaidDiagram` | The renderer component (`{ code, language, zoomable }` props). |
| `buildMermaidThemeVariables` | Pure Cocoar-token → Mermaid-theme mapping. |
| `makeCssColorResolver` / `readCssTokens` | Browser-backed color/token resolvers for the theme bridge. |
