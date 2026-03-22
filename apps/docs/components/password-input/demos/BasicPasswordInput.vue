<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarPasswordInput
      v-model="password"
      label="Password"
      placeholder="Enter your password"
    />
    <span style="font-size: 13px; color: #64748b;">Length: {{ password.length }} characters</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPasswordInput } from '@cocoar/vue-ui';

const password = ref('');
</script>
