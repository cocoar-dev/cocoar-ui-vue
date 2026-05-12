<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">numeric (default) — digits only</div>
      <CoarOtpInput v-model="numeric" type="numeric" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">alphanumeric — letters + digits (claim codes, recovery keys)</div>
      <CoarOtpInput v-model="alpha" type="alphanumeric" :length="8" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">mask=true — visually mask digits as ●</div>
      <CoarOtpInput v-model="masked" mask :length="4" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarOtpInput } from '@cocoar/vue-ui';

const numeric = ref('');
const alpha = ref('');
const masked = ref('');
</script>
