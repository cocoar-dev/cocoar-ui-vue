<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarCard elevated>
      <span style="font-size: 14px;">Elevated — box shadow for depth</span>
    </CoarCard>
    <CoarCard variant="outlined">
      <span style="font-size: 14px;">Outlined — border without shadow</span>
    </CoarCard>
  </div>
</template>

<script setup lang="ts">
import { CoarCard } from '@cocoar/vue-ui';
</script>
