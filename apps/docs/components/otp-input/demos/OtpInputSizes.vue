<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">xs</div>
      <CoarOtpInput v-model="xs" size="xs" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">s</div>
      <CoarOtpInput v-model="s" size="s" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">m (default)</div>
      <CoarOtpInput v-model="m" size="m" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">l</div>
      <CoarOtpInput v-model="l" size="l" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarOtpInput } from '@cocoar/vue-ui';

const xs = ref('');
const s = ref('');
const m = ref('');
const l = ref('');
</script>
