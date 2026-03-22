<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopconfirm
      title="Are you sure?"
      message="This is a destructive action."
      confirmVariant="danger"
      @confirmed="lastAction = 'danger-confirmed'"
    >
      <CoarButton variant="danger">Danger</CoarButton>
    </CoarPopconfirm>

    <CoarPopconfirm
      title="Confirm action"
      message="This will apply the changes."
      confirmVariant="primary"
      @confirmed="lastAction = 'primary-confirmed'"
    >
      <CoarButton variant="primary">Primary</CoarButton>
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
