<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField
      label="New Password"
      hint="Use a mix of letters, numbers, and symbols"
      :error="password.length > 0 && password.length < 8 ? 'Password must be at least 8 characters' : ''"
      required
    >
      <CoarPasswordInput
        v-model="password"
        placeholder="Min 8 characters"
        :required="true"
      />
    </CoarFormField>
    <CoarFormField
      label="Confirm Password"
      :error="confirm.length > 0 && confirm !== password ? 'Passwords do not match' : ''"
    >
      <CoarPasswordInput
        v-model="confirm"
        placeholder="Repeat your password"
      />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPasswordInput, CoarFormField } from '@cocoar/vue-ui';

const password = ref('');
const confirm = ref('');
</script>
