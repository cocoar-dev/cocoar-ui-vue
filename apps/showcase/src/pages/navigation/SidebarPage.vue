<script setup lang="ts">
import { CoarSidebar, CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading, CoarSubExpand, CoarSubmenuItem, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const codeBasic = `<CoarSidebar>
  <template #header>
    <strong>My App</strong>
  </template>

  <CoarMenu borderless>
    <CoarMenuItem icon="home">Dashboard</CoarMenuItem>
    <CoarMenuItem icon="user">Profile</CoarMenuItem>
    <CoarMenuItem icon="settings">Settings</CoarMenuItem>
  </CoarMenu>

  <template #footer>
    <CoarMenuItem icon="log-out">Logout</CoarMenuItem>
  </template>
</CoarSidebar>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Sidebar</h1>
      <p class="page-description">
        A three-part navigation sidebar with header, scrollable content, and footer sections.
        Works with <code>CoarMenu</code> for navigation and supports custom content in all slots.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarSidebar } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Sidebar</h3>
          <p class="example-description">Sidebar with header, menu items, and footer.</p>
          <div class="example-demo sidebar-demo-container">
            <CoarSidebar>
              <template #header>
                <div class="sidebar-logo">
                  <div class="logo-icon">C</div>
                  <strong>cocoar</strong>
                </div>
              </template>

              <CoarMenu borderless>
                <CoarMenuItem icon="home">Dashboard</CoarMenuItem>
                <CoarMenuItem icon="user">Profile</CoarMenuItem>
                <CoarMenuItem icon="list">Projects</CoarMenuItem>
                <CoarMenuItem icon="settings">Settings</CoarMenuItem>
              </CoarMenu>

              <template #footer>
                <CoarMenu borderless>
                  <CoarMenuDivider />
                  <CoarMenuItem icon="log-out">Logout</CoarMenuItem>
                </CoarMenu>
              </template>
            </CoarSidebar>
          </div>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>With Sections & Submenus</h3>
          <p class="example-description">Full navigation sidebar with grouped sections and nested items.</p>
          <div class="example-demo sidebar-demo-container">
            <CoarSidebar>
              <template #header>
                <div class="sidebar-logo">
                  <div class="logo-icon">A</div>
                  <strong>Admin Panel</strong>
                </div>
              </template>

              <CoarMenu borderless>
                <CoarMenuHeading>Main</CoarMenuHeading>
                <CoarMenuItem icon="home">Dashboard</CoarMenuItem>
                <CoarMenuItem icon="list">Projects</CoarMenuItem>
                <CoarMenuHeading>Management</CoarMenuHeading>
                <CoarSubExpand label="Users">
                  <CoarSubmenuItem>All Users</CoarSubmenuItem>
                  <CoarSubmenuItem>Roles</CoarSubmenuItem>
                  <CoarSubmenuItem>Permissions</CoarSubmenuItem>
                </CoarSubExpand>
                <CoarSubExpand label="Reports">
                  <CoarSubmenuItem>Sales</CoarSubmenuItem>
                  <CoarSubmenuItem>Analytics</CoarSubmenuItem>
                </CoarSubExpand>
                <CoarMenuHeading>System</CoarMenuHeading>
                <CoarMenuItem icon="settings">Settings</CoarMenuItem>
                <CoarMenuItem icon="globe">Localization</CoarMenuItem>
              </CoarMenu>

              <template #footer>
                <CoarMenu borderless>
                  <CoarMenuDivider />
                  <CoarMenuItem icon="user">John Doe</CoarMenuItem>
                  <CoarMenuItem icon="log-out">Logout</CoarMenuItem>
                </CoarMenu>
              </template>
            </CoarSidebar>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Sidebar API</summary>
        <div class="api-content">
          <h4>Slots</h4>
          <table class="api-table">
            <thead><tr><th>Slot</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>#header</code></td><td>Top section — logo, brand, workspace switcher</td></tr>
              <tr><td><code>default</code></td><td>Scrollable content area — typically a CoarMenu</td></tr>
              <tr><td><code>#footer</code></td><td>Bottom section — user profile, logout, secondary actions</td></tr>
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

.sidebar-demo-container {
  height: 360px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: var(--coar-radius-s);
  overflow: hidden;
  display: flex;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  padding: var(--coar-spacing-xs);
}

.logo-icon {
  width: 28px;
  height: 28px;
  background: var(--coar-background-accent-primary);
  color: white;
  border-radius: var(--coar-radius-s);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}
</style>
