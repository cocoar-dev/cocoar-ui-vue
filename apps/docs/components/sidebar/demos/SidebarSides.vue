<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <CoarSelect
        v-model="side"
        :options="sideOptions"
        label="side"
        size="s"
        style="width: 140px;"
      />
      <CoarCheckbox v-model="collapsed" label="collapsed" />
      <CoarCheckbox v-model="elevated" label="elevated" />
      <CoarCheckbox v-model="borderless" label="borderless" />
      <span style="color: var(--coar-text-neutral-tertiary); font-size: 13px;">
        Note: in horizontal sidebars `mode="expand"` opens to the right; `mode="flyout"` opens downward (top) or upward (bottom).
      </span>
    </div>

    <div
      :style="containerStyle"
      style="height: 480px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden;"
    >
      <CoarSidebar
        v-model:collapsed="collapsed"
        :side="side"
        :elevated="elevated"
        :borderless="borderless"
      >
        <CoarSidebarItem icon="home" label="Home" active @click="lastClicked = 'Home'" />
        <CoarSidebarItem icon="user" label="Profile" @click="lastClicked = 'Profile'" />
        <CoarSidebarItem icon="list" label="Projects" @click="lastClicked = 'Projects'" />

        <CoarSidebarGroup icon="users" label="Team" v-model:open="teamOpen">
          <CoarSidebarItem icon="user-plus" label="Members" @click="lastClicked = 'Members'" />
          <CoarSidebarItem icon="shield" label="Roles" @click="lastClicked = 'Roles'" />
        </CoarSidebarGroup>

        <CoarSidebarGroup icon="settings" label="Tools" mode="flyout">
          <CoarSidebarItem icon="bell" label="Notifications" @click="lastClicked = 'Notifications'" />
          <CoarSidebarItem icon="lock" label="Security" @click="lastClicked = 'Security'" />
          <CoarSidebarItem icon="globe" label="Localization" @click="lastClicked = 'Localization'" />
        </CoarSidebarGroup>

        <CoarSidebarItem icon="settings" label="Settings" @click="lastClicked = 'Settings'" />
      </CoarSidebar>

      <div
        style="flex: 1; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--coar-text-neutral-tertiary); text-align: center;"
      >
        <div>Main content area</div>
        <div style="font-size: 13px;">Last clicked: <strong>{{ lastClicked }}</strong></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CoarSidebar,
  CoarSidebarItem,
  CoarSidebarGroup,
  CoarCheckbox,
  CoarSelect,
} from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

type Side = 'left' | 'right' | 'top' | 'bottom';

const side = ref<Side>('left');
const collapsed = ref(false);
const elevated = ref(false);
const borderless = ref(false);
const teamOpen = ref(false);
const lastClicked = ref('—');

const sideOptions: CoarSelectOption<Side>[] = [
  { value: 'left', label: 'left' },
  { value: 'right', label: 'right' },
  { value: 'top', label: 'top' },
  { value: 'bottom', label: 'bottom' },
];

// Container layout flips based on side:
// - left/right: flex-row, sidebar at start or end
// - top/bottom: flex-column, sidebar at start or end
const containerStyle = computed(() => {
  switch (side.value) {
    case 'right':
      return { display: 'flex', flexDirection: 'row-reverse' as const };
    case 'top':
      return { display: 'flex', flexDirection: 'column' as const };
    case 'bottom':
      return { display: 'flex', flexDirection: 'column-reverse' as const };
    default:
      return { display: 'flex', flexDirection: 'row' as const };
  }
});
</script>
