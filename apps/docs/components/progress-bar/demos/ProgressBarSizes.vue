<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <span style="font-size: 13px; color: #64748b;">Small</span>
      <CoarProgressBar :value="60" size="s" />
    </div>
    <div>
      <span style="font-size: 13px; color: #64748b;">Medium (default)</span>
      <CoarProgressBar :value="60" size="m" />
    </div>
    <div>
      <span style="font-size: 13px; color: #64748b;">Large</span>
      <CoarProgressBar :value="60" size="l" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarProgressBar } from '@cocoar/vue-ui';
</script>
