<script setup lang="ts">
// ```mermaid fences rendered by the real markdown-mermaid registry inside CoarMarkdown
// (CoarMarkdown → DefaultCodeBlock → div.coar-markdown-fence → CoarMermaidFence →
// CoarMermaidDiagram), not by a diagram component placed directly. One viewer uses the
// zoomable registry and also holds a broken fence, an unregistered ```ts fence (stays a
// code block) and author color spans (saved document colors, never re-tinted); a second
// viewer uses the zero-config `mermaidFenceRenderers`.
// Profile-neutral. Mermaid's config is page-global, so the gallery shows this scene in
// one iframe per profile, and light and dark are separate documents (`mode=` of the frame).
import { parse } from '@cocoar/vue-markdown-core';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { createMermaidFenceRenderers, mermaidFenceRenderers } from '@cocoar/vue-markdown-mermaid';

const zoomable = createMermaidFenceRenderers({ zoomable: true });

const flow = parse(`### Freigabe

Ein Absatz vor dem Diagramm mit <span style="color: #2563eb">blauer Autorenfarbe</span> und
<span style="color: #b91c1c">roter Autorenfarbe</span>.

\`\`\`mermaid
flowchart LR
  A[Entwurf] --> B{Prüfung}
  B -->|ok| C[Veröffentlicht]
  B -->|Änderungen| A
\`\`\`

Ein Absatz zwischen den Diagrammen.

\`\`\`mermaid
flowchart LR
  A -->
\`\`\`

\`\`\`ts
const fence = 'unregistered language stays a code block';
\`\`\`

Ein Absatz nach den Blöcken.
`);

const plain = parse(`\`\`\`mermaid
sequenceDiagram
  Autor->>Prüfer: Entwurf
  Prüfer-->>Autor: Freigabe
\`\`\`
`);
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">CoarMarkdown + createMermaidFenceRenderers({ zoomable: true })</h2>
    <div data-scene-part="zoomable-doc" style="--coar-mermaid-height: 220px">
      <CoarMarkdown :doc="flow" :fence-renderers="zoomable" />
    </div>
  </section>
  <section class="vs-section">
    <h2 class="vs-title">CoarMarkdown + mermaidFenceRenderers (zero-config)</h2>
    <div data-scene-part="plain-doc" style="--coar-mermaid-height: 180px">
      <CoarMarkdown :doc="plain" :fence-renderers="mermaidFenceRenderers" />
    </div>
  </section>
</template>
