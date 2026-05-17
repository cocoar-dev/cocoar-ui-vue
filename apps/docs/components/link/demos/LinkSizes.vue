<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div><CoarLink to="/changelog" size="s">Small link</CoarLink> — Compact contexts</div>
    <div><CoarLink to="/getting-started" size="m">Default link</CoarLink> — Body text size</div>
    <div><CoarLink to="/components/button" size="l">Large link</CoarLink> — Prominent CTAs</div>
  </div>
</template>

<script setup lang="ts">
import { CoarLink } from '@cocoar/vue-ui';
</script>
