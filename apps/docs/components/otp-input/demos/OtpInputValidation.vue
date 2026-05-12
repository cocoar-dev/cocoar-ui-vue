<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 360px;">
    <CoarFormField
      label="Verification code"
      :error="error"
      hint="Try 123456 — anything else triggers an error"
    >
      <CoarOtpInput v-model="value" auto-focus @complete="verify" />
    </CoarFormField>
    <div v-if="verified" style="font-size: 13px; color: var(--coar-text-semantic-success-bold, #16a34a);">
      ✓ Code accepted
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarOtpInput, CoarFormField } from '@cocoar/vue-ui';

const value = ref('');
const error = ref('');
const verified = ref(false);

function verify(code: string) {
  if (code === '123456') {
    error.value = '';
    verified.value = true;
  } else {
    error.value = 'Invalid code. Try 123456.';
    verified.value = false;
  }
}
</script>
