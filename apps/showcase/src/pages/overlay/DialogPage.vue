<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarCard, CoarCodeBlock, CoarNote, useDialog } from '@cocoar/vue-ui';

const dialog = useDialog();
const lastResult = ref('');

function openConfirm() {
  dialog.confirm({
    title: 'Delete item?',
    message: 'This action cannot be undone. Are you sure you want to delete this item?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmVariant: 'danger',
  }).result.then((confirmed) => {
    lastResult.value = confirmed ? 'deleted' : 'cancelled';
  });
}

function openConfirmPrimary() {
  dialog.confirm({
    title: 'Publish changes?',
    message: 'This will make your changes visible to all users.',
    confirmText: 'Publish',
    cancelText: 'Not yet',
    confirmVariant: 'primary',
  }).result.then((confirmed) => {
    lastResult.value = confirmed ? 'published' : 'kept draft';
  });
}

function openAlert() {
  dialog.alert('Session expired', 'Your session has expired. Please sign in again to continue.');
}

function openLarge() {
  dialog.confirm({
    title: 'Terms & Conditions',
    message: 'By continuing, you agree to our Terms of Service and Privacy Policy. Please review the full terms before accepting. This agreement governs your use of the platform and all associated services.',
    confirmText: 'I Agree',
    cancelText: 'Decline',
    size: 'm',
  }).result.then((confirmed) => {
    lastResult.value = confirmed ? 'agreed' : 'declined';
  });
}

const codeConfirm = `import { useDialog } from '@cocoar/vue-ui';

const dialog = useDialog();

async function deleteItem() {
  const confirmed = await dialog.confirm({
    title: 'Delete item?',
    message: 'This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmVariant: 'danger',
  }).result;

  if (confirmed) {
    // proceed with deletion
  }
}`;

const codeAlert = `const dialog = useDialog();

dialog.alert('Session expired', 'Please sign in again.');`;

const codeSetup = `// main.ts — Register once
import { CoarOverlayPlugin } from '@cocoar/vue-ui';

createApp(App)
  .use(CoarOverlayPlugin)
  .mount('#app');`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Dialog</h1>
      <p class="page-description">
        Modal dialogs for important confirmations and alerts. Dialogs block interaction
        with the rest of the UI until the user responds, making them suitable for destructive
        or high-stakes actions.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { useDialog } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Confirm Dialog</h3>
          <p class="example-description">Use <code>dialog.confirm()</code> for destructive or important actions that need user confirmation.</p>
          <div class="example-demo demo-row">
            <CoarButton variant="danger" icon-start="trash-2" @click="openConfirm">Delete Item</CoarButton>
            <CoarButton variant="primary" @click="openConfirmPrimary">Publish Changes</CoarButton>
          </div>
          <p class="demo-value">Last result: {{ lastResult || 'none' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeConfirm" language="typescript" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Alert Dialog</h3>
          <p class="example-description">Use <code>dialog.alert()</code> for informational messages that require acknowledgement.</p>
          <div class="example-demo demo-row">
            <CoarButton variant="secondary" @click="openAlert">Show Alert</CoarButton>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeAlert" language="typescript" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Long Content</h3>
          <p class="example-description">Dialog content scrolls when it overflows. Use size <code>'m'</code> or <code>'l'</code> for more content.</p>
          <div class="example-demo demo-row">
            <CoarButton variant="secondary" @click="openLarge">Terms & Conditions</CoarButton>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Setup</h3>
          <p class="example-description">Register the overlay plugin once in your app entry point.</p>
          <CoarCodeBlock :code="codeSetup" language="typescript" :collapsible="false" />
        </CoarCard>
      </div>

      <CoarNote variant="warning" style="max-width: 700px; margin-top: var(--coar-spacing-s)">
        <strong>When to use Dialog vs Popconfirm:</strong> Use <strong>Dialog</strong> for modal confirmations
        that block the entire UI. Use <strong>Popconfirm</strong> for lightweight inline confirmations
        anchored near the trigger element. Dialogs are appropriate for higher-stakes, less frequent actions.
      </CoarNote>

      <details class="api-section" style="margin-top: var(--coar-spacing-l)">
        <summary>Dialog API</summary>
        <div class="api-content">
          <h4>useDialog() Methods</h4>
          <table class="api-table">
            <thead><tr><th>Method</th><th>Parameters</th><th>Returns</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>dialog.confirm(options)</code></td><td><code>ConfirmOptions</code></td><td><code>DialogRef&lt;boolean&gt;</code></td><td>Show a confirm/cancel dialog</td></tr>
              <tr><td><code>dialog.alert(title, message)</code></td><td><code>string, string</code></td><td><code>DialogRef&lt;void&gt;</code></td><td>Show an acknowledgement dialog</td></tr>
              <tr><td><code>dialog.open(component, config?, props?)</code></td><td><code>Component, DialogConfig?, Record?</code></td><td><code>DialogRef&lt;T&gt;</code></td><td>Open a custom component inside the dialog</td></tr>
            </tbody>
          </table>
          <h4>ConfirmOptions</h4>
          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>title</code></td><td><code>string</code></td><td><code>—</code></td><td>Dialog title</td></tr>
              <tr><td><code>message</code></td><td><code>string</code></td><td><code>—</code></td><td>Confirmation message body</td></tr>
              <tr><td><code>confirmText</code></td><td><code>string</code></td><td><code>'Confirm'</code></td><td>Confirm button label</td></tr>
              <tr><td><code>cancelText</code></td><td><code>string</code></td><td><code>'Cancel'</code></td><td>Cancel button label</td></tr>
              <tr><td><code>confirmVariant</code></td><td><code>'primary' | 'danger'</code></td><td><code>'primary'</code></td><td>Confirm button color variant</td></tr>
              <tr><td><code>size</code></td><td><code>'s' | 'm' | 'l'</code></td><td><code>'s'</code></td><td>Dialog width</td></tr>
            </tbody>
          </table>
          <h4>DialogRef</h4>
          <table class="api-table">
            <thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>result</code></td><td><code>Promise&lt;T | undefined&gt;</code></td><td>Resolves when the dialog closes</td></tr>
              <tr><td><code>close(result?)</code></td><td><code>(val?: T) =&gt; void</code></td><td>Programmatically close the dialog</td></tr>
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
