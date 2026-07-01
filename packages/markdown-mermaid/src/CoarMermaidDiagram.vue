<script setup lang="ts">
/**
 * Renders a ` ```mermaid ` fenced code block as a diagram.
 *
 * Shape matches `@cocoar/vue-markdown`'s `FenceRendererProps` (`code` +
 * `language`) so it slots straight into the fence-renderer registry.
 *
 * Rendering is **client-only**: Mermaid needs a DOM to measure + lay out, so on
 * the server (and until mount) nothing is rendered. Mermaid itself is lazy —
 * loaded on first mount via {@link renderMermaid}. Invalid diagram source doesn't
 * throw up to the app: it degrades to an error box that still shows the raw
 * source, so no content is lost.
 *
 * With `zoomable`, the diagram is placed in a fixed-height viewport with
 * wheel-zoom + drag-pan + double-click-to-reset (see {@link createPanZoom}).
 */
import { onBeforeUnmount, onMounted, nextTick, ref, shallowRef, watch } from 'vue';
import { renderMermaid } from './internal/mermaid-loader';
import {
  buildMermaidThemeVariables,
  makeCssColorResolver,
  readCssTokens,
} from './internal/theme-bridge';
import { createPanZoom, type PanZoomHandle } from './internal/pan-zoom';

const props = withDefaults(
  defineProps<{ code: string; language?: string; zoomable?: boolean }>(),
  { language: 'mermaid', zoomable: false },
);

type Status = 'idle' | 'loading' | 'rendered' | 'error';

const container = ref<HTMLElement | null>(null);
const viewport = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);
const status = ref<Status>('idle');
const svg = ref('');
const errorMessage = ref('');

// Guards against out-of-order renders: a fast succession of `code` changes must
// only ever apply the newest result.
let renderToken = 0;
const panZoom = shallowRef<PanZoomHandle | null>(null);

function teardownPanZoom(): void {
  panZoom.value?.destroy();
  panZoom.value = null;
}

async function render(): Promise<void> {
  // SSR / pre-mount: defer to the client-side onMounted call.
  if (typeof window === 'undefined') return;

  const code = props.code?.trim() ?? '';
  teardownPanZoom();
  if (!code) {
    status.value = 'idle';
    svg.value = '';
    errorMessage.value = '';
    return;
  }

  const token = ++renderToken;
  status.value = 'loading';

  try {
    const rendered = await renderMermaid(
      () => ({
        theme: 'base',
        themeVariables: buildMermaidThemeVariables(
          readCssTokens(container.value),
          makeCssColorResolver(),
        ),
      }),
      code,
    );
    if (token !== renderToken) return; // superseded by a newer render

    svg.value = rendered;
    errorMessage.value = '';
    status.value = 'rendered';

    if (props.zoomable) {
      await nextTick();
      if (token === renderToken && viewport.value && content.value) {
        panZoom.value = createPanZoom(viewport.value, content.value);
      }
    }
  } catch (err) {
    if (token !== renderToken) return;
    svg.value = '';
    errorMessage.value = err instanceof Error ? err.message : String(err);
    status.value = 'error';
  }
}

onMounted(render);
watch(() => props.code, render);
onBeforeUnmount(teardownPanZoom);
</script>

<template>
  <div
    ref="container"
    class="coar-mermaid"
    :class="{ 'coar-mermaid--zoomable': zoomable }"
    :data-status="status"
  >
    <div ref="viewport" class="coar-mermaid__viewport">
      <!-- Mermaid produces the SVG string; `securityLevel: 'strict'` sanitizes
           author labels, so v-html here is the intended, safe injection point. -->
      <div
        v-if="status === 'rendered'"
        ref="content"
        class="coar-mermaid__svg"
        v-html="svg"
      />

      <div v-else-if="status === 'loading'" class="coar-mermaid__loading">
        Rendering diagram…
      </div>

      <div v-else-if="status === 'error'" class="coar-mermaid__error" role="alert">
        <p class="coar-mermaid__error-title">Diagram error</p>
        <p class="coar-mermaid__error-message">{{ errorMessage }}</p>
        <pre class="coar-mermaid__error-source">{{ code }}</pre>
      </div>
    </div>

    <div v-if="zoomable && status === 'rendered'" class="coar-mermaid__controls">
      <button type="button" title="Zoom out" aria-label="Zoom out" @click="panZoom?.zoomOut()">
        −
      </button>
      <button type="button" title="Zoom in" aria-label="Zoom in" @click="panZoom?.zoomIn()">
        +
      </button>
      <button type="button" title="Reset view (or double-click)" aria-label="Reset view" @click="panZoom?.reset()">
        ⤢
      </button>
    </div>
  </div>
