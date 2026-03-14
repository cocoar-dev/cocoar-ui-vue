<script setup lang="ts">
import { CoarTable, CoarTag, CoarBadge, CoarAvatar, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const users = [
  { id: 1, name: 'Alice Johnson', role: 'Admin', status: 'active', email: 'alice@example.com' },
  { id: 2, name: 'Bob Smith', role: 'Editor', status: 'active', email: 'bob@example.com' },
  { id: 3, name: 'Carol White', role: 'Viewer', status: 'pending', email: 'carol@example.com' },
  { id: 4, name: 'David Brown', role: 'Editor', status: 'inactive', email: 'david@example.com' },
  { id: 5, name: 'Eva Martinez', role: 'Admin', status: 'active', email: 'eva@example.com' },
];

const statusVariant: Record<string, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  inactive: 'neutral',
};

const codeBasic = `<CoarTable>
  <thead>
    <tr>
      <th>Name</th>
      <th>Role</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="user in users" :key="user.id">
      <td>{{ user.name }}</td>
      <td>{{ user.role }}</td>
      <td>{{ user.status }}</td>
    </tr>
  </tbody>
</CoarTable>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Table</h1>
      <p class="page-description">
        A simple, styled table component for displaying tabular data consistently.
        Uses alternating row colors by default for improved readability.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarTable } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated class="examples-grid__span">
          <h3>Basic Usage</h3>
          <p class="example-description">Standard table with alternating row colors. Use native <code>thead</code>, <code>tbody</code>, <code>tr</code>, <code>th</code>, <code>td</code> elements inside.</p>
          <div class="example-demo">
            <CoarTable>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.id">
                  <td>{{ user.id }}</td>
                  <td>{{ user.name }}</td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.role }}</td>
                  <td>
                    <CoarTag :variant="statusVariant[user.status]" size="s">{{ user.status }}</CoarTag>
                  </td>
                </tr>
              </tbody>
            </CoarTable>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated class="examples-grid__span">
          <h3>Rich Cells</h3>
          <p class="example-description">Combine table cells with other components like avatars and badges.</p>
          <div class="example-demo">
            <CoarTable>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Notifications</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.id">
                  <td>
                    <div class="user-cell">
                      <CoarAvatar :name="user.name" size="s" />
                      <div>
                        <div class="coar-body-small" style="font-weight: var(--coar-body-base-bold-weight)">{{ user.name }}</div>
                        <div class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">{{ user.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ user.role }}</td>
                  <td><CoarTag :variant="statusVariant[user.status]" size="s">{{ user.status }}</CoarTag></td>
                  <td><CoarBadge v-if="user.status === 'active'" variant="error" size="s">{{ Math.floor(Math.random() * 10) + 1 }}</CoarBadge></td>
                </tr>
              </tbody>
            </CoarTable>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Variants</h3>
          <p class="example-description">Different visual styles for the table container.</p>
          <div class="example-demo" style="display: flex; flex-direction: column; gap: var(--coar-spacing-m)">
            <div>
              <p class="coar-body-small" style="margin: 0 0 var(--coar-spacing-xs); color: var(--coar-text-neutral-secondary)">Default (striped)</p>
              <CoarTable>
                <thead><tr><th>Name</th><th>Value</th></tr></thead>
                <tbody>
                  <tr><td>Alpha</td><td>1</td></tr>
                  <tr><td>Beta</td><td>2</td></tr>
                  <tr><td>Gamma</td><td>3</td></tr>
                </tbody>
              </CoarTable>
            </div>
            <div>
              <p class="coar-body-small" style="margin: 0 0 var(--coar-spacing-xs); color: var(--coar-text-neutral-secondary)">Bordered</p>
              <CoarTable variant="bordered">
                <thead><tr><th>Name</th><th>Value</th></tr></thead>
                <tbody>
                  <tr><td>Alpha</td><td>1</td></tr>
                  <tr><td>Beta</td><td>2</td></tr>
                  <tr><td>Gamma</td><td>3</td></tr>
                </tbody>
              </CoarTable>
            </div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Table API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>variant</code></td><td><code>'default' | 'bordered'</code></td><td><code>'default'</code></td><td>Table style variant</td></tr>
            </tbody>
          </table>
          <h4>Slots</h4>
          <table class="api-table">
            <thead><tr><th>Slot</th><th>Description</th></tr></thead>
            <tbody><tr><td><code>default</code></td><td>Native thead/tbody/tr/th/td elements</td></tr></tbody>
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

.user-cell {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
}
</style>
