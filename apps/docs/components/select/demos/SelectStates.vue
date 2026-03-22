<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 320px;">
    <CoarSelect :options="options" label="Required" placeholder="Required field" :required="true" />
    <CoarSelect :options="options" label="With Error" placeholder="Error state" error="Please select an option" />
    <CoarSelect :options="options" label="Disabled" placeholder="Disabled" :disabled="true" />
  </div>
</template>

<script setup lang="ts">
import { CoarSelect } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const options: CoarSelectOption<string>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];
</script>
