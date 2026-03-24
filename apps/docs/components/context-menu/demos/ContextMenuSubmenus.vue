<template>
  <div>
    <div
      class="target-area"
      @contextmenu="menu.open"
    >
      Right-click for a menu with headings and submenus
    </div>

    <CoarContextMenu :menu="menu">
      <CoarMenuHeading label="Edit" />
      <CoarMenuItem icon="scissors" label="Cut" @clicked="onAction('Cut')" />
      <CoarMenuItem icon="copy" label="Copy" @clicked="onAction('Copy')" />
      <CoarMenuItem icon="clipboard" label="Paste" @clicked="onAction('Paste')" />
      <CoarMenuDivider />
      <CoarSubExpand label="Sort by" icon="arrow-up-down">
        <CoarMenuItem label="Name" @clicked="onAction('Sort by Name')" />
        <CoarMenuItem label="Date" @clicked="onAction('Sort by Date')" />
        <CoarMenuItem label="Size" @clicked="onAction('Sort by Size')" />
      </CoarSubExpand>
      <CoarMenuDivider />
      <CoarMenuItem icon="settings" label="Preferences" @clicked="onAction('Preferences')" />
    </CoarContextMenu>

    <p class="status">Last action: {{ lastAction || 'none' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  useContextMenu,
  CoarContextMenu,
  CoarMenuItem,
  CoarMenuDivider,
  CoarMenuHeading,
  CoarSubExpand,
} from '@cocoar/vue-ui';

const menu = useContextMenu();
const lastAction = ref('');

function onAction(action: string) {
  lastAction.value = action;
}
</script>

<style scoped>
.target-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  border: 2px dashed var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-m);
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-font-size-s);
  user-select: none;
}

.status {
  margin-top: 8px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
</style>
