<template>
  <div style="display: flex; flex-direction: column; gap: 24px; max-width: 320px;">
    <div>
      <CoarFormField label="Favorite fruits">
        <CoarMultiSelect
          v-model="multiValue"
          :options="fruitOptions"
          placeholder="Choose multiple..."
        />
      </CoarFormField>
      <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
        Selected: {{ multiValue.join(', ') || 'none' }}
      </p>
    </div>
    <div>
      <CoarFormField label="Countries">
        <CoarTagSelect
          v-model="tagValue"
          :options="countryOptions"
          placeholder="Add countries..."
        />
      </CoarFormField>
      <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
        Selected: {{ tagValue.join(', ') || 'none' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMultiSelect, CoarTagSelect, CoarFormField } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const fruitOptions: CoarSelectOption<string>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
  { value: 'fig', label: 'Fig' },
];

const countryOptions: CoarSelectOption<string>[] = [
  { value: 'us', label: 'United States' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
  { value: 'br', label: 'Brazil' },
  { value: 'au', label: 'Australia' },
];

const multiValue = ref<string[]>([]);
const tagValue = ref<string[]>([]);
</script>
