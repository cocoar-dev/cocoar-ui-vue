<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarCard, CoarNote, CoarCodeBlock } from '@cocoar/vue-ui';

const isLoading = ref(false);
const isLoadingEnd = ref(false);

function simulateLoading() {
  isLoading.value = true;
  setTimeout(() => { isLoading.value = false; }, 2000);
}

function simulateLoadingEnd() {
  isLoadingEnd.value = true;
  setTimeout(() => { isLoadingEnd.value = false; }, 2000);
}

const codeVariants = `<CoarButton variant="primary">Primary</CoarButton>
<CoarButton variant="secondary">Secondary</CoarButton>
<CoarButton variant="tertiary">Tertiary</CoarButton>
<CoarButton variant="danger">Danger</CoarButton>
<CoarButton variant="ghost">Ghost</CoarButton>`;

const codeSizes = `<CoarButton size="xs">Extra Small</CoarButton>
<CoarButton size="s">Small</CoarButton>
<CoarButton size="m">Medium</CoarButton>
<CoarButton size="l">Large</CoarButton>`;

const codeIcons = `<CoarButton icon-start="plus">Add Item</CoarButton>
<CoarButton variant="secondary" icon-end="chevron-right">Next</CoarButton>
<CoarButton variant="danger" icon-start="trash-2">Delete</CoarButton>`;

const codeLoading = `<CoarButton :loading="isLoading" @click="handleClick">Save</CoarButton>`;

