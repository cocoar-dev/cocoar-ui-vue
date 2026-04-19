<template>
  <div style="max-width: 320px; height: 300px;">
    <CoarListbox
      v-model="highlighted"
      :options="options"
      label="Items"
      searchable
      :search-fields="['label', 'group']"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const options: CoarListboxOption<string>[] = [
  { value: 'apple', label: 'Apple', group: 'Fruit' },
  { value: 'banana', label: 'Banana', group: 'Fruit' },
  { value: 'cherry', label: 'Cherry', group: 'Fruit' },
  { value: 'carrot', label: 'Carrot', group: 'Vegetable' },
  { value: 'potato', label: 'Potato', group: 'Vegetable' },
  { value: 'broccoli', label: 'Broccoli', group: 'Vegetable' },
];

const highlighted = ref<string[]>([]);
</script>
