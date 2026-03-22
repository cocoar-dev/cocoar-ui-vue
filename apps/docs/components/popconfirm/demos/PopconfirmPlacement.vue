<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopconfirm title="Top placement" message="Appears above the trigger." placement="top" @confirmed="lastAction = 'top'">
      <CoarButton variant="secondary">Top</CoarButton>
    </CoarPopconfirm>
    <CoarPopconfirm title="Bottom placement" message="Appears below the trigger." placement="bottom" @confirmed="lastAction = 'bottom'">
      <CoarButton variant="secondary">Bottom</CoarButton>
    </CoarPopconfirm>
    <CoarPopconfirm title="Right placement" message="Appears to the right." placement="right" @confirmed="lastAction = 'right'">
      <CoarButton variant="secondary">Right</CoarButton>
    </CoarPopconfirm>
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
    Last action: {{ lastAction || 'none' }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarPopconfirm } from '@cocoar/vue-ui';

const lastAction = ref('');
</script>
