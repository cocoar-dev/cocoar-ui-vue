<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Controls -->
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <CoarSelect v-model="variant" :options="variantOptions" label="Variant" size="s" style="width: 160px;" />
      <CoarCheckbox v-model="elevated" label="elevated" />
      <CoarCheckbox v-model="borderless" label="borderless" />
    </div>

    <!-- Preview -->
    <div style="height: 320px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 8px; overflow: hidden; display: flex;">
      <CoarSidebar :variant="variant" :elevated="elevated" :borderless="borderless">
        <template #header>
          <div style="display: flex; align-items: center; gap: 8px; padding: 4px;">
            <div style="width: 28px; height: 28px; background: var(--coar-background-accent-primary); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">C</div>
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

      <div style="flex: 1; padding: 24px; display: flex; align-items: center; justify-content: center; color: var(--coar-text-neutral-tertiary);">
        Main content area
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSidebar, CoarMenu, CoarMenuItem, CoarMenuDivider, CoarSelect, CoarCheckbox } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const variant = ref<'primary' | 'secondary'>('primary');
const elevated = ref(false);
const borderless = ref(false);

const variantOptions: CoarSelectOption<string>[] = [
  { value: 'primary', label: 'primary' },
  { value: 'secondary', label: 'secondary' },
];
</script>
