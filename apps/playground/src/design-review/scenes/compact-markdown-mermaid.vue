<script setup lang="ts">
// Mermaid diagrams, profile-neutral (profile class from an ancestor): a
// zoomable diagram with its controls and the error state. Mermaid's config is
// global to the page (and is not re-read on a light/dark change of the same
// profile), so the gallery shows this scene in one iframe per profile.
import { CoarMermaidDiagram } from '@cocoar/vue-mermaid';

const code = `flowchart LR
  A[Draft] --> B{Review}
  B -->|ok| C[Published]
  B -->|changes| A`;
const broken = 'flowchart LR\n  A --> ';
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Zoomable diagram and error</h2>
    <div style="--coar-mermaid-height: 220px">
      <CoarMermaidDiagram :code="code" zoomable data-scene-part="diagram" />
      <CoarMermaidDiagram :code="broken" data-scene-part="error" />
    </div>
  </section>
</template>
