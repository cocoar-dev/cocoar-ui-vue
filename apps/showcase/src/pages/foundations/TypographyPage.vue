<script setup lang="ts">
import { CoarCard } from '@cocoar/vue-ui';

const typeScale = [
  { label: 'DISPLAY', class: 'coar-display', text: 'Display Text', spec: 'Inter / 72px / Bold' },
  { label: 'TITLE', class: 'coar-title', text: 'Title Text', spec: 'Inter / 48px / Bold' },
  { label: 'SUBTITLE', class: 'coar-subtitle', text: 'Subtitle Text', spec: 'Inter / 32px / Regular' },
  { label: 'HEADING', class: 'coar-heading', text: 'Heading Text', spec: 'Poppins / 24px / SemiBold' },
  { label: 'SUBHEADING', class: 'coar-subheading', text: 'Subheading Text', spec: 'Poppins / 20px / Regular' },
  { label: 'BODY', class: 'coar-body', text: 'Body Text — The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 16px / Regular' },
  { label: 'BODY BOLD', class: 'coar-body-bold', text: 'Body Bold — The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 16px / Bold' },
  { label: 'BODY SMALL', class: 'coar-body-small', text: 'Body Small — The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 14px / Regular' },
  { label: 'BODY SMALL BOLD', class: 'coar-body-small-bold', text: 'Body Small Bold — The quick brown fox jumps over the lazy dog.', spec: 'Poppins / 14px / Bold' },
  { label: 'CAPTION', class: 'coar-caption', text: 'Caption Text', spec: 'Poppins / 12px / Medium / Uppercase' },
  { label: 'FOOTNOTE', class: 'coar-footnote', text: 'Footnote Text — Small print and legal text.', spec: 'Poppins / 10px / Regular' },
];
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Typography</h1>
      <p class="page-description">Our type system creates clear visual hierarchy and ensures readability across all interfaces.</p>
    </header>

    <div class="examples-content">
      <h2 class="component-section-title">Type Scale</h2>
      <p class="component-section-description">All typography styles available in the design system.</p>

      <div class="type-grid">
        <CoarCard v-for="item in typeScale" :key="item.label" padding="m" elevated variant="info">
          <span class="type-label">{{ item.label }}</span>
          <p :class="item.class" class="type-sample">{{ item.text }}</p>
          <span class="type-spec">{{ item.spec }}</span>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Usage Example</h2>
      <p class="component-section-description">How typography creates hierarchy in a real layout.</p>

      <div class="examples-grid">
        <CoarCard padding="l" elevated variant="info" class="article-example">
          <h1 class="coar-title" style="margin: 0 0 var(--coar-spacing-xs)">Article Title</h1>
          <p class="coar-subtitle" style="color: var(--coar-text-neutral-secondary); margin: 0 0 var(--coar-spacing-m)">
            A compelling subtitle that draws readers in
          </p>
          <p class="coar-body" style="margin: 0 0 var(--coar-spacing-s)">
            This is body text that makes up the main content of an article or page. It should be easy to read and scan.
            Good typography helps users understand the content hierarchy at a glance.
          </p>
          <p class="coar-body" style="margin: 0 0 var(--coar-spacing-m)">
            <span class="coar-body-bold">Important:</span> Use bold text sparingly to emphasize key points.
          </p>
          <p class="coar-caption" style="margin: 0; color: var(--coar-text-neutral-tertiary)">CATEGORY · 5 MIN READ</p>
        </CoarCard>
      </div>

      <h2 class="component-section-title">CSS Classes Reference</h2>
      <p class="component-section-description">Apply these classes directly to HTML elements.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <table class="api-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Description</th>
                <th>Token</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in typeScale" :key="item.label">
                <td><code>.{{ item.class }}</code></td>
                <td>{{ item.label }}</td>
                <td style="color: var(--coar-text-neutral-tertiary)">{{ item.spec }}</td>
              </tr>
            </tbody>
          </table>
        </CoarCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--coar-spacing-m);
  margin-bottom: var(--coar-spacing-l);
}

.type-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--coar-text-neutral-tertiary);
  margin-bottom: var(--coar-spacing-xs);
}

.type-sample {
  margin: 0 0 var(--coar-spacing-xs);
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-spec {
  display: block;
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: 'Consolas', 'Monaco', monospace;
}

.article-example {
  max-width: 680px;
}
</style>
