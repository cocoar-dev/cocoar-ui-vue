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
import { createMermaidFenceRenderers } from '@cocoar/vue-markdown-mermaid';
import { parse } from '@cocoar/vue-markdown-core';

// zoomable: every diagram gets wheel-zoom + drag-pan + double-click-reset.
const fenceRenderers = createMermaidFenceRenderers({ zoomable: true });

// Assembled from lines (join) rather than one big template literal so the many
// ``` fences don't need backtick-escaping. A spread of complex Mermaid diagram
// types to see how the renderer + Cocoar theme bridge handle real complexity.
const source = [
  '# Complex diagrams via ```mermaid',
  '',
  'Every block below is a `mermaid` fenced code block, rendered lazily and',
  'Cocoar-themed. Edit any of them on the left.',
  '',
  '## Flowchart — subgraphs, DB, cache, dotted edges',
  '',
  '```mermaid',
  'flowchart TB',
  '  U([User]) --> LB{Load balancer}',
  '  subgraph Auth service',
  '    LB --> A[Login]',
  '    A --> V{Valid?}',
  '    V -->|no| A',
  '    V -->|yes| T[Issue JWT]',
  '  end',
  '  subgraph API tier',
  '    T --> G[Gateway]',
  '    G --> S1[Orders svc]',
  '    G --> S2[Billing svc]',
  '    S1 --> DB[(Postgres)]',
  '    S2 --> DB',
  '    S1 --> C[(Redis cache)]',
  '    C -.cache miss.-> DB',
  '  end',
  '  DB --> R[/JSON response/]',
  '  C --> R',
  '  R --> U',
  '```',
  '',
  '## Sequence — autonumber, loop, alt, notes',
  '',
  '```mermaid',
  'sequenceDiagram',
  '  autonumber',
  '  actor U as User',
  '  participant W as Web',
  '  participant S as Server',
  '  participant DB as Database',
  '  U->>W: Submit order',
  '  W->>S: POST /orders',
  '  loop validate each field',
  '    S->>S: check constraints',
  '  end',
  '  alt all valid',
  '    S->>DB: INSERT order',
  '    DB-->>S: row id',
  '    S-->>W: 201 Created',
  '  else invalid',
  '    S-->>W: 400 Bad Request',
  '  end',
  '  Note over W,S: 5xx responses are retried',
  '  W-->>U: Show confirmation',
  '```',
  '',
  '## Class diagram — inheritance + associations',
  '',
  '```mermaid',
  'classDiagram',
  '  class Animal {',
  '    +String name',
  '    +int age',
  '    +makeSound() void',
  '  }',
  '  class Dog {',
  '    +String breed',
  '    +fetch() void',
  '  }',
  '  class Cat {',
  '    +boolean indoor',
  '    +scratch() void',
  '  }',
  '  class Toy {',
  '    +String kind',
  '  }',
  '  Animal <|-- Dog',
  '  Animal <|-- Cat',
  '  Dog ..> Toy : plays with',
  '```',
  '',
  '## State machine',
  '',
  '```mermaid',
  'stateDiagram-v2',
  '  [*] --> Idle',
  '  Idle --> Loading : fetch',
  '  Loading --> Success : 200',
  '  Loading --> Error : 4xx / 5xx',
  '  Error --> Loading : retry',
  '  Success --> Idle : reset',
  '  Success --> [*]',
  '```',
  '',
  '## Entity relationship',
  '',
  '```mermaid',
  'erDiagram',
  '  CUSTOMER ||--o{ ORDER : places',
  '  ORDER ||--|{ LINE_ITEM : contains',
  '  PRODUCT ||--o{ LINE_ITEM : "ordered in"',
  '  CUSTOMER {',
  '    string name',
  '    string email',
  '  }',
  '  ORDER {',
  '    int id',
  '    date created',
  '  }',
  '```',
  '',
  '## Gantt — a release plan',
  '',
  '```mermaid',
  'gantt',
  '  title Release plan',
  '  dateFormat YYYY-MM-DD',
  '  section Design',
  '  Spec        :done,   des1, 2026-07-01, 5d',
  '  Review      :active, des2, after des1, 3d',
  '  section Build',
  '  Core        :crit,   2026-07-09, 7d',
  '  Docs        :        2026-07-14, 4d',
  '```',
  '',
  '## Git graph',
  '',
  '```mermaid',
  'gitGraph',
  '  commit id: "init"',
  '  branch develop',
  '  checkout develop',
  '  commit id: "fence seam"',
  '  commit id: "mermaid pkg"',
  '  checkout main',
  '  merge develop',
  '  commit id: "release"',
  '```',
  '',
  '## Pie chart',
  '',
  '```mermaid',
  'pie showData title Bundle (kB, gzip)',
  '  "vue-markdown-mermaid" : 2',
  '  "Mermaid (lazy chunk)" : 500',
  '  "Cocoar UI" : 40',
  '```',
  '',
  '## Mindmap',
  '',
  '```mermaid',
  'mindmap',
  '  root((Markdown diagrams))',
  '    Wire format',
  '      fenced code block',
  '      portable / degrades',
  '    Engine',
  '      pluggable registry',
  '      lazy Mermaid',
  '      Cocoar themed',
  '    Future',
  '      BPMN',
  '      PlantUML',
  '```',
  '',
  '## A normal code block is untouched',
  '',
  '```ts',
  'const x: number = 1;',
  '```',
  '',
  '## Invalid diagrams degrade gracefully',
  '',
  '```mermaid',
  'flowchart LR',
  '  A --> B -->',
  '  this is not valid',
  '```',
].join('\n');

const value = ref(source);

const viewerDoc = computed(() => parse(value.value));
</script>

<template>
  <div class="mmd">
    <p class="mmd__hint">
      Edit the markdown on the left — the viewer on the right re-renders. Mermaid
      is loaded lazily on first diagram. Diagrams are <strong>zoomable</strong>:
      use the <strong>+ / − / ⤢</strong> buttons (or <strong>Ctrl/⌘ + wheel</strong>)
      to zoom, drag to pan, double-click to reset. Plain scrolling still scrolls
      the page. Try breaking a diagram to see the error fallback.
    </p>

    <div class="mmd__split">
      <div class="mmd__pane">
        <div class="mmd__label">Raw markdown</div>
        <textarea v-model="value" class="mmd__editor" spellcheck="false" />
      </div>

      <div class="mmd__pane">
        <div class="mmd__label">Viewer (<code>createMermaidFenceRenderers({ zoomable: true })</code>)</div>
        <div class="mmd__viewer-frame">
          <CoarMarkdown :doc="viewerDoc" :fence-renderers="fenceRenderers" />
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
