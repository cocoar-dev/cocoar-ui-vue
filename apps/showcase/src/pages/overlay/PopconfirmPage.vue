<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarCard, CoarCodeBlock, CoarNote, CoarPopconfirm } from '@cocoar/vue-ui';

const lastAction = ref('');

const codeBasic = `<CoarPopconfirm
  title="Delete item?"
  message="This action cannot be undone."
  @confirmed="deleteItem"
  @cancelled="onCancel"
>
  <CoarButton variant="danger">Delete</CoarButton>
</CoarPopconfirm>`;

const codeLabels = `<CoarPopconfirm
  title="Remove from team?"
  message="The user will lose access immediately."
  confirmText="Yes, remove"
  cancelText="Keep member"
  @confirmed="removeUser"
>
  <CoarButton variant="danger">Remove Member</CoarButton>
</CoarPopconfirm>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Popconfirm</h1>
      <p class="page-description">
        Popconfirm provides a lightweight confirmation dialog that appears near the trigger element.
        Use it to confirm destructive or important actions without blocking the entire interface with a modal.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarPopconfirm } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">Click the button to trigger a confirmation dialog near the element.</p>
          <div class="example-demo demo-row">
            <CoarPopconfirm
              title="Delete item?"
              message="This action cannot be undone."
              @confirmed="lastAction = 'deleted'"
              @cancelled="lastAction = 'cancelled'"
            >
              <CoarButton variant="danger" icon-start="trash-2">Delete</CoarButton>
            </CoarPopconfirm>
          </div>
          <p class="demo-value">Last action: {{ lastAction || 'none' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Variants</h3>
          <p class="example-description">Different color variants for different severity levels.</p>
          <div class="example-demo demo-row">
            <CoarPopconfirm
              title="Are you sure?"
              message="This is a destructive action."
              confirmVariant="danger"
              @confirmed="lastAction = 'danger-confirmed'"
            >
              <CoarButton variant="danger">Danger</CoarButton>
            </CoarPopconfirm>

            <CoarPopconfirm
              title="Confirm action"
              message="This will apply the changes."
              confirmVariant="primary"
              @confirmed="lastAction = 'primary-confirmed'"
            >
              <CoarButton variant="primary">Primary</CoarButton>
            </CoarPopconfirm>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Custom Labels</h3>
          <p class="example-description">Customize the confirm and cancel button text for clarity.</p>
          <div class="example-demo demo-row">
            <CoarPopconfirm
              title="Remove from team?"
              message="The user will lose access immediately."
              confirmText="Yes, remove"
              cancelText="Keep member"
              confirmVariant="danger"
              @confirmed="lastAction = 'removed'"
            >
              <CoarButton variant="danger">Remove Member</CoarButton>
            </CoarPopconfirm>

            <CoarPopconfirm
              title="Publish changes?"
              message="This will be visible to all users."
              confirmText="Publish now"
              cancelText="Not yet"
              @confirmed="lastAction = 'published'"
            >
              <CoarButton variant="primary">Publish</CoarButton>
            </CoarPopconfirm>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeLabels" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Placement</h3>
          <p class="example-description">Control where the popconfirm appears relative to the trigger.</p>
          <div class="example-demo demo-row">
            <CoarPopconfirm title="Top placement" message="Appears above the trigger." placement="top" @confirmed="lastAction = 'top'">
              <CoarButton variant="secondary">Top</CoarButton>
            </CoarPopconfirm>
            <CoarPopconfirm title="Bottom placement" message="Appears below the trigger." placement="bottom" @confirmed="lastAction = 'bottom'">
              <CoarButton variant="secondary">Bottom</CoarButton>
            </CoarPopconfirm>
            <CoarPopconfirm title="Right placement" message="Appears to the right." placement="right" @confirmed="lastAction = 'right'">
              <CoarButton variant="secondary">Right</CoarButton>
            </CoarPopconfirm>
          </div>
        </CoarCard>
      </div>

      <CoarNote variant="info" style="max-width: 700px; margin-top: var(--coar-spacing-s)">
        <strong>vs Dialog:</strong> Use Popconfirm for quick inline confirmations with no complex input needed.
        Use Dialog for complex confirmations that require forms, detailed explanations, or multiple actions.
      </CoarNote>

      <details class="api-section" style="margin-top: var(--coar-spacing-l)">
        <summary>Popconfirm API</summary>
        <div class="api-content">
          <h4>Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>message</code></td><td><code>string</code></td><td><code>required</code></td><td>Confirmation message body</td></tr>
              <tr><td><code>title</code></td><td><code>string</code></td><td><code>''</code></td><td>Optional title above the message</td></tr>
              <tr><td><code>confirmText</code></td><td><code>string</code></td><td><code>'OK'</code></td><td>Confirm button label</td></tr>
              <tr><td><code>cancelText</code></td><td><code>string</code></td><td><code>'Cancel'</code></td><td>Cancel button label</td></tr>
              <tr><td><code>confirmVariant</code></td><td><code>'primary' | 'danger'</code></td><td><code>'primary'</code></td><td>Confirm button color variant</td></tr>
              <tr><td><code>placement</code></td><td><code>'top' | 'bottom' | 'left' | 'right'</code></td><td><code>'top'</code></td><td>Preferred placement</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the popconfirm trigger</td></tr>
            </tbody>
          </table>
          <h4>Events</h4>
          <table class="api-table">
            <thead><tr><th>Event</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>confirmed</code></td><td>Emitted when the confirm button is clicked</td></tr>
              <tr><td><code>cancelled</code></td><td>Emitted when the cancel button is clicked or overlay is dismissed</td></tr>
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
</style>
