<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarCard elevated padding="s">
      <span style="font-size: 14px;">Small padding (s)</span>
    </CoarCard>
    <CoarCard elevated padding="m">
      <span style="font-size: 14px;">Medium padding (m) — default</span>
    </CoarCard>
    <CoarCard elevated padding="l">
      <span style="font-size: 14px;">Large padding (l)</span>
    </CoarCard>
  </div>
</template>

<script setup lang="ts">
import { CoarCard } from '@cocoar/vue-ui';
</script>
