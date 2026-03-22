<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Username" hint="Choose a unique username">
      <CoarTextInput
        v-model="value"
        placeholder="Enter your username"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Value: {{ value || 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const value = ref('');
</script>
