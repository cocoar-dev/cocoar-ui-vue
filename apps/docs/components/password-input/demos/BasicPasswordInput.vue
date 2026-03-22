<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Password">
      <CoarPasswordInput
        v-model="password"
        placeholder="Enter your password"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Length: {{ password.length }} characters</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPasswordInput, CoarFormField } from '@cocoar/vue-ui';

const password = ref('');
</script>
