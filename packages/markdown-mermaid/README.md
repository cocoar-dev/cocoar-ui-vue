# @cocoar/vue-markdown-mermaid

The thin adapter that plugs [`@cocoar/vue-mermaid`](../mermaid)'s diagram renderer
into [`@cocoar/vue-markdown`](../markdown) as a **fenced-code-block renderer**, so
` ```mermaid ` blocks render as diagrams.

This package is **only** the markdown integration (the fence registry). The
diagram component, its theming and zoom/pan live in the standalone,
markdown-free `@cocoar/vue-mermaid` — import `CoarMermaidDiagram` from there to
render diagrams outside of markdown.

The markdown packages have **no dependency on Mermaid**. Installing this package
and registering it is the opt-in; a consumer that doesn't opt in still sees a
readable, syntax-highlighted code block. The markdown stays portable.

## Install

```bash
pnpm add @cocoar/vue-markdown-mermaid
```

`vue` and `@cocoar/vue-markdown` are peer dependencies; `@cocoar/vue-mermaid`
(which carries Mermaid) comes along as a regular dependency. Import its
stylesheet once:

```ts
import '@cocoar/vue-mermaid/styles';
```

## Usage

Pass the ready-made registry fragment to the viewer's `fenceRenderers` prop:

```vue
<template>
  <CoarMarkdown :doc="doc" :fence-renderers="mermaidFenceRenderers" />
</template>

<script setup lang="ts">
import { parse } from '@cocoar/vue-markdown-core';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { mermaidFenceRenderers } from '@cocoar/vue-markdown-mermaid';

const doc = parse(source);
</script>
```

An app-wide default works too — `app.provide(MARKDOWN_FENCE_RENDERERS_KEY, mermaidFenceRenderers)`.
A per-instance `fence-renderers` prop wins over the provided value.

## Zoom & pan

The fence-renderer contract only passes `{ code, language }` to a component, so
per-diagram options are configured on the **registry** via
`createMermaidFenceRenderers`:

```ts
import { createMermaidFenceRenderers } from '@cocoar/vue-markdown-mermaid';

const fenceRenderers = createMermaidFenceRenderers({ zoomable: true });
```

See [`@cocoar/vue-mermaid`](../mermaid) for the zoom/pan controls and behaviour.

## Registering your own fence renderer

The registry is open — any language can map to any component. Register your own
alongside Mermaid, or replace it:

```ts
import type { FenceRegistry } from '@cocoar/vue-markdown';
import { mermaidFenceRenderers } from '@cocoar/vue-markdown-mermaid';
import MyGraphviz from './MyGraphviz.vue';

const fenceRenderers: FenceRegistry = { ...mermaidFenceRenderers, dot: MyGraphviz };
```

## Exports

| Export | Description |
| --- | --- |
| `mermaidFenceRenderers` | Ready-to-spread `FenceRegistry` fragment (`{ mermaid }`), no zoom. |
| `createMermaidFenceRenderers(options?)` | Build a registry with options baked in — `{ zoomable }`. |
| `MermaidFenceOptions` | The options type. |
