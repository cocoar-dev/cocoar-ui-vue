<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div><CoarLink to="/getting-started">Active link</CoarLink></div>
    <div><CoarLink to="/components/button" disabled>Disabled link</CoarLink></div>
  </div>
</template>

<script setup lang="ts">
import { CoarLink } from '@cocoar/vue-ui';
</script>
