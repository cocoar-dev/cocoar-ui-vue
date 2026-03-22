<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 320px;">
    <CoarFormField label="Full Name" hint="Enter your first and last name">
      <CoarTextInput v-model="name" placeholder="Jane Doe" />
    </CoarFormField>
    <CoarFormField label="Email" error="Please enter a valid email address">
      <CoarTextInput value="not-an-email" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const name = ref('');
</script>
