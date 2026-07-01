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
