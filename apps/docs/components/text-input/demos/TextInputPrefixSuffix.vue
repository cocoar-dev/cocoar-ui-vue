<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarTextInput v-model="website" label="Website" placeholder="example.com" prefix="https://" />
    <CoarTextInput v-model="price" label="Price" placeholder="0.00" suffix="EUR" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput } from '@cocoar/vue-ui';

const website = ref('');
const price = ref('');
</script>
