<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarCard, CoarCodeBlock, useToast } from '@cocoar/vue-ui';

const toast = useToast();

function showSuccess() {
  toast.success('Changes saved successfully!', { title: 'Saved' });
}
function showError() {
  toast.error('Something went wrong. Please try again.', { title: 'Error' });
}
function showWarning() {
  toast.warning('Your session will expire in 5 minutes.', { title: 'Warning' });
}
function showInfo() {
  toast.info('A new version is available. Refresh to update.', { title: 'Update Available' });
}
function showNoTitle() {
  toast.success('File uploaded successfully.');
}
function showLong() {
  toast.info('This is a longer notification message that contains more detailed information about what just happened in the application.', {
    title: 'Detailed Message',
    duration: 6000,
  });
}
function showPersistent() {
  toast.warning('This notification stays until dismissed.', {
    title: 'Persistent',
    duration: 0,
  });
}

const codeSetup = `// main.ts — Register the plugin once
import { CoarOverlayPlugin } from '@cocoar/vue-ui';

createApp(App)
  .use(CoarOverlayPlugin)
  .mount('#app');

// Add toast container to your App.vue
// <CoarToastContainer />`;

const codeUsage = `<script setup lang="ts">
import { useToast } from '@cocoar/vue-ui';
const toast = useToast();

function save() {
  toast.success('Saved!', { title: 'Done' });
}
<\/script>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Toast</h1>
      <p class="page-description">Non-blocking notification messages for success, error, warning, and info states.</p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { useToast } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <h2 class="component-section-title">Variants</h2>
      <p class="component-section-description">Four semantic variants for different notification types. Click the buttons to trigger them.</p>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>All Variants</h3>
          <p class="example-description">Trigger different toast variants.</p>
          <div class="example-demo demo-row">
            <CoarButton variant="primary" @click="showSuccess">Success</CoarButton>
            <CoarButton variant="danger" @click="showError">Error</CoarButton>
            <CoarButton variant="secondary" @click="showWarning">Warning</CoarButton>
            <CoarButton variant="ghost" @click="showInfo">Info</CoarButton>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Without Title</h3>
          <p class="example-description">Toasts can show just the message without a title.</p>
          <div class="example-demo demo-row">
            <CoarButton @click="showNoTitle">Simple message</CoarButton>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Duration Control</h3>
          <p class="example-description">Control how long toasts stay on screen. Use 0 for persistent toasts.</p>
          <div class="example-demo demo-row">
            <CoarButton variant="secondary" @click="showLong">Long duration (6s)</CoarButton>
            <CoarButton variant="secondary" @click="showPersistent">Persistent (no auto-dismiss)</CoarButton>
          </div>
        </CoarCard>
      </div>

      <h2 class="component-section-title">Setup</h2>

      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Plugin & Container</h3>
          <p class="example-description">Register the overlay plugin and add <code>CoarToastContainer</code> to your app root.</p>
          <CoarCodeBlock :code="codeSetup" language="typescript" :collapsible="false" />
        </CoarCard>

        <CoarCard elevated>
          <h3>useToast Composable</h3>
          <p class="example-description">Use the <code>useToast</code> composable in any component.</p>
          <CoarCodeBlock :code="codeUsage" language="typescript" :collapsible="false" />
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Toast API</summary>
        <div class="api-content">
          <h4>useToast() Methods</h4>
          <table class="api-table">
            <thead><tr><th>Method</th><th>Parameters</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>toast.success(message, config?)</code></td><td><code>string, ToastConfig?</code></td><td>Show success toast</td></tr>
              <tr><td><code>toast.error(message, config?)</code></td><td><code>string, ToastConfig?</code></td><td>Show error toast</td></tr>
              <tr><td><code>toast.warning(message, config?)</code></td><td><code>string, ToastConfig?</code></td><td>Show warning toast</td></tr>
              <tr><td><code>toast.info(message, config?)</code></td><td><code>string, ToastConfig?</code></td><td>Show info toast</td></tr>
            </tbody>
          </table>
          <h4>ToastConfig Options</h4>
          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>title</code></td><td><code>string</code></td><td><code>undefined</code></td><td>Optional toast title</td></tr>
              <tr><td><code>duration</code></td><td><code>number</code></td><td><code>4000</code></td><td>Duration in ms (0 = persistent)</td></tr>
              <tr><td><code>position</code></td><td><code>'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'</code></td><td><code>'top-right'</code></td><td>Screen position</td></tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
h3, h4 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}
h4 { margin-top: var(--coar-spacing-m); }
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }
code {
  background: var(--coar-background-neutral-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: var(--coar-radius-xxs);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875em;
}
</style>
