<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarPasswordInput
      v-model="password"
      label="New Password"
      placeholder="Min 8 characters"
      :required="true"
      hint="Use a mix of letters, numbers, and symbols"
      :error="password.length > 0 && password.length < 8 ? 'Password must be at least 8 characters' : ''"
    />
    <CoarPasswordInput
      v-model="confirm"
      label="Confirm Password"
      placeholder="Repeat your password"
      :error="confirm.length > 0 && confirm !== password ? 'Passwords do not match' : ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPasswordInput } from '@cocoar/vue-ui';

const password = ref('');
const confirm = ref('');
</script>
