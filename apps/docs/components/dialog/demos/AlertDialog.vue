<template>
  <CoarButton variant="secondary" @click="openAlert">Show Alert</CoarButton>
</template>

<script setup lang="ts">
import { CoarButton, useDialog } from '@cocoar/vue-ui';

const dialog = useDialog();

function openAlert() {
  dialog.alert('Session expired', 'Your session has expired. Please sign in again to continue.');
}
</script>
