<script setup lang="ts">
/**
 * Renders a ` ```mermaid ` fenced code block as a diagram.
 *
 * Shape matches `@cocoar/vue-markdown`'s `FenceRendererProps` (`code` +
 * `language`) so it slots straight into the fence-renderer registry.
 *
 * Rendering is **client-only**: Mermaid needs a DOM to measure + lay out, so on
 * the server (and until mount) nothing is rendered. Mermaid itself is lazy —
 * loaded on first mount via {@link loadMermaid}. Invalid diagram source doesn't
 * throw up to the app: it degrades to an error box that still shows the raw
 * source, so no content is lost.
 */
import { onMounted, ref, watch } from 'vue';
import { renderMermaid } from './internal/mermaid-loader';
import {
  buildMermaidThemeVariables,
  makeCssColorResolver,
  readCssTokens,
} from './internal/theme-bridge';

const props = withDefaults(defineProps<{ code: string; language?: string }>(), {
  language: 'mermaid',
});

type Status = 'idle' | 'loading' | 'rendered' | 'error';

const container = ref<HTMLElement | null>(null);
const status = ref<Status>('idle');
const svg = ref('');
const errorMessage = ref('');

// Guards against out-of-order renders: a fast succession of `code` changes must
// only ever apply the newest result.
let renderToken = 0;

async function render(): Promise<void> {
  // SSR / pre-mount: defer to the client-side onMounted call.
  if (typeof window === 'undefined') return;

  const code = props.code?.trim() ?? '';
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
  } catch (err) {
    if (token !== renderToken) return;
    svg.value = '';
    errorMessage.value = err instanceof Error ? err.message : String(err);
    status.value = 'error';
  }
}

onMounted(render);
watch(() => props.code, render);
</script>

<template>
  <div ref="container" class="coar-mermaid" :data-status="status">
    <!-- Mermaid produces the SVG string; `securityLevel: 'strict'` sanitizes
         author labels, so v-html here is the intended, safe injection point. -->
    <div v-if="status === 'rendered'" class="coar-mermaid__svg" v-html="svg" />

    <div v-else-if="status === 'loading'" class="coar-mermaid__loading">
      Rendering diagram…
    </div>

    <div v-else-if="status === 'error'" class="coar-mermaid__error" role="alert">
      <p class="coar-mermaid__error-title">Diagram error</p>
      <p class="coar-mermaid__error-message">{{ errorMessage }}</p>
      <pre class="coar-mermaid__error-source">{{ code }}</pre>
    </div>
  </div>
</template>

<style>
.coar-mermaid {
  display: flex;
  justify-content: center;
  margin: var(--coar-spacing-m, 1rem) 0;
}

.coar-mermaid__svg {
  max-width: 100%;
}

.coar-mermaid__svg svg {
  max-width: 100%;
  height: auto;
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
