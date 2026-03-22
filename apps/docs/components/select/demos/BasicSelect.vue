<template>
  <div style="max-width: 320px;">
    <CoarFormField label="Favorite fruit">
      <CoarSelect
        v-model="value"
        :options="options"
        placeholder="Choose a fruit..."
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
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
  { value: 'fig', label: 'Fig' },
];

const value = ref<string | null>(null);
</script>
