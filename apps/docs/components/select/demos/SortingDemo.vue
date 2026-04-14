<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <CoarSelect v-model="sortGroups" :options="sortPresetOptions" :searchable="false" size="s" style="width: 150px;" placeholder="sortGroups" />
      <CoarSelect v-model="sortOptions" :options="sortPresetOptions" :searchable="false" size="s" style="width: 150px;" placeholder="sortOptions" />
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 640px;">
      <CoarFormField label="With groups">
        <CoarSelect
          v-model="value1"
          :options="groupedOptions"
          :sort-groups="sortGroups"
          :sort-options="sortOptions"
          clearable
          searchable
          placeholder="Select..."
        />
      </CoarFormField>

      <CoarFormField label="Without groups">
        <CoarSelect
          v-model="value2"
          :options="flatOptions"
          :sort-options="sortOptions"
          clearable
          searchable
          placeholder="Select..."
        />
      </CoarFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSelect, CoarFormField } from '@cocoar/vue-ui';
import type { CoarSelectOption, CoarSelectSortGroups, CoarSelectSortOptions } from '@cocoar/vue-ui';

const value1 = ref<string | null>(null);
const value2 = ref<string | null>(null);
const sortGroups = ref<CoarSelectSortGroups>('asc');
const sortOptions = ref<CoarSelectSortOptions>('none');

const sortPresetOptions: CoarSelectOption<string>[] = [
  { value: 'asc', label: 'asc' },
  { value: 'desc', label: 'desc' },
  { value: 'none', label: 'none' },
];

const groupedOptions: CoarSelectOption<string>[] = [
  { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
  { value: 'broccoli', label: 'Broccoli', group: 'Vegetables' },
  { value: 'spinach', label: 'Spinach', group: 'Vegetables' },
  { value: 'banana', label: 'Banana', group: 'Fruits' },
  { value: 'apple', label: 'Apple', group: 'Fruits' },
  { value: 'cherry', label: 'Cherry', group: 'Fruits' },
  { value: 'salmon', label: 'Salmon', group: 'Protein' },
  { value: 'chicken', label: 'Chicken', group: 'Protein' },
  { value: 'tofu', label: 'Tofu', group: 'Protein' },
];

const flatOptions: CoarSelectOption<string>[] = groupedOptions.map(({ group, ...rest }) => rest);
</script>
