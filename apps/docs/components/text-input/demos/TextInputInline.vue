<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 480px;">
    <p style="margin: 0; line-height: 2.4;">
      The
      <CoarTextInput v-model="product" appearance="inline" width="content" placeholder="product" />
      ships from
      <CoarTextInput v-model="city" appearance="inline" width="content" placeholder="city" />
      · in stock
    </p>
    <CoarFormField label="Description">
      <CoarTextInput v-model="description" appearance="inline" :rows="2" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const product = ref('Cocoar Desk Lamp');
const city = ref('');
const description = ref('Dimmable LED lamp with a warm white setting.');
</script>
