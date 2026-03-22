<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Website">
      <CoarTextInput v-model="website" placeholder="example.com" prefix="https://" />
    </CoarFormField>
    <CoarFormField label="Price">
      <CoarTextInput v-model="price" placeholder="0.00" suffix="EUR" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const website = ref('');
const price = ref('');
</script>
