<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { CoarProgressBar, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const progress = ref(65);
const animatedProgress = ref(0);
let interval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  interval = setInterval(() => {
    animatedProgress.value = (animatedProgress.value + 1) % 101;
  }, 50);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});

const codeBasic = `<CoarProgressBar :value="65" />`;
const codeIndeterminate = `<CoarProgressBar indeterminate />`;
const codeVariants = `<CoarProgressBar :value="75" variant="info" />
<CoarProgressBar :value="75" variant="success" />
<CoarProgressBar :value="75" variant="warning" />
<CoarProgressBar :value="75" variant="error" />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Progress Bar</h1>
      <p class="page-description">
        Progress bars communicate the completion status of a task or process. Supports determinate, indeterminate,
        and multiple size/color variants.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarProgressBar } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Progress</h3>
          <p class="example-description">A determinate progress bar showing the completion percentage.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <CoarProgressBar :value="progress" />
            <div class="demo-row" style="margin: 0; gap: var(--coar-spacing-s)">
              <button class="adj-btn" @click="progress = Math.max(0, progress - 10)">-10</button>
              <span class="coar-body-small" style="min-width: 40px; text-align: center">{{ progress }}%</span>
              <button class="adj-btn" @click="progress = Math.min(100, progress + 10)">+10</button>
            </div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Indeterminate</h3>
          <p class="example-description">Use when progress cannot be determined (loading, processing).</p>
          <div class="example-demo">
            <CoarProgressBar indeterminate />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeIndeterminate" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Color Variants</h3>
          <p class="example-description">Semantic color variants matching other components.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <div><span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Default</span><CoarProgressBar :value="75" /></div>
            <div><span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Info</span><CoarProgressBar :value="75" variant="info" /></div>
            <div><span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Success</span><CoarProgressBar :value="75" variant="success" /></div>
            <div><span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Warning</span><CoarProgressBar :value="75" variant="warning" /></div>
            <div><span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Error</span><CoarProgressBar :value="75" variant="error" /></div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeVariants" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">Three height sizes for different visual weights.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <div><span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Small</span><CoarProgressBar :value="60" size="s" /></div>
            <div><span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Medium (default)</span><CoarProgressBar :value="60" size="m" /></div>
            <div><span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Large</span><CoarProgressBar :value="60" size="l" /></div>
          </div>
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Live Progress Example</h3>
          <p class="example-description">Animated progress for a visual reference.</p>
          <div class="example-demo">
            <div class="progress-label">
              <span class="coar-body-small">Processing...</span>
              <span class="coar-body-small">{{ animatedProgress }}%</span>
            </div>
            <CoarProgressBar :value="animatedProgress" variant="info" size="l" />
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Progress Bar API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>value</code></td><td><code>number</code></td><td><code>0</code></td><td>Progress value (0–100)</td></tr>
              <tr><td><code>indeterminate</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Show animated indeterminate state</td></tr>
              <tr><td><code>variant</code></td><td><code>'default' | 'info' | 'success' | 'warning' | 'error'</code></td><td><code>'default'</code></td><td>Color variant</td></tr>
              <tr><td><code>size</code></td><td><code>'s' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Bar height</td></tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }

.adj-btn {
  padding: 4px 12px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: var(--coar-radius-s);
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  font-size: var(--coar-body-small-base-size);
}
.adj-btn:hover { background: var(--coar-background-neutral-tertiary); }

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--coar-spacing-xs);
}
</style>
