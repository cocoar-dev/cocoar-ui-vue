<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopconfirm
      title="Remove from team?"
      message="The user will lose access immediately."
      confirmText="Yes, remove"
      cancelText="Keep member"
      confirmVariant="danger"
      @confirmed="lastAction = 'removed'"
    >
      <CoarButton variant="danger">Remove Member</CoarButton>
    </CoarPopconfirm>

    <CoarPopconfirm
      title="Publish changes?"
      message="This will be visible to all users."
      confirmText="Publish now"
      cancelText="Not yet"
      @confirmed="lastAction = 'published'"
    >
      <CoarButton variant="primary">Publish</CoarButton>
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
