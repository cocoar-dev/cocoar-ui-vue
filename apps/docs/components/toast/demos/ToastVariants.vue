<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton variant="primary" @click="showSuccess">Success</CoarButton>
    <CoarButton variant="danger" @click="showError">Error</CoarButton>
    <CoarButton variant="secondary" @click="showWarning">Warning</CoarButton>
    <CoarButton variant="ghost" @click="showInfo">Info</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, useToast } from '@cocoar/vue-ui';

const toast = useToast();

function showSuccess() {
  toast.success('Changes saved successfully!', { title: 'Saved' });
}
function showError() {
  toast.error('Something went wrong. Please try again.', { title: 'Error' });
}
function showWarning() {
  toast.warning('Your session will expire in 5 minutes.', { title: 'Warning' });
}
function showInfo() {
  toast.info('A new version is available. Refresh to update.', { title: 'Update Available' });
}
</script>
