<template>
  <p style="margin: 0; line-height: 2.4;">
    Ship to
    <CoarSelect v-model="city" :options="cities" appearance="inline" width="content" searchable />
    by
    <CoarSelect v-model="method" :options="methods" appearance="inline" width="content" placeholder="method" />
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSelect } from '@cocoar/vue-ui';

const city = ref<string | null>('vie');
const cities = [
  { value: 'vie', label: 'Vienna' },
  { value: 'ber', label: 'Berlin' },
  { value: 'zrh', label: 'Zurich' },
  { value: 'ams', label: 'Amsterdam' },
];
const method = ref<string | null>(null);
const methods = [
  { value: 'standard', label: 'Standard' },
  { value: 'express', label: 'Express' },
];
</script>
