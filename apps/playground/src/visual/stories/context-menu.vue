<script setup lang="ts">
import { onMounted } from 'vue';
import {
  CoarContextMenu,
  CoarMenuDivider,
  CoarMenuItem,
  CoarSubFlyout,
  useContextMenu,
} from '@cocoar/vue-ui';

const menu = useContextMenu();
// Opened on mount at a fixed point, as a right click there would; the spec opens the flyout.
onMounted(() => menu.open({ clientX: 120, clientY: 90 } as MouseEvent));
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Context menu with an open sub-flyout</h2>
    <CoarContextMenu :menu="menu">
      <CoarMenuItem label="Open" icon="external-link" />
      <CoarMenuItem label="Copy link" icon="link" />
      <CoarSubFlyout label="Move to" icon="folder" data-visual-flyout>
        <CoarMenuItem label="Projects" icon="folder" />
        <CoarMenuItem label="Archive" icon="folder" />
        <CoarMenuItem label="Shared (read only)" icon="folder" disabled />
      </CoarSubFlyout>
      <CoarMenuItem label="Rename (locked)" icon="pencil" disabled />
      <CoarMenuDivider />
      <CoarMenuItem label="Delete" icon="trash-2" />
    </CoarContextMenu>
  </section>
</template>
