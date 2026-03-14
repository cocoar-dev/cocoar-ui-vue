<script setup lang="ts">
import { ref } from 'vue';
import { CoarSwitch, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const darkMode = ref(false);
const notifications = ref(true);
const autoSave = ref(false);

const codeBasic = `<CoarSwitch v-model="enabled" label="Enable feature" />`;
const codeHint = `<CoarSwitch v-model="enabled" label="Dark mode" hint="Switch between light and dark themes" />`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Switch</h1>
      <p class="page-description">
        Switches represent boolean on/off states. Use switches instead of checkboxes when the change takes effect immediately
        without requiring confirmation.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarSwitch } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">Simple on/off toggle with a label.</p>
          <div class="example-demo">
            <CoarSwitch v-model="darkMode" label="Dark mode" />
          </div>
          <p class="demo-value">Value: {{ darkMode }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>With Hint Text</h3>
          <p class="example-description">Add a hint for additional context.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <CoarSwitch v-model="notifications" label="Push notifications" hint="Receive notifications about account activity." />
            <CoarSwitch v-model="autoSave" label="Auto-save" hint="Automatically save changes every 5 minutes." />
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeHint" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>States</h3>
          <p class="example-description">Disabled on, disabled off, required, and error states.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarSwitch :model-value="true" label="Disabled (on)" :disabled="true" />
            <CoarSwitch :model-value="false" label="Disabled (off)" :disabled="true" />
            <CoarSwitch :model-value="false" label="Required switch" :required="true" />
            <CoarSwitch :model-value="false" label="With error" error="This setting must be enabled" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Sizes</h3>
          <p class="example-description">Three sizes to match different layout densities.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-s)">
            <CoarSwitch :model-value="true" size="s" label="Small switch" />
            <CoarSwitch :model-value="true" size="m" label="Medium switch (default)" />
            <CoarSwitch :model-value="true" size="l" label="Large switch" />
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Settings Panel Example</h3>
          <p class="example-description">Typical use case in a settings panel.</p>
          <div class="settings-panel">
            <div class="settings-row">
              <div class="settings-info">
                <span class="coar-body-small" style="font-weight: var(--coar-body-base-bold-weight)">Email notifications</span>
                <span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Get emails about activity</span>
              </div>
              <CoarSwitch :model-value="true" />
            </div>
            <div class="settings-row">
              <div class="settings-info">
                <span class="coar-body-small" style="font-weight: var(--coar-body-base-bold-weight)">Marketing emails</span>
                <span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Promotions and updates</span>
              </div>
              <CoarSwitch :model-value="false" />
            </div>
            <div class="settings-row">
              <div class="settings-info">
                <span class="coar-body-small" style="font-weight: var(--coar-body-base-bold-weight)">Two-factor auth</span>
                <span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Enhanced security</span>
              </div>
              <CoarSwitch :model-value="true" />
            </div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Switch API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Switch on/off state</td></tr>
              <tr><td><code>label</code></td><td><code>string</code></td><td><code>''</code></td><td>Label text</td></tr>
              <tr><td><code>hint</code></td><td><code>string</code></td><td><code>''</code></td><td>Additional description</td></tr>
              <tr><td><code>error</code></td><td><code>string</code></td><td><code>''</code></td><td>Error message</td></tr>
              <tr><td><code>size</code></td><td><code>'s' | 'm' | 'l'</code></td><td><code>'m'</code></td><td>Switch size</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the switch</td></tr>
              <tr><td><code>required</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Mark as required</td></tr>
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

.settings-panel { display: flex; flex-direction: column; gap: 0; }

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--coar-spacing-s) 0;
  border-bottom: 1px solid var(--coar-border-neutral-secondary);
}

.settings-row:last-child { border-bottom: none; }

.settings-info { display: flex; flex-direction: column; gap: 2px; }
</style>
