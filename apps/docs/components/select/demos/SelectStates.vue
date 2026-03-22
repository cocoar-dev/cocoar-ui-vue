<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 320px;">
    <CoarFormField label="Required" required>
      <CoarSelect :options="options" placeholder="Required field" :required="true" />
    </CoarFormField>
    <CoarFormField label="With Error" error="Please select an option">
      <CoarSelect :options="options" placeholder="Error state" />
    </CoarFormField>
    <CoarFormField label="Disabled">
      <CoarSelect :options="options" placeholder="Disabled" :disabled="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarSelect, CoarFormField } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const options: CoarSelectOption<string>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];
</script>
