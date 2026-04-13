<template>
  <div style="max-width: 320px;">
    <CoarFormField label="Country">
      <CoarSelect
        v-model="value"
        :options="options"
        searchable
        clearable
        placeholder="Select a country..."
      />
    </CoarFormField>
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Selected: {{ value || 'none' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSelect, CoarFormField } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const options: CoarSelectOption<string>[] = [
  { value: 'at', label: 'Austria' },
  { value: 'de', label: 'Germany' },
  { value: 'ch', label: 'Switzerland' },
  { value: 'fr', label: 'France' },
  { value: 'it', label: 'Italy' },
  { value: 'es', label: 'Spain' },
  { value: 'pt', label: 'Portugal' },
  { value: 'nl', label: 'Netherlands' },
  { value: 'be', label: 'Belgium' },
  { value: 'se', label: 'Sweden' },
  { value: 'no', label: 'Norway' },
  { value: 'dk', label: 'Denmark' },
];

const value = ref<string | null>(null);
</script>
