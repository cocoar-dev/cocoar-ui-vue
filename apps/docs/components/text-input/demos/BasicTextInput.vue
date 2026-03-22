<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarTextInput
      v-model="value"
      label="Username"
      placeholder="Enter your username"
      hint="Choose a unique username"
    />
    <span style="font-size: 13px; color: #64748b;">Value: {{ value || 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput } from '@cocoar/vue-ui';

const value = ref('');
</script>
