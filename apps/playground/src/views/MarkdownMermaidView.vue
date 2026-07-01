<script setup lang="ts">
/**
 * Demo of `@cocoar/vue-markdown-mermaid` — the opt-in Mermaid fence renderer.
 *
 * The viewer is handed `mermaidFenceRenderers`, which maps the `mermaid` fence
 * language to the diagram component. Everything else (a normal ```ts block, an
 * intentionally-broken diagram) shows the fallbacks: unregistered languages stay
 * plain code blocks, invalid diagrams degrade to an error box with the source.
 */
import { computed, ref } from 'vue';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { mermaidFenceRenderers } from '@cocoar/vue-markdown-mermaid';
import { parse } from '@cocoar/vue-markdown-core';

const value = ref(`# Diagrams via \`\`\`mermaid

A fenced code block with the \`mermaid\` info string renders as a diagram —
Cocoar-themed, lazy-loaded. The markdown itself stays portable: without this
renderer registered, the same block is just a readable code block.

## Flowchart

\`\`\`mermaid
flowchart LR
  A[Author writes markdown] --> B{Renderer registered?}
  B -->|yes| C[Diagram]
  B -->|no| D[Code block]
\`\`\`

## Sequence

\`\`\`mermaid
sequenceDiagram
  participant Editor
  participant Viewer
  Editor->>Viewer: same source
  Viewer-->>Editor: identical render
\`\`\`

## A normal code block is untouched

\`\`\`ts
const x: number = 1;
\`\`\`

## Invalid diagrams degrade gracefully

\`\`\`mermaid
flowchart LR
  A --> B -->
  this is not valid
\`\`\`
`);

const viewerDoc = computed(() => parse(value.value));
</script>

<template>
  <div class="mmd">
    <p class="mmd__hint">
      Edit the markdown on the left — the viewer on the right re-renders. Mermaid
      is loaded lazily on first diagram. Try breaking a diagram to see the error
      fallback.
    </p>

    <div class="mmd__split">
      <div class="mmd__pane">
        <div class="mmd__label">Raw markdown</div>
        <textarea v-model="value" class="mmd__editor" spellcheck="false" />
      </div>

      <div class="mmd__pane">
        <div class="mmd__label">Viewer (<code>:fence-renderers="mermaidFenceRenderers"</code>)</div>
        <div class="mmd__viewer-frame">
          <CoarMarkdown :doc="viewerDoc" :fence-renderers="mermaidFenceRenderers" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mmd {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  padding: 16px;
}
.mmd__hint {
  margin: 0;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary, #666);
}
.mmd__split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
}
.mmd__pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  gap: 6px;
}
.mmd__label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-tertiary, #999);
}
.mmd__label code {
  font-size: 11px;
  background: var(--coar-background-neutral-secondary, #f0f0f0);
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: none;
}
.mmd__editor {
  flex: 1 1 auto;
  min-height: 0;
  resize: none;
  padding: 12px;
  border: 1px solid var(--coar-border-neutral, #e2e2e2);
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
}
.mmd__viewer-frame {
  border: 1px solid var(--coar-border-neutral, #e2e2e2);
  border-radius: 8px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 12px 16px;
  background: var(--coar-background-neutral-primary, #fff);
}
</style>
