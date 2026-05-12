<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;">
    <CoarFormField label="Verification code" hint="Enter the 6-digit code from your authenticator app">
      <CoarOtpInput v-model="value" auto-focus @complete="onComplete" />
    </CoarFormField>
    <div style="font-size: 13px; color: #64748b;">
      <div>Value: <strong>{{ value || 'empty' }}</strong></div>
      <div v-if="submittedValue">Auto-submitted: <strong>{{ submittedValue }}</strong></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarOtpInput, CoarFormField } from '@cocoar/vue-ui';

const value = ref('');
const submittedValue = ref('');

function onComplete(code: string) {
  submittedValue.value = code;
  // In real apps, call your verify endpoint here.
}
</script>
