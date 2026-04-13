<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarCheckbox v-model="sticky" label="sticky headings" />
  <div style="height: 280px; width: 240px;">
    <CoarMenu style="height: 100%; width: 100%;">
      <template #header>
        <div style="padding: 8px;">
          <input
            v-model="filter"
            type="text"
            placeholder="Filter..."
            style="width: 100%; box-sizing: border-box; padding: 4px 8px; border: 1px solid var(--coar-border-input); border-radius: var(--coar-radius-xs); background: var(--coar-surface-input); font-size: 13px; outline: none;"
          />
        </div>
      </template>

      <template v-for="item in filteredItems" :key="item.label">
        <CoarMenuDivider v-if="item.divider" />
        <CoarMenuHeading v-else-if="item.heading" :label="item.label" :sticky="sticky" />
        <CoarMenuItem v-else :icon="item.icon" :label="item.label" />
      </template>

      <template #footer>
        <CoarMenuItem icon="plus" label="New project..." />
      </template>
    </CoarMenu>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading, CoarCheckbox } from '@cocoar/vue-ui';

const filter = ref('');
const sticky = ref(false);

const items = [
  { heading: true, label: 'Navigation' },
  { icon: 'home', label: 'Dashboard' },
  { icon: 'users', label: 'Users' },
  { icon: 'settings', label: 'Settings' },
  { icon: 'bell', label: 'Notifications' },
  { divider: true, label: 'd1' },
  { heading: true, label: 'Projects' },
  { icon: 'folder', label: 'Frontend' },
  { icon: 'folder', label: 'Backend' },
  { icon: 'folder', label: 'Mobile App' },
  { icon: 'folder', label: 'Design System' },
  { icon: 'folder', label: 'Documentation' },
  { divider: true, label: 'd2' },
  { heading: true, label: 'Admin' },
  { icon: 'database', label: 'Database' },
  { icon: 'code', label: 'API Keys' },
  { icon: 'clipboard', label: 'Audit Log' },
  { icon: 'download', label: 'Exports' },
];

const filteredItems = computed(() => {
  const q = filter.value.toLowerCase().trim();
  if (!q) return items;
  return items.filter((item) =>
    item.heading || item.divider || item.label.toLowerCase().includes(q),
  );
});
</script>
