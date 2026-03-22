<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <span style="font-size: 13px; color: #64748b;">Default</span>
      <CoarProgressBar :value="75" />
    </div>
    <div>
      <span style="font-size: 13px; color: #64748b;">Info</span>
      <CoarProgressBar :value="75" variant="info" />
    </div>
    <div>
      <span style="font-size: 13px; color: #64748b;">Success</span>
      <CoarProgressBar :value="75" variant="success" />
    </div>
    <div>
      <span style="font-size: 13px; color: #64748b;">Warning</span>
      <CoarProgressBar :value="75" variant="warning" />
    </div>
    <div>
      <span style="font-size: 13px; color: #64748b;">Error</span>
      <CoarProgressBar :value="75" variant="error" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarProgressBar } from '@cocoar/vue-ui';
</script>
