<script setup lang="ts">
import { CoarLink, CoarNotice } from '@cocoar/vue-ui';
</script>

<template>
  <CoarNotice variant="info" label="Indexing">
    Three files are still being processed.
    <template #details>
      Search results may be incomplete until all uploaded files have been indexed.
    </template>
    <template #cta>
      <CoarLink size="s">View files</CoarLink>
    </template>
  </CoarNotice>
</template>
