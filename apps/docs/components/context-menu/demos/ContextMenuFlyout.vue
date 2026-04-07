<template>
  <div>
    <div class="target-area" @contextmenu="menu.open">
      Right-click for a menu with flyout submenus
    </div>

    <CoarContextMenu :menu="menu">
      <CoarMenuItem icon="pencil" label="Edit" @clicked="onAction('Edit')" />
      <CoarMenuDivider />
      <CoarSubFlyout label="Set Status" icon="circle-alert">
        <CoarMenu>
          <CoarMenuItem label="New" @clicked="onAction('Status: New')" />
          <CoarMenuItem label="In Progress" @clicked="onAction('Status: In Progress')" />
          <CoarMenuItem label="Done" @clicked="onAction('Status: Done')" />
        </CoarMenu>
      </CoarSubFlyout>
      <CoarSubFlyout label="Priority" icon="flag">
        <CoarMenu>
          <CoarMenuItem label="Low" @clicked="onAction('Priority: Low')" />
          <CoarMenuItem label="Medium" @clicked="onAction('Priority: Medium')" />
          <CoarMenuItem label="High" @clicked="onAction('Priority: High')" />
        </CoarMenu>
      </CoarSubFlyout>
      <CoarMenuDivider />
      <CoarMenuItem icon="trash-2" label="Delete" @clicked="onAction('Delete')" />
    </CoarContextMenu>

    <p class="status">Last action: {{ lastAction || 'none' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  useContextMenu,
  CoarContextMenu,
  CoarMenu,
  CoarMenuItem,
  CoarMenuDivider,
  CoarSubFlyout,
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
