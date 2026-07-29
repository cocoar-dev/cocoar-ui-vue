<script setup lang="ts">
import { CoarNotice } from '@cocoar/vue-ui';
</script>

<template>
  <div class="notice-stack">
    <CoarNotice variant="info" label="Information">A newer version is available.</CoarNotice>
    <CoarNotice variant="success" label="Saved">All changes were stored successfully.</CoarNotice>
    <CoarNotice variant="warning" label="Temporary storage">Uploaded files are removed on restart.</CoarNotice>
    <CoarNotice variant="error" label="Connection failed">The service could not be reached.</CoarNotice>
    <CoarNotice variant="neutral">Scheduled maintenance starts tonight at 22:00.</CoarNotice>
    <CoarNotice variant="accent" label="New">Explore the updated workspace experience.</CoarNotice>
  </div>
</template>

<style scoped>
.notice-stack {
  display: grid;
  gap: 8px;
}
</style>
