<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">4-digit PIN</div>
      <CoarOtpInput v-model="pin4" :length="4" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">6-digit TOTP (default)</div>
      <CoarOtpInput v-model="pin6" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">8-digit backup code</div>
      <CoarOtpInput v-model="pin8" :length="8" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarOtpInput } from '@cocoar/vue-ui';

const pin4 = ref('');
const pin6 = ref('');
const pin8 = ref('');
</script>
