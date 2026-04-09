<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <CoarCheckbox v-model="collapsed" label="collapsed" />
      <CoarSelect v-model="size" :options="sizeOptions" label="size" size="s" style="width: 100px;" />
      <CoarSelect v-model="variant" :options="variantOptions" label="variant" size="s" style="width: 140px;" />
      <CoarCheckbox v-model="elevated" label="elevated" />
      <CoarCheckbox v-model="borderless" label="borderless" />
    </div>

    <div style="height: 560px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden; display: flex;">
      <CoarSidebar
        v-model:collapsed="collapsed"
        :size="size"
        :variant="variant"
        :elevated="elevated"
        :borderless="borderless"
      >
        <template #header="{ collapsed: isCollapsed }">
          <div style="display: flex; align-items: center; gap: 8px; padding: 4px;">
            <div style="width: 28px; height: 28px; background: var(--coar-background-accent-primary); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">C</div>
            <strong v-if="!isCollapsed" style="white-space: nowrap;">cocoar</strong>
          </div>
        </template>

        <CoarSidebarItem icon="home" label="Dashboard" active />
        <CoarSidebarItem icon="user" label="Profile" />
        <CoarSidebarItem icon="list" label="Projects" />
        <CoarSidebarItem label="No Icon Item" />

        <CoarSidebarHeading label="Management" />
        <CoarSidebarGroup icon="users" label="Users" v-model:open="usersOpen">
          <CoarSidebarItem icon="user-plus" label="All Users" />
          <CoarSidebarItem icon="shield" label="Roles" />
          <CoarSidebarItem icon="lock" label="Permissions" />
        </CoarSidebarGroup>
        <CoarSidebarGroup icon="list" label="Reports (hover)" mode="flyout" open-on-hover>
          <CoarSidebarItem icon="globe" label="Sales" />
          <CoarSidebarItem icon="bell" label="Alerts" />
          <CoarSidebarGroup icon="settings" label="Nested flyout" mode="flyout">
            <CoarSidebarItem icon="lock" label="Audit Log" />
            <CoarSidebarItem icon="shield" label="Compliance" />
          </CoarSidebarGroup>
          <CoarSidebarGroup icon="list" label="Nested expand" v-model:open="expandInFlyout">
            <CoarSidebarItem icon="user-plus" label="Create" />
            <CoarSidebarItem icon="settings" label="Configure" />
          </CoarSidebarGroup>
        </CoarSidebarGroup>
        <CoarSidebarGroup icon="settings" label="Quick Actions (icons)" mode="flyout" icon-only>
          <CoarSidebarItem icon="user-plus" label="Add User" />
          <CoarSidebarItem icon="lock" label="Lock" />
          <CoarSidebarGroup icon="bell" label="Nested icons" mode="flyout">
            <CoarSidebarItem icon="bell" label="Notify" />
            <CoarSidebarItem icon="shield" label="Security" />
          </CoarSidebarGroup>
          <CoarSidebarGroup icon="list" label="Expand" v-model:open="expandInIconOnly">
            <CoarSidebarItem icon="user-plus" label="Create" />
            <CoarSidebarItem icon="settings" label="Configure" />
          </CoarSidebarGroup>
        </CoarSidebarGroup>

        <CoarSidebarHeading label="System" />
        <CoarSidebarItem icon="settings" label="Settings" />
        <CoarSidebarItem icon="globe" label="Localization" />

        <template #footer>
          <CoarSidebarDivider />
          <CoarSidebarItem icon="log-out" label="Logout" />
          <CoarSidebarSpacer height="4px" />
        </template>
      </CoarSidebar>

      <div style="flex: 1; padding: 24px; display: flex; align-items: center; justify-content: center; color: var(--coar-text-neutral-tertiary);">
        Main content area
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarSidebar,
  CoarSidebarItem,
  CoarSidebarGroup,
  CoarSidebarHeading,
  CoarSidebarDivider,
  CoarSidebarSpacer,
  CoarCheckbox,
  CoarSelect,
} from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const collapsed = ref(false);
const size = ref<'s' | 'm' | 'l'>('m');
const variant = ref<'primary' | 'secondary'>('primary');
const elevated = ref(false);
const borderless = ref(false);
const usersOpen = ref(false);
const reportsOpen = ref(false);
const expandInFlyout = ref(false);
const expandInIconOnly = ref(false);

const sizeOptions: CoarSelectOption<string>[] = [
  { value: 's', label: 's (16px)' },
  { value: 'm', label: 'm (20px)' },
  { value: 'l', label: 'l (24px)' },
];

const variantOptions: CoarSelectOption<string>[] = [
  { value: 'primary', label: 'primary' },
  { value: 'secondary', label: 'secondary' },
];
</script>
