<template>
  <div style="display: flex; flex-direction: column; gap: 24px; max-width: 320px;">
    <div>
      <CoarMultiSelect
        v-model="multiValue"
        :options="fruitOptions"
        label="Favorite fruits"
        placeholder="Choose multiple..."
      />
      <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
        Selected: {{ multiValue.join(', ') || 'none' }}
      </p>
    </div>
    <div>
      <CoarTagSelect
        v-model="tagValue"
        :options="countryOptions"
        label="Countries"
        placeholder="Add countries..."
      />
      <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
        Selected: {{ tagValue.join(', ') || 'none' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMultiSelect, CoarTagSelect } from '@cocoar/vue-ui';
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
