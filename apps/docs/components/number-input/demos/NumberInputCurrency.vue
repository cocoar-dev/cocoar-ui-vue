<template>
  <CoarFormField label="Price" style="max-width: 260px;">
    <CoarNumberInput v-model="amount" :decimals="2" placeholder="0.00">
      <template #suffixAction="{ disabled, readonly }">
        <CoarSelect
          v-model="currency"
          :options="currencies"
          aria-label="Currency"
          appearance="inline"
          width="content"
          :disabled="disabled"
          :readonly="readonly"
        />
      </template>
    </CoarNumberInput>
  </CoarFormField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarFormField, CoarNumberInput, CoarSelect } from '@cocoar/vue-ui';

const amount = ref<number | null>(129.9);
const currency = ref<string | null>('EUR');
const currencies = ['EUR', 'USD', 'CHF'].map((value) => ({ value, label: value }));
</script>
