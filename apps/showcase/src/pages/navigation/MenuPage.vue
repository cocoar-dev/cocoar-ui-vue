<script setup lang="ts">
import { ref } from 'vue';
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading, CoarSubExpand, CoarSubmenuItem, CoarCard, CoarCodeBlock, CoarNote } from '@cocoar/vue-ui';

const lastClicked = ref('');

function handleClick(item: string) {
  lastClicked.value = item;
}

const codeBasic = `<CoarMenu>
  <CoarMenuItem @click="handleClick">New File</CoarMenuItem>
  <CoarMenuItem @click="handleClick">Open...</CoarMenuItem>
  <CoarMenuDivider />
  <CoarMenuItem @click="handleClick">Save</CoarMenuItem>
  <CoarMenuItem disabled>Export (disabled)</CoarMenuItem>
</CoarMenu>`;

const codeHeadings = `<CoarMenu>
  <CoarMenuHeading>File</CoarMenuHeading>
  <CoarMenuItem>New</CoarMenuItem>
  <CoarMenuItem>Open</CoarMenuItem>
  <CoarMenuDivider />
  <CoarMenuHeading>Edit</CoarMenuHeading>
  <CoarMenuItem>Cut</CoarMenuItem>
  <CoarMenuItem>Copy</CoarMenuItem>
</CoarMenu>`;

const codeIcons = `<CoarMenuItem icon="plus">New File</CoarMenuItem>
<CoarMenuItem icon="copy">Duplicate</CoarMenuItem>
<CoarMenuItem icon="trash-2" variant="danger">Delete</CoarMenuItem>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Menu</h1>
      <p class="page-description">Context menus, dropdown menus, and navigation menus with support for nested submenus, icons, and keyboard navigation.</p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading, CoarSubExpand, CoarSubmenuItem } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Menu</h3>
          <p class="example-description">A simple menu with items and a divider.</p>
          <div class="example-demo">
            <CoarMenu>
              <CoarMenuItem @click="handleClick('New File')">New File</CoarMenuItem>
              <CoarMenuItem @click="handleClick('Open...')">Open...</CoarMenuItem>
              <CoarMenuDivider />
              <CoarMenuItem @click="handleClick('Save')">Save</CoarMenuItem>
              <CoarMenuItem @click="handleClick('Save As...')">Save As...</CoarMenuItem>
              <CoarMenuDivider />
              <CoarMenuItem @click="handleClick('Export')" :disabled="true">Export (disabled)</CoarMenuItem>
            </CoarMenu>
          </div>
          <p class="demo-value">Last clicked: {{ lastClicked || 'none' }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>With Headings</h3>
          <p class="example-description">Group menu items with section headings.</p>
          <div class="example-demo">
            <CoarMenu>
              <CoarMenuHeading>File</CoarMenuHeading>
              <CoarMenuItem @click="handleClick('New')">New</CoarMenuItem>
              <CoarMenuItem @click="handleClick('Open')">Open</CoarMenuItem>
              <CoarMenuItem @click="handleClick('Recent')">Recent</CoarMenuItem>
              <CoarMenuDivider />
              <CoarMenuHeading>Edit</CoarMenuHeading>
              <CoarMenuItem @click="handleClick('Cut')">Cut</CoarMenuItem>
              <CoarMenuItem @click="handleClick('Copy')">Copy</CoarMenuItem>
              <CoarMenuItem @click="handleClick('Paste')">Paste</CoarMenuItem>
            </CoarMenu>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeHeadings" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>With Icons</h3>
          <p class="example-description">Add icons to menu items for visual clarity.</p>
          <div class="example-demo">
            <CoarMenu>
              <CoarMenuItem icon="plus" @click="handleClick('New File')">New File</CoarMenuItem>
              <CoarMenuItem icon="copy" @click="handleClick('Duplicate')">Duplicate</CoarMenuItem>
              <CoarMenuItem icon="clipboard" @click="handleClick('Paste')">Paste</CoarMenuItem>
              <CoarMenuDivider />
              <CoarMenuItem icon="settings" @click="handleClick('Settings')">Settings</CoarMenuItem>
              <CoarMenuItem icon="trash-2" variant="danger" @click="handleClick('Delete')">Delete</CoarMenuItem>
            </CoarMenu>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeIcons" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Nested Submenus</h3>
          <p class="example-description">Expand submenus inline with <code>CoarSubExpand</code>.</p>
          <div class="example-demo">
            <CoarMenu>
              <CoarMenuItem @click="handleClick('Dashboard')">Dashboard</CoarMenuItem>
              <CoarSubExpand label="Settings">
                <CoarSubmenuItem @click="handleClick('Profile')">Profile</CoarSubmenuItem>
                <CoarSubmenuItem @click="handleClick('Security')">Security</CoarSubmenuItem>
                <CoarSubmenuItem @click="handleClick('Notifications')">Notifications</CoarSubmenuItem>
              </CoarSubExpand>
              <CoarSubExpand label="Reports">
                <CoarSubmenuItem @click="handleClick('Sales')">Sales</CoarSubmenuItem>
                <CoarSubmenuItem @click="handleClick('Traffic')">Traffic</CoarSubmenuItem>
              </CoarSubExpand>
              <CoarMenuDivider />
              <CoarMenuItem @click="handleClick('Logout')">Logout</CoarMenuItem>
            </CoarMenu>
          </div>
        </CoarCard>

        <CoarCard elevated>
          <h3>Borderless (Sidebar)</h3>
          <p class="example-description">Use <code>borderless</code> for menus inside sidebars and panels.</p>
          <div class="example-demo" style="background: var(--coar-background-neutral-secondary); border-radius: var(--coar-radius-m); padding: var(--coar-spacing-s)">
            <CoarMenu borderless>
              <CoarMenuHeading>Navigation</CoarMenuHeading>
              <CoarMenuItem icon="home" @click="handleClick('Home')">Home</CoarMenuItem>
              <CoarMenuItem icon="user" @click="handleClick('Profile')">Profile</CoarMenuItem>
              <CoarMenuItem icon="settings" @click="handleClick('Settings')">Settings</CoarMenuItem>
            </CoarMenu>
          </div>
        </CoarCard>
      </div>

      <CoarNote variant="info" style="max-width: 700px; margin-top: var(--coar-spacing-s)">
        <strong>Keyboard Navigation:</strong> Arrow keys move focus between items. Enter/Space activates. Escape closes nested submenus.
        Tab moves focus out of the menu.
      </CoarNote>

      <details class="api-section" style="margin-top: var(--coar-spacing-l)">
        <summary>Menu API</summary>
        <div class="api-content">
          <h4>CoarMenu Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>borderless</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Remove outer border/background</td></tr>
            </tbody>
          </table>
          <h4>CoarMenuItem Props</h4>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>icon</code></td><td><code>string</code></td><td><code>undefined</code></td><td>Leading icon name</td></tr>
              <tr><td><code>variant</code></td><td><code>'default' | 'danger'</code></td><td><code>'default'</code></td><td>Item color variant</td></tr>
              <tr><td><code>disabled</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Disable the item</td></tr>
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
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 800px; }
</style>
