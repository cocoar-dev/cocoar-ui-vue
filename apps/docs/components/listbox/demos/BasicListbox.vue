<template>
  <div style="max-width: 320px; height: 260px;">
    <CoarListbox
      v-model="highlighted"
      :options="options"
      label="Fruit"
      show-count
      searchable
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Highlighted: {{ highlighted.join(', ') || 'none' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const options: CoarListboxOption<string>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
  { value: 'fig', label: 'Fig' },
];

const highlighted = ref<string[]>([]);
</script>
