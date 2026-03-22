<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton variant="secondary" @click="showLong">Long duration (6s)</CoarButton>
    <CoarButton variant="secondary" @click="showPersistent">Persistent (no auto-dismiss)</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, useToast } from '@cocoar/vue-ui';

const toast = useToast();

function showLong() {
  toast.info('This is a longer notification message that contains more detailed information about what just happened in the application.', {
    title: 'Detailed Message',
    duration: 6000,
  });
}

function showPersistent() {
  toast.warning('This notification stays until dismissed.', {
    title: 'Persistent',
    duration: 0,
  });
}
</script>