</template>

<style>
.coar-mermaid {
  position: relative;
  margin: var(--coar-spacing-m, 1rem) 0;
}

.coar-mermaid__viewport {
  display: flex;
  justify-content: center;
}

.coar-mermaid__svg {
  max-width: 100%;
}

.coar-mermaid__svg svg {
  max-width: 100%;
  height: auto;
}

/* Zoomable: clip to a fixed-height viewport and let pan/zoom transform the SVG.
   No `touch-action: none` — one-finger touch must still scroll the page (zoom on
   touch is via the buttons), so a diagram never blocks scrolling on a tablet. */
.coar-mermaid--zoomable .coar-mermaid__viewport {
  position: relative;
  display: block;
  height: var(--coar-mermaid-height, 420px);
  overflow: hidden;
  border: 1px solid var(--coar-border-neutral-tertiary, #e2e2e2);
  border-radius: var(--coar-input-radius, 8px);
  background: var(--coar-background-neutral-primary, #fff);
  cursor: grab;
}

.coar-mermaid--zoomable .coar-mermaid__viewport.is-panning {
  cursor: grabbing;
}

.coar-mermaid--zoomable .coar-mermaid__svg {
  max-width: none;
  width: 100%;
  will-change: transform;
}

.coar-mermaid--zoomable .coar-mermaid__svg svg {
  max-width: none;
}

.coar-mermaid__controls {
  position: absolute;
  top: var(--coar-spacing-xs, 0.25rem);
  right: var(--coar-spacing-xs, 0.25rem);
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: var(--coar-input-radius, 8px);
  background: color-mix(in srgb, var(--coar-background-neutral-primary, #fff) 88%, transparent);
  border: 1px solid var(--coar-border-neutral-tertiary, #e2e2e2);
}

.coar-mermaid__controls button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: calc(var(--coar-input-radius, 8px) - 2px);
  background: transparent;
  color: var(--coar-text-neutral-secondary, #333);
  font-family: var(--coar-font-family-body, sans-serif);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.coar-mermaid__controls button:hover {
  background: var(--coar-background-neutral-secondary, #f5f5f5);
}

.coar-mermaid__loading {
  color: var(--coar-text-neutral-tertiary, #666);
  font-family: var(--coar-font-family-body, sans-serif);
  font-size: var(--coar-font-size-xs, 14px);
  padding: var(--coar-spacing-m, 1rem);
}

.coar-mermaid__error {
  width: 100%;
  border: 1px solid var(--coar-border-semantic-error, #dc2626);
  border-radius: var(--coar-input-radius, 8px);
  background: var(--coar-background-semantic-error-subtle, #fee2e2);
  padding: var(--coar-spacing-m, 1rem);
  font-family: var(--coar-font-family-body, sans-serif);
}

.coar-mermaid__error-title {
  margin: 0 0 var(--coar-spacing-xs, 0.25rem);
  font-weight: 600;
  color: var(--coar-text-semantic-error-bold, #991b1b);
}

.coar-mermaid__error-message {
  margin: 0 0 var(--coar-spacing-s, 0.5rem);
  color: var(--coar-text-semantic-error-subtle, #b91c1c);
  font-size: var(--coar-font-size-xs, 14px);
}

.coar-mermaid__error-source {
  margin: 0;
  padding: var(--coar-spacing-s, 0.5rem);
  overflow-x: auto;
  border-radius: var(--coar-input-radius, 8px);
  background: var(--coar-background-neutral-secondary, #f8f9fa);
  color: var(--coar-text-neutral-secondary, #333);
  font-size: var(--coar-font-size-xs, 14px);
  white-space: pre;
}
</style>
