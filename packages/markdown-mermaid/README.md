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
| `mermaidFenceRenderers` | Ready-to-spread `FenceRegistry` fragment (`{ mermaid }`). |
| `CoarMermaidDiagram` | The renderer component (`{ code, language }` props). |
| `buildMermaidThemeVariables` | Pure Cocoar-token → Mermaid-theme mapping. |
| `readCssTokens` | `getComputedStyle`-backed token getter. |
