<template>
  <div class="ks">
    <!-- App Shell: Sidebar + Content -->
    <div class="ks-app-shell">
      <CoarSidebar elevated borderless>
        <template #header>
          <div style="display: flex; align-items: center; gap: 8px; padding: 4px;">
            <div class="ks-logo">C</div>
            <strong>cocoar</strong>
          </div>
        </template>
        <CoarMenu borderless>
          <CoarMenuItem icon="home">Dashboard</CoarMenuItem>
          <CoarMenuItem icon="user">Users</CoarMenuItem>
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

      <div class="ks-main">
        <!-- Navbar -->
        <CoarNavbar>
          <template #left>
            <CoarBreadcrumb>
              <CoarBreadcrumbItem>Home</CoarBreadcrumbItem>
              <CoarBreadcrumbItem>Dashboard</CoarBreadcrumbItem>
            </CoarBreadcrumb>
          </template>
          <template #right>
            <CoarBadge :content="3" variant="error">
              <CoarButton variant="ghost" size="s">Notifications</CoarButton>
            </CoarBadge>
            <CoarAvatar name="John Doe" size="s" />
          </template>
        </CoarNavbar>

        <div class="ks-content">
          <!-- Status Cards Row -->
          <div class="ks-row">
            <CoarCard variant="success" padding="s">
              <div class="ks-stat">
                <span class="ks-stat-value">128</span>
                <span class="ks-stat-label">Active Users</span>
              </div>
            </CoarCard>
            <CoarCard variant="info" padding="s">
              <div class="ks-stat">
                <span class="ks-stat-value">42</span>
                <span class="ks-stat-label">Projects</span>
              </div>
            </CoarCard>
            <CoarCard variant="warning" padding="s">
              <div class="ks-stat">
                <span class="ks-stat-value">7</span>
                <span class="ks-stat-label">Pending</span>
              </div>
            </CoarCard>
            <CoarCard variant="error" padding="s">
              <div class="ks-stat">
                <span class="ks-stat-value">3</span>
                <span class="ks-stat-label">Errors</span>
              </div>
            </CoarCard>
          </div>

          <!-- Notes -->
          <CoarNote variant="info">This is an <strong>info</strong> note with context for the user.</CoarNote>
          <CoarNote variant="accent">This is an <strong>accent</strong> note highlighting something important.</CoarNote>

          <!-- Form Section -->
          <CoarCard elevated>
            <template #header><strong>Create Project</strong></template>
            <div class="ks-form">
              <CoarTextInput label="Project Name" placeholder="My Project" />
              <CoarSelect v-model="selectedOption" :options="selectOptions" label="Category" />
              <div class="ks-row">
                <CoarCheckbox v-model="checked" label="Make public" />
                <CoarSwitch v-model="switched" label="Notifications" />
              </div>
              <CoarRadioGroup v-model="radio" :options="radioOptions" label="Priority" />
              <div class="ks-row">
                <CoarButton variant="primary">Create</CoarButton>
                <CoarButton variant="secondary">Cancel</CoarButton>
                <CoarButton variant="ghost">Reset</CoarButton>
                <CoarButton variant="danger">Delete</CoarButton>
              </div>
            </div>
          </CoarCard>

          <!-- All Button Variants -->
          <CoarCard variant="outlined">
            <template #header><strong>Button Variants</strong></template>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div class="ks-row" style="align-items: center;">
                <CoarButton variant="primary">Primary</CoarButton>
                <CoarButton variant="secondary">Secondary</CoarButton>
                <CoarButton variant="tertiary">Tertiary</CoarButton>
                <CoarButton variant="ghost">Ghost</CoarButton>
                <CoarButton variant="danger">Danger</CoarButton>
              </div>
              <div class="ks-row" style="align-items: center;">
                <CoarButton variant="primary" size="s">Primary S</CoarButton>
                <CoarButton variant="secondary" size="s">Secondary S</CoarButton>
                <CoarButton variant="tertiary" size="s">Tertiary S</CoarButton>
                <CoarButton variant="ghost" size="s">Ghost S</CoarButton>
                <CoarButton variant="danger" size="s">Danger S</CoarButton>
              </div>
              <div class="ks-row" style="align-items: center;">
                <CoarButton variant="primary" disabled>Disabled</CoarButton>
                <CoarButton variant="secondary" disabled>Disabled</CoarButton>
                <CoarButton variant="tertiary" disabled>Disabled</CoarButton>
                <CoarButton variant="ghost" disabled>Disabled</CoarButton>
                <CoarButton variant="danger" disabled>Disabled</CoarButton>
              </div>
            </div>
          </CoarCard>

          <!-- Tags & Badges -->
          <div class="ks-row" style="flex-wrap: wrap;">
            <CoarTag variant="neutral">neutral</CoarTag>
            <CoarTag variant="accent">accent</CoarTag>
            <CoarTag variant="success">success</CoarTag>
            <CoarTag variant="warning">warning</CoarTag>
            <CoarTag variant="error">error</CoarTag>
            <CoarTag variant="info">info</CoarTag>
            <CoarTag variant="accent" closable>closable</CoarTag>
          </div>

          <!-- Tabs + Progress -->
          <CoarCard variant="outlined">
            <CoarTabGroup :tabs="tabs" v-model="activeTab">
              <template #overview>
                <div style="padding: 12px 0;">
                  <div class="ks-stat-label" style="margin-bottom: 8px;">Project Progress</div>
                  <CoarProgressBar :value="65" variant="accent" />
                  <div style="margin-top: 16px;">
                    <CoarProgressBar :value="90" variant="success" size="s" />
                  </div>
                  <div style="margin-top: 8px;">
                    <CoarProgressBar :value="30" variant="warning" size="s" />
                  </div>
                </div>
              </template>
              <template #details>
                <div style="padding: 12px 0;">
                  <CoarTable>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Alice</td>
                        <td><CoarTag variant="success" size="s">Active</CoarTag></td>
                        <td>Admin</td>
                      </tr>
                      <tr>
                        <td>Bob</td>
                        <td><CoarTag variant="warning" size="s">Away</CoarTag></td>
                        <td>Editor</td>
                      </tr>
                      <tr>
                        <td>Charlie</td>
                        <td><CoarTag variant="error" size="s">Offline</CoarTag></td>
                        <td>Viewer</td>
                      </tr>
                    </tbody>
                  </CoarTable>
                </div>
              </template>
            </CoarTabGroup>
          </CoarCard>

          <!-- Buttons: all sizes -->
          <div class="ks-row" style="align-items: center;">
            <CoarButton variant="primary" size="xs">XS</CoarButton>
            <CoarButton variant="primary" size="s">Small</CoarButton>
            <CoarButton variant="primary" size="m">Medium</CoarButton>
            <CoarButton variant="primary" size="l">Large</CoarButton>
          </div>

          <!-- Pagination + Spinner -->
          <div class="ks-row" style="align-items: center; justify-content: space-between;">
            <CoarPagination :total="100" :page-size="10" v-model:current-page="page" />
            <CoarSpinner size="s" />
          </div>

          <!-- Divider -->
          <CoarDivider />

          <!-- Avatars -->
          <div class="ks-row" style="align-items: center;">
            <CoarAvatar name="Alice" size="xs" />
            <CoarAvatar name="Bob" size="s" />
            <CoarAvatar name="Charlie" size="m" />
            <CoarAvatar name="Diana" size="l" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarSidebar, CoarMenu, CoarMenuItem, CoarMenuDivider,
  CoarNavbar, CoarBreadcrumb, CoarBreadcrumbItem,
  CoarButton, CoarCard, CoarNote, CoarTag, CoarBadge, CoarAvatar,
  CoarTextInput, CoarSelect, CoarCheckbox, CoarSwitch, CoarRadioGroup,
  CoarTabGroup, CoarTable, CoarProgressBar, CoarPagination,
  CoarSpinner, CoarDivider,
} from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const checked = ref(true);
const switched = ref(false);
const radio = ref('medium');
const selectedOption = ref('frontend');
const activeTab = ref('overview');
const page = ref(1);

const selectOptions: CoarSelectOption<string>[] = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'design', label: 'Design' },
];

const radioOptions: CoarSelectOption<string>[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'details', label: 'Details' },
];
</script>

<style scoped>
.ks {
  font-size: 14px;
}

.ks-app-shell {
  display: flex;
  height: 1200px;
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: 8px;
  overflow: hidden;
  background: var(--coar-background-neutral-primary);
}

.ks-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ks-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ks-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.ks-row > * {
  flex: 1;
}

.ks-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ks-logo {
  width: 28px;
  height: 28px;
  background: var(--coar-background-accent-primary);
  color: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.ks-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ks-stat-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.ks-stat-label {
  font-size: 12px;
  color: var(--coar-text-neutral-secondary);
}
</style>
