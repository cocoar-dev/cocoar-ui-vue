<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarCard, CoarTextInput, CoarIcon, CoarNote, CORE_ICONS } from '@cocoar/vue-ui';

const search = ref('');
const copiedIcon = ref<string | null>(null);

const allIcons = Object.keys(CORE_ICONS);

const filteredIcons = computed(() => {
  const q = search.value.toLowerCase().trim();
  return q ? allIcons.filter(name => name.includes(q)) : allIcons;
});

function copyIconName(name: string) {
  navigator.clipboard.writeText(name).catch(() => {});
  copiedIcon.value = name;
  setTimeout(() => { copiedIcon.value = null; }, 1500);
}

const sizes = ['xs', 's', 'm', 'l', 'xl'] as const;
const sizeLabels: Record<string, string> = { xs: '12px', s: '16px', m: '20px', l: '24px', xl: '32px' };
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Icons</h1>
      <p class="page-description">
        A flexible icon system with built-in SVG icons. Icons support multiple sizes, colors, rotation, and animations.
      </p>
    </header>

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated class="gallery-card">
          <h3>Icon Gallery</h3>
          <p class="example-description">Browse all {{ allIcons.length }} available icons. Click an icon to copy its name.</p>
          <div class="search-wrapper">
            <CoarTextInput v-model="search" placeholder="Search icons..." :clearable="true" />
          </div>

          <div v-if="filteredIcons.length > 0" class="icons-grid">
            <button
              v-for="icon in filteredIcons"
              :key="icon"
              class="icon-item"
              :class="{ 'icon-item--copied': copiedIcon === icon }"
              :title="`Click to copy: ${icon}`"
              @click="copyIconName(icon)"
            >
              <CoarIcon :name="icon" size="l" />
              <span class="icon-name">{{ icon }}</span>
              <span v-if="copiedIcon === icon" class="icon-copied">Copied!</span>
            </button>
          </div>
          <p v-else class="no-results coar-body-small">No icons match "{{ search }}"</p>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Sizes & Colors</h2>
      <p class="component-section-description">Icons come in 5 preset sizes and can use any valid CSS color value.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">5 preset sizes plus support for custom CSS values.</p>
          <div class="demo-row demo-row--align-end" style="gap: var(--coar-spacing-l)">
            <div v-for="size in sizes" :key="size" class="size-item">
              <CoarIcon name="settings" :size="size" />
              <span class="size-label">{{ size }} ({{ sizeLabels[size] }})</span>
            </div>
            <div class="size-item">
              <CoarIcon name="settings" size="48px" />
              <span class="size-label">custom (48px)</span>
            </div>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Colors</h3>
          <p class="example-description">Icons inherit color by default. Override with any valid CSS color value.</p>
          <div class="demo-row" style="gap: var(--coar-spacing-l)">
            <div class="color-item"><CoarIcon name="check" size="l" color="green" /><span class="color-label">green</span></div>
            <div class="color-item"><CoarIcon name="x" size="l" color="red" /><span class="color-label">red</span></div>
            <div class="color-item"><CoarIcon name="triangle-alert" size="l" color="orange" /><span class="color-label">orange</span></div>
            <div class="color-item"><CoarIcon name="circle-help" size="l" color="blue" /><span class="color-label">blue</span></div>
            <div class="color-item"><CoarIcon name="settings" size="l" color="#888" /><span class="color-label">#888</span></div>
            <div class="color-item"><CoarIcon name="user" size="l" color="var(--coar-text-accent-primary)" /><span class="color-label">accent</span></div>
          </div>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Rotation & Animation</h2>
      <p class="component-section-description">Rotate icons to any angle and add spinning animations.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Rotation</h3>
          <p class="example-description">Rotate icons to any angle using the <code>rotate</code> prop.</p>
          <div class="demo-row" style="gap: var(--coar-spacing-l)">
            <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="0" /><span class="rotation-label">0°</span></div>
            <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="90" /><span class="rotation-label">90°</span></div>
            <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="180" /><span class="rotation-label">180°</span></div>
            <div class="rotation-item"><CoarIcon name="chevron-right" size="l" :rotate="270" /><span class="rotation-label">270°</span></div>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Spin Animation</h3>
          <p class="example-description">Enable continuous spinning for loading indicators.</p>
          <div class="demo-row" style="gap: var(--coar-spacing-xl); align-items: flex-start; margin-top: var(--coar-spacing-s)">
            <div class="spin-item">
              <CoarIcon name="loader-circle" size="xl" :spin="true" />
              <span class="coar-body-small">Loading...</span>
            </div>
            <div class="spin-item">
              <CoarIcon name="settings" size="l" :spin="true" />
              <span class="coar-body-small">Processing</span>
            </div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Icon API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>name</code></td><td><code>string</code></td><td><code>—</code></td><td>Icon name from the registered icon set</td></tr>
              <tr><td><code>size</code></td><td><code>'xs' | 's' | 'm' | 'l' | 'xl' | string</code></td><td><code>'m'</code></td><td>Icon size (preset or custom CSS value)</td></tr>
              <tr><td><code>color</code></td><td><code>string</code></td><td><code>'currentColor'</code></td><td>Icon color (any valid CSS color)</td></tr>
              <tr><td><code>rotate</code></td><td><code>number</code></td><td><code>0</code></td><td>Rotation angle in degrees</td></tr>
              <tr><td><code>spin</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Enable continuous spinning animation</td></tr>
              <tr><td><code>source</code></td><td><code>string</code></td><td><code>'default'</code></td><td>Icon source/set name</td></tr>
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

.search-wrapper { margin-bottom: var(--coar-spacing-m); }

.icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: var(--coar-spacing-xs);
  max-height: 480px;
  overflow-y: auto;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--coar-spacing-s);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--coar-radius-s);
  cursor: pointer;
  transition: background var(--coar-duration-fast) var(--coar-ease-out);
  color: var(--coar-text-neutral-primary);
  position: relative;
}

.icon-item:hover {
  background: var(--coar-background-neutral-tertiary);
  border-color: var(--coar-border-neutral-secondary);
}

.icon-item--copied {
  background: var(--coar-background-semantic-success-subtle);
  border-color: var(--coar-background-semantic-success-bold);
}

.icon-name {
  font-size: 10px;
  color: var(--coar-text-neutral-tertiary);
  text-align: center;
  word-break: break-all;
  font-family: 'Consolas', 'Monaco', monospace;
}

.icon-copied {
  position: absolute;
  bottom: 2px;
  font-size: 9px;
  color: var(--coar-text-neutral-secondary);
  font-weight: 600;
}

.no-results { color: var(--coar-text-neutral-secondary); margin-top: var(--coar-spacing-m); }

.size-item, .color-item, .rotation-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.size-label, .color-label, .rotation-label {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary);
  font-family: monospace;
  white-space: nowrap;
}

.spin-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--coar-spacing-s);
}

.gallery-card { grid-column: 1 / -1; }
</style>
