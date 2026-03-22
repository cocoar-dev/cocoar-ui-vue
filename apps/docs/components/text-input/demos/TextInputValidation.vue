<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarTextInput
      v-model="email"
      label="Email"
      placeholder="your@email.com"
      :required="true"
      hint="Required field"
    />
    <CoarTextInput
      label="Email"
      value="invalid-email"
      error="Please enter a valid email address"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput } from '@cocoar/vue-ui';

const email = ref('');
</script>
