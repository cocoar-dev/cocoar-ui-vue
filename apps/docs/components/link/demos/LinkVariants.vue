<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div><CoarLink to="/getting-started">Accent link (default)</CoarLink> — Primary interactive text</div>
    <div><CoarLink to="/changelog" variant="subtle">Subtle link</CoarLink> — Secondary actions, less emphasis</div>
  </div>
</template>

<script setup lang="ts">
import { CoarLink } from '@cocoar/vue-ui';
</script>
