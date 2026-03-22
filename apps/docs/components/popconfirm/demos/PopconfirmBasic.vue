<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopconfirm
      title="Delete item?"
      message="This action cannot be undone."
      @confirmed="lastAction = 'deleted'"
      @cancelled="lastAction = 'cancelled'"
    >
      <CoarButton variant="danger" icon-start="trash-2">Delete</CoarButton>
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
