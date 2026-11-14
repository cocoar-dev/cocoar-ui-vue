<script setup lang="ts">
// A confirmation as a bottom sheet on a phone (390×844), photographed only in the mobile presentation.
import { onMounted } from 'vue';
import { useDialog } from '@cocoar/vue-ui';

const dialog = useDialog();

// Opened on mount, as an app opens a confirmation: no pointer, no key press.
onMounted(() => {
  dialog.confirm({
    title: 'Delete the project?',
    message: 'The project and its 12 files are deleted for everyone. This cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Keep',
    confirmVariant: 'danger',
    presentation: 'sheet',
  });
});
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Confirm sheet over the page</h2>
    <p style="margin: 0">Page content behind the backdrop.</p>
  </section>
</template>
