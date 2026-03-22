<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
    <CoarTextInput
      v-model="bio"
      label="Bio"
      placeholder="Tell us about yourself..."
      :rows="4"
      hint="Max 500 characters"
    />
    <CoarTextInput label="6 Rows" :rows="6" placeholder="Taller textarea..." />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput } from '@cocoar/vue-ui';

const bio = ref('');
</script>
