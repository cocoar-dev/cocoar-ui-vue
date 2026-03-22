<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarCard variant="info" elevated><span style="font-size: 14px;">Info — tips, guidance, neutral context</span></CoarCard>
    <CoarCard variant="success" elevated><span style="font-size: 14px;">Success — positive results</span></CoarCard>
    <CoarCard variant="warning" elevated><span style="font-size: 14px;">Warning — caution, attention needed</span></CoarCard>
    <CoarCard variant="error" elevated><span style="font-size: 14px;">Error — problems, validation failures</span></CoarCard>
    <CoarCard variant="neutral" elevated><span style="font-size: 14px;">Neutral — default, no semantic meaning</span></CoarCard>
  </div>
</template>

<script setup lang="ts">
import { CoarCard } from '@cocoar/vue-ui';
</script>
