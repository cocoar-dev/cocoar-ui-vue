<!-- Generated from apps/docs/components/mermaid.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Mermaid Diagram (Preview)

A standalone [Mermaid](https://mermaid.js.org/) diagram component for Vue 3.
`<CoarMermaidDiagram :code>` renders a diagram from a Mermaid source **string** —
Cocoar-themed, lazy-loaded, with opt-in zoom/pan.

It knows **nothing about markdown** or any embedding layer — feed it a diagram
source and it renders. To turn ` ```mermaid ` fenced code blocks inside
`<CoarMarkdown>` into diagrams, use the thin adapter on the
[**Markdown Diagrams**](./markdown-diagrams.md) page (it registers this
same component as a fence renderer).

> **Info: Separate package**
>
```bash
pnpm add @cocoar/vue-mermaid
```
> `vue` is the only peer dependency. Mermaid is a regular dependency, imported
> **lazily** on first render (its own chunk). Import the stylesheet once:
>
```ts
import '@cocoar/vue-mermaid/styles';
```

**Demo — `mermaid/demos/MermaidBasic.vue`**

```vue
<script setup lang="ts">
/**
 * Standalone `<CoarMermaidDiagram>` — no markdown involved. Edit the source on
 * the left; the component re-renders on the right. `zoomable` adds the
 * +/−/⤢ controls, Ctrl/⌘+wheel zoom and drag-to-pan.
 */
import { ref } from 'vue';
import { CoarMermaidDiagram } from '@cocoar/vue-mermaid';

const code = ref(`sequenceDiagram
  autonumber
  participant C as Client
  participant S as Server
  C->>S: Request
  alt cache hit
    S-->>C: 200 (cached)
  else miss
    S->>S: compute
    S-->>C: 200
  end`);
</script>

<template>
  <ClientOnly>
    <div class="mmd-demo">
      <textarea v-model="code" class="mmd-demo__code" spellcheck="false" />
      <div class="mmd-demo__out">
        <CoarMermaidDiagram :code="code" zoomable />
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
.mmd-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 720px) {
  .mmd-demo { grid-template-columns: 1fr; }
}
.mmd-demo__code {
  min-height: 220px;
  resize: vertical;
  padding: 12px;
  border: 1px solid var(--coar-border-neutral, #e2e2e2);
  border-radius: var(--coar-radius-xl, 12px);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
}
.mmd-demo__out {
  min-width: 0;
}
</style>
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

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `code` | `string` | — | The Mermaid diagram source. |
| `language` | `string` | `'mermaid'` | Info-string label; handy when one component is reused for several fence keys. |
| `zoomable` | `boolean` | `false` | Enable the zoom/pan viewport. |

## How it works

- **Rendering is client-only** — Mermaid needs a DOM to measure and lay out, so
  nothing renders on the server or before mount. (Wrap it in `<ClientOnly>` in an
  SSR context like VitePress.)
- **Lazy** — Mermaid is dynamically imported on the first diagram, so pages
  without one never pay for it.
- **Cocoar-themed** — design tokens map onto Mermaid's `themeVariables`. Cocoar
  color tokens are `oklch(...)`, which Mermaid's parser can't read, so they're
  normalized to sRGB first (via a 1×1 canvas).
- **Font-safe** — rendering waits for `document.fonts.ready`, so labels aren't
  clipped by boxes that were measured before the web font loaded.
- **Security** — Mermaid runs with `securityLevel: 'strict'`; author diagram text
  is treated as untrusted (HTML in labels is sanitized).
- **Invalid source degrades** to an error box that still shows the raw source —
  it never throws up to the app.

> **Tip: Many diagrams on one page**
>
> Renders are serialized internally — `mermaid.render` shares global state and
> isn't concurrency-safe, so several diagrams mounting at once would otherwise
> corrupt each other.

## Zoom & pan

With `zoomable`, the diagram sits in a fixed-height viewport with:

- **+ / − / ⤢ buttons** (top-right) — the primary, touch-friendly zoom;
- **Ctrl / ⌘ + wheel** — zoom toward the cursor;
- **drag** — pan (mouse / pen);
- **double-click** — reset.

Plain mouse-wheel scrolling is deliberately **not** captured, so a diagram never
traps the page scroll. On touch, one-finger scrolling still scrolls the page
(zoom via the buttons). Set the viewport height with the `--coar-mermaid-height`
CSS variable (default `420px`):

```css
.my-diagram { --coar-mermaid-height: 600px; }
```

## Theming

Theming is applied automatically from the ambient Cocoar tokens. The mapping is
exported as pure functions if you need to build your own Mermaid config:

| Export | Description |
|---|---|
| `buildMermaidThemeVariables(getToken, resolveColor?)` | Cocoar token getter → Mermaid `themeVariables`. |
| `readCssTokens(el?)` | `getComputedStyle`-backed token getter. |
| `makeCssColorResolver()` | Canvas-backed CSS-color → sRGB resolver (handles `oklch(...)`). |

## In markdown

To render diagrams from ` ```mermaid ` fences inside `<CoarMarkdown>`, don't wire
this component up by hand — install `@cocoar/vue-markdown-mermaid` and pass its
`mermaidFenceRenderers` to the viewer's `fenceRenderers` prop. See
[**Markdown Diagrams**](./markdown-diagrams.md).