const codeDisabled = `<CoarButton :disabled="true">Disabled</CoarButton>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Button</h1>
      <p class="page-description">Buttons trigger actions and communicate what will happen when pressed.</p>
    </header>

    <CoarCodeBlock
      variant="info"
      elevated
      class="page-import"
      code="import { CoarButton } from '@cocoar/vue-ui';"
      language="typescript"
      :collapsible="false"
    />

    <div class="examples-content">
      <h2 class="component-section-title">Variants</h2>
      <p class="component-section-description">Choose the appropriate variant based on the action's importance and context.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>All Variants</h3>
          <p class="example-description">Five variants for different levels of emphasis.</p>
          <div class="example-demo demo-row">
            <CoarButton variant="primary">Primary</CoarButton>
            <CoarButton variant="secondary">Secondary</CoarButton>
            <CoarButton variant="tertiary">Tertiary</CoarButton>
            <CoarButton variant="danger">Danger</CoarButton>
            <CoarButton variant="ghost">Ghost</CoarButton>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeVariants" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Variant Usage</h3>
          <p class="example-description">When to use each variant.</p>
          <div class="example-demo variant-guide">
            <div><strong>Primary</strong> — Main call-to-action. Use sparingly, typically once per view.</div>
            <div><strong>Secondary</strong> — Alternative actions. Pairs well with primary buttons.</div>
            <div><strong>Tertiary</strong> — Low-emphasis actions with brand color hint.</div>
            <div><strong>Danger</strong> — Destructive actions like delete or remove.</div>
            <div><strong>Ghost</strong> — Minimal emphasis, often for cancel or dismiss.</div>
          </div>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Sizes</h2>
      <p class="component-section-description">Four sizes to fit different contexts and layouts.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Size Comparison</h3>
          <p class="example-description">Buttons aligned at baseline to show height differences.</p>
          <div class="example-demo demo-row demo-row--align-end">
            <CoarButton size="xs">Extra Small</CoarButton>
            <CoarButton size="s">Small</CoarButton>
            <CoarButton size="m">Medium</CoarButton>
            <CoarButton size="l">Large</CoarButton>
          </div>
          <p class="demo-value"><code>xs</code> 27px | <code>s</code> 32px | <code>m</code> 40px | <code>l</code> 48px</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeSizes" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>With Icons</h3>
          <p class="example-description">Add icons before or after the label to enhance meaning.</p>
          <div class="example-demo demo-row">
            <CoarButton icon-start="plus">Add Item</CoarButton>
            <CoarButton variant="secondary" icon-end="chevron-right">Next</CoarButton>
            <CoarButton variant="tertiary" icon-start="clipboard">Download</CoarButton>
            <CoarButton variant="danger" icon-start="trash-2">Delete</CoarButton>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeIcons" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>
      </div>

      <h2 class="component-section-title">States</h2>
      <p class="component-section-description">Loading and disabled states for different scenarios.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Loading State</h3>
          <p class="example-description">Show a spinner while an async action is in progress. Click to test.</p>
          <div class="example-demo">
            <div class="loading-row">
              <span class="loading-label">With start icon:</span>
              <CoarButton icon-start="check" :loading="isLoading" @click="simulateLoading">Save Changes</CoarButton>
            </div>
            <div class="loading-row">
              <span class="loading-label">Icon end:</span>
              <CoarButton icon-end="chevron-right" :loading="isLoadingEnd" @click="simulateLoadingEnd">Continue</CoarButton>
            </div>
          </div>
          <CoarNote variant="info">
            <strong>Loading:</strong> With icon, spinner replaces the icon. Without icon, spinner overlays the center.
          </CoarNote>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeLoading" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Disabled State</h3>
          <p class="example-description">Disable buttons when actions are not available.</p>
          <div class="example-demo demo-row">
            <CoarButton :disabled="true">Primary</CoarButton>
            <CoarButton variant="secondary" :disabled="true">Secondary</CoarButton>
            <CoarButton variant="tertiary" :disabled="true">Tertiary</CoarButton>
            <CoarButton variant="danger" :disabled="true">Danger</CoarButton>
            <CoarButton variant="ghost" :disabled="true">Ghost</CoarButton>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeDisabled" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Full Width</h3>
          <p class="example-description">Buttons can expand to fill their container.</p>
          <div class="example-demo" style="max-width: 360px">
            <CoarButton :full-width="true" style="margin-bottom: var(--coar-spacing-s)">Full Width Primary</CoarButton>
            <CoarButton variant="secondary" :full-width="true">Full Width Secondary</CoarButton>
          </div>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Accessibility</h2>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Keyboard Navigation</h3>
          <div class="keyboard-grid">
            <div class="keyboard-item"><kbd>Tab</kbd> <span>Move focus to button</span></div>
            <div class="keyboard-item"><kbd>Shift</kbd> + <kbd>Tab</kbd> <span>Move focus backward</span></div>
            <div class="keyboard-item"><kbd>Enter</kbd> <span>Activate button</span></div>
            <div class="keyboard-item"><kbd>Space</kbd> <span>Activate button</span></div>
          </div>
          <CoarNote variant="info" style="margin-top: var(--coar-spacing-m)">
            Disabled and loading buttons cannot be activated via keyboard.
          </CoarNote>
        </CoarCard>

        <CoarCard elevated>
          <h3>Screen Reader Support</h3>
          <ul style="margin: 0; padding-left: var(--coar-spacing-m); display: flex; flex-direction: column; gap: var(--coar-spacing-xs)">
            <li class="coar-body-small">Button text or aria-label announces on focus</li>
            <li class="coar-body-small">Disabled state properly communicated</li>
            <li class="coar-body-small">Loading state indicates button is busy</li>
            <li class="coar-body-small">Icon-only buttons should include aria-label</li>
            <li class="coar-body-small">Type attribute ensures correct form behavior</li>
          </ul>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Button API</summary>
        <div class="api-content">
          <h4>Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>variant</code></td><td><code>'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost'</code></td><td><code>'primary'</code></td><td>Button style variant</td></tr>
              <tr><td><code>size</code></td><td><code>'xs' | 's' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Button size</td></tr>
              <tr><td><code>iconStart</code></td><td><code>string</code></td><td><code>undefined</code></td><td>Icon name before label</td></tr>
              <tr><td><code>iconEnd</code></td><td><code>string</code></td><td><code>undefined</code></td><td>Icon name after label</td></tr>
              <tr><td><code>loading</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Show loading spinner</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the button</td></tr>
              <tr><td><code>fullWidth</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Expand to fill container</td></tr>
              <tr><td><code>type</code></td><td><code>'button' | 'submit' | 'reset'</code></td><td><code>'button'</code></td><td>HTML button type</td></tr>
            </tbody>
          </table>
          <h4>Events</h4>
          <table class="api-table">
            <thead><tr><th>Event</th><th>Payload</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>click</code></td><td><code>MouseEvent</code></td><td>Emitted when clicked (not when disabled/loading)</td></tr>
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

h4 {
  margin: var(--coar-spacing-m) 0 var(--coar-spacing-s);
  font-size: var(--coar-body-base-size);
  font-weight: var(--coar-body-base-bold-weight);
}

.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }

.variant-guide {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-secondary);
}

.loading-row {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-m);
  margin-bottom: var(--coar-spacing-s);
}

.loading-label {
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-secondary);
  min-width: 100px;
}
</style>
