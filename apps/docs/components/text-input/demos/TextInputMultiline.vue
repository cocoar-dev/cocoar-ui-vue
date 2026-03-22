<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
    <CoarFormField label="Bio" hint="Max 500 characters">
      <CoarTextInput
        v-model="bio"
        placeholder="Tell us about yourself..."
        :rows="4"
      />
    </CoarFormField>
    <CoarFormField label="6 Rows">
      <CoarTextInput :rows="6" placeholder="Taller textarea..." />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const bio = ref('');
</script>
