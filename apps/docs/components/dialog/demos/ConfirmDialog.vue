<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton variant="danger" icon-start="trash-2" @click="openConfirm">Delete Item</CoarButton>
    <CoarButton variant="primary" @click="openConfirmPrimary">Publish Changes</CoarButton>
    <CoarButton variant="secondary" @click="openLarge">Terms & Conditions</CoarButton>
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
    Last result: {{ lastResult || 'none' }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, useDialog } from '@cocoar/vue-ui';

const dialog = useDialog();
const lastResult = ref('');

function openConfirm() {
  dialog.confirm({
    title: 'Delete item?',
    message: 'This action cannot be undone. Are you sure you want to delete this item?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmVariant: 'danger',
  }).result.then((confirmed) => {
    lastResult.value = confirmed ? 'deleted' : 'cancelled';
  });
}

function openConfirmPrimary() {
  dialog.confirm({
    title: 'Publish changes?',
    message: 'This will make your changes visible to all users.',
    confirmText: 'Publish',
    cancelText: 'Not yet',
    confirmVariant: 'primary',
  }).result.then((confirmed) => {
    lastResult.value = confirmed ? 'published' : 'kept draft';
  });
}

function openLarge() {
  dialog.confirm({
    title: 'Terms & Conditions',
    message: 'By continuing, you agree to our Terms of Service and Privacy Policy. Please review the full terms before accepting. This agreement governs your use of the platform and all associated services.',
    confirmText: 'I Agree',
    cancelText: 'Decline',
    size: 'm',
  }).result.then((confirmed) => {
    lastResult.value = confirmed ? 'agreed' : 'declined';
  });
}
</script>
