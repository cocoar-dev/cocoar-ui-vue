<script setup lang="ts">
import { CoarButton, useDialog } from '@cocoar/vue-ui';
import OverlayStackingInModalContent from './OverlayStackingInModalContent.vue';

const dialog = useDialog();

function openModal() {
  dialog.open(OverlayStackingInModalContent, {
    title: 'Overlay stacking inside modal',
    size: 'l',
  });
}
</script>

<template>
  <div class="view">
    <h2>Overlay-stacking diagnostic</h2>
    <p>
      Opens a modal containing one instance of every overlay-like component. Use this to
      verify that popover, tooltip, submenu, and context menu all render above the modal
      backdrop and do not close the dialog when the user interacts with them.
    </p>
    <CoarButton variant="primary" @click="openModal">Open stacking test modal</CoarButton>
  </div>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px;
}
</style>
