<script setup lang="ts">
import { CoarBreadcrumb, CoarBreadcrumbItem, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const codeBasic = `<CoarBreadcrumb>
  <CoarBreadcrumbItem><a href="/">Home</a></CoarBreadcrumbItem>
  <CoarBreadcrumbItem><a href="/users">Users</a></CoarBreadcrumbItem>
  <CoarBreadcrumbItem :active="true">John Doe</CoarBreadcrumbItem>
</CoarBreadcrumb>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Breadcrumb</h1>
      <p class="page-description">A navigation component that shows the user's current location within a hierarchy.</p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">Standard breadcrumb with links and an active last item.</p>
          <div class="example-demo">
            <CoarBreadcrumb>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Home</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Users</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem :active="true">John Doe</CoarBreadcrumbItem>
            </CoarBreadcrumb>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Deep Hierarchy</h3>
          <p class="example-description">Multi-level navigation paths for deeply nested content.</p>
          <div class="example-demo">
            <CoarBreadcrumb>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Home</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Products</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Electronics</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Laptops</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem :active="true">MacBook Pro 16"</CoarBreadcrumbItem>
            </CoarBreadcrumb>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>App Navigation</h3>
          <p class="example-description">Typical use in an application with sections and items.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <CoarBreadcrumb>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Dashboard</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem :active="true">Overview</CoarBreadcrumbItem>
            </CoarBreadcrumb>
            <CoarBreadcrumb>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Settings</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Account</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem :active="true">Security</CoarBreadcrumbItem>
            </CoarBreadcrumb>
            <CoarBreadcrumb>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Projects</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Alpha</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem><a href="javascript:void(0)">Issues</a></CoarBreadcrumbItem>
              <CoarBreadcrumbItem :active="true">#142 Fix date picker</CoarBreadcrumbItem>
            </CoarBreadcrumb>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Keyboard Navigation</h3>
          <p class="example-description">Breadcrumb items are fully keyboard navigable.</p>
          <div class="keyboard-grid">
            <div class="keyboard-item"><kbd>Tab</kbd> <span>Move between breadcrumb links</span></div>
            <div class="keyboard-item"><kbd>Enter</kbd> <span>Activate the focused link</span></div>
            <div class="keyboard-item"><kbd>Shift</kbd> + <kbd>Tab</kbd> <span>Move focus backward</span></div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Breadcrumb API</summary>
        <div class="api-content">
          <h4>CoarBreadcrumb</h4>
          <p class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">Container component. No props.</p>
          <h4>CoarBreadcrumbItem Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>active</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Mark as the current/active page (not a link)</td></tr>
            </tbody>
          </table>
          <h4>Slots</h4>
          <table class="api-table">
            <thead><tr><th>Slot</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>default</code></td><td>Item content — typically an anchor tag for links, or plain text for the active item</td></tr>
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
h4 { margin: var(--coar-spacing-m) 0 var(--coar-spacing-xs); font-size: var(--coar-body-base-size); font-weight: var(--coar-body-base-bold-weight); }
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }
</style>
