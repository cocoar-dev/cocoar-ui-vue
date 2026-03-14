<script setup lang="ts">
import { ref } from 'vue';
import { CoarTag, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const activeTags = ref(['vue', 'typescript']);

function toggleTag(tag: string) {
  const i = activeTags.value.indexOf(tag);
  if (i >= 0) activeTags.value.splice(i, 1);
  else activeTags.value.push(tag);
}

const tags = ref(['Vue 3', 'TypeScript', 'Vite', 'Pinia', 'TailwindCSS']);

function removeTag(tag: string) {
  tags.value = tags.value.filter(t => t !== tag);
}

const codeBasic = `<CoarTag variant="info">Info</CoarTag>
<CoarTag variant="success">Success</CoarTag>
<CoarTag variant="warning">Warning</CoarTag>`;

const codeCloseable = `<CoarTag variant="info" closable @closed="removeTag(tag)">
  {{ tag }}
</CoarTag>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Tag</h1>
      <p class="page-description">
        Tags are labels for categorizing, labeling, or marking content. Unlike badges (used for counts and status dots),
        tags are for metadata, categories, and selections.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarTag } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Color Variants</h3>
          <p class="example-description">Six semantic color variants for different contexts.</p>
          <div class="example-demo demo-row">
            <CoarTag variant="neutral">Neutral</CoarTag>
            <CoarTag variant="info">Info</CoarTag>
            <CoarTag variant="success">Success</CoarTag>
            <CoarTag variant="warning">Warning</CoarTag>
            <CoarTag variant="error">Error</CoarTag>
            <CoarTag variant="accent">Accent</CoarTag>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">Three sizes for different display contexts.</p>
          <div class="example-demo demo-row demo-row--align-end">
            <CoarTag variant="info" size="s">Small</CoarTag>
            <CoarTag variant="info" size="m">Medium</CoarTag>
            <CoarTag variant="info" size="l">Large</CoarTag>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Closeable Tags</h3>
          <p class="example-description">Add a close button to allow tag removal.</p>
          <div class="example-demo demo-row">
            <CoarTag
              v-for="tag in tags"
              :key="tag"
              variant="info"
              closable
              @closed="removeTag(tag)"
            >{{ tag }}</CoarTag>
            <span v-if="tags.length === 0" class="coar-body-small" style="color: var(--coar-text-neutral-tertiary)">All tags removed</span>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeCloseable" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Selectable Tags</h3>
          <p class="example-description">Toggle tags between active and inactive states.</p>
          <div class="example-demo demo-row">
            <CoarTag
              v-for="tech in ['vue', 'typescript', 'vite', 'pinia']"
              :key="tech"
              :variant="activeTags.includes(tech) ? 'info' : 'neutral'"
              style="cursor: pointer"
              @click="toggleTag(tech)"
            >{{ tech }}</CoarTag>
          </div>
          <p class="demo-value">Active: {{ activeTags.join(', ') || 'none' }}</p>
        </CoarCard>

        <CoarCard elevated>
          <h3>Tag Groups</h3>
          <p class="example-description">Group tags to label or categorize content.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <div>
              <p class="coar-body-small" style="color: var(--coar-text-neutral-secondary); margin: 0 0 var(--coar-spacing-xs)">Status</p>
              <div class="demo-row" style="margin: 0">
                <CoarTag variant="success">Active</CoarTag>
                <CoarTag variant="warning">Pending</CoarTag>
                <CoarTag variant="error">Expired</CoarTag>
              </div>
            </div>
            <div>
              <p class="coar-body-small" style="color: var(--coar-text-neutral-secondary); margin: 0 0 var(--coar-spacing-xs)">Technologies</p>
              <div class="demo-row" style="margin: 0">
                <CoarTag variant="accent">Vue 3</CoarTag>
                <CoarTag variant="accent">TypeScript</CoarTag>
                <CoarTag variant="accent">Vite</CoarTag>
              </div>
            </div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Tag API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>variant</code></td><td><code>'neutral' | 'info' | 'success' | 'warning' | 'error' | 'brand'</code></td><td><code>'neutral'</code></td><td>Tag color variant</td></tr>
              <tr><td><code>size</code></td><td><code>'s' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Tag size</td></tr>
              <tr><td><code>closable</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Show close button</td></tr>
            </tbody>
          </table>
          <h4>Events</h4>
          <table class="api-table">
            <thead><tr><th>Event</th><th>Description</th></tr></thead>
            <tbody><tr><td><code>closed</code></td><td>Emitted when the close button is clicked</td></tr></tbody>
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
h4 { margin: var(--coar-spacing-m) 0 var(--coar-spacing-xs); font-size: var(--coar-body-base-size); font-weight: var(--coar-body-base-bold-weight); }
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }
</style>
