<script setup lang="ts">
import { CoarAvatar, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const codeBasic = `<CoarAvatar name="John Doe" />
<CoarAvatar src="/avatar.jpg" name="Jane Smith" />`;
const codeSizes = `<CoarAvatar name="AB" size="xs" />
<CoarAvatar name="AB" size="s" />
<CoarAvatar name="AB" size="m" />
<CoarAvatar name="AB" size="l" />
<CoarAvatar name="AB" size="xl" />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Avatar</h1>
      <p class="page-description">
        Avatars represent users or entities with images or initials. They support multiple sizes, shapes,
        and automatically fall back to initials when images are unavailable.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarAvatar } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">Displays initials automatically from the <code>name</code> prop.</p>
          <div class="example-demo demo-row">
            <CoarAvatar name="John Doe" />
            <CoarAvatar name="Jane Smith" />
            <CoarAvatar name="Alice" />
            <CoarAvatar name="Bob Wilson" />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>With Image</h3>
          <p class="example-description">When <code>src</code> is provided, the image is displayed. Falls back to initials on error.</p>
          <div class="example-demo demo-row">
            <CoarAvatar src="https://i.pravatar.cc/150?img=1" name="User One" />
            <CoarAvatar src="https://i.pravatar.cc/150?img=2" name="User Two" />
            <CoarAvatar src="https://i.pravatar.cc/150?img=3" name="User Three" />
            <CoarAvatar src="https://invalid-url.xyz/broken.jpg" name="Broken Image" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">Five sizes from compact <code>xs</code> to prominent <code>xl</code>.</p>
          <div class="example-demo demo-row demo-row--align-end">
            <div class="size-item"><CoarAvatar name="AB" size="xs" /><span class="size-label">xs</span></div>
            <div class="size-item"><CoarAvatar name="AB" size="s" /><span class="size-label">s</span></div>
            <div class="size-item"><CoarAvatar name="AB" size="m" /><span class="size-label">m</span></div>
            <div class="size-item"><CoarAvatar name="AB" size="l" /><span class="size-label">l</span></div>
            <div class="size-item"><CoarAvatar name="AB" size="xl" /><span class="size-label">xl</span></div>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeSizes" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Shapes</h3>
          <p class="example-description">Circle (default) and square shapes.</p>
          <div class="example-demo demo-row">
            <div class="shape-item"><CoarAvatar name="JD" shape="circle" size="l" /><span class="size-label">circle</span></div>
            <div class="shape-item"><CoarAvatar name="JD" shape="square" size="l" /><span class="size-label">square</span></div>
            <div class="shape-item"><CoarAvatar src="https://i.pravatar.cc/150?img=5" name="JD" shape="circle" size="l" /><span class="size-label">circle + image</span></div>
            <div class="shape-item"><CoarAvatar src="https://i.pravatar.cc/150?img=5" name="JD" shape="square" size="l" /><span class="size-label">square + image</span></div>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Avatar Group</h3>
          <p class="example-description">Stack multiple avatars together with negative margin.</p>
          <div class="example-demo">
            <div class="avatar-stack">
              <CoarAvatar src="https://i.pravatar.cc/150?img=10" name="User A" size="m" />
              <CoarAvatar src="https://i.pravatar.cc/150?img=11" name="User B" size="m" />
              <CoarAvatar src="https://i.pravatar.cc/150?img=12" name="User C" size="m" />
              <CoarAvatar src="https://i.pravatar.cc/150?img=13" name="User D" size="m" />
              <CoarAvatar name="+5" size="m" />
            </div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Avatar API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>name</code></td><td><code>string</code></td><td><code>''</code></td><td>User's name (used for initials fallback)</td></tr>
              <tr><td><code>src</code></td><td><code>string</code></td><td><code>undefined</code></td><td>Image URL</td></tr>
              <tr><td><code>size</code></td><td><code>'xs' | 's' | 'm' | 'l' | 'xl'</code></td><td><code>'m'</code></td><td>Avatar size</td></tr>
              <tr><td><code>shape</code></td><td><code>'circle' | 'square'</code></td><td><code>'circle'</code></td><td>Avatar shape</td></tr>
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

.size-item, .shape-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--coar-spacing-xs);
}

.size-label {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
}

.avatar-stack {
  display: flex;
  align-items: center;
}

.avatar-stack > * + * {
  margin-left: -8px;
}

.avatar-stack > * {
  border: 2px solid var(--coar-background-neutral-primary);
  border-radius: 50%;
}
</style>
