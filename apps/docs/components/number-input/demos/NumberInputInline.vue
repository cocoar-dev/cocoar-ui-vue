<template>
  <p style="margin: 0; line-height: 2.4;">
    Order
    <CoarNumberInput v-model="quantity" appearance="inline" width="content" :min="1" stepper-buttons="both" />
    units at
    <CoarNumberInput v-model="price" appearance="inline" width="content" :decimals="2" suffix="EUR" />
    each.
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarNumberInput } from '@cocoar/vue-ui';

const quantity = ref<number | null>(3);
const price = ref<number | null>(49.9);
</script>
