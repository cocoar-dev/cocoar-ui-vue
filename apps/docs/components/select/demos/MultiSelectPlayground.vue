<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
      <CoarCheckbox v-model="grouped" label="grouped" />
      <CoarCheckbox v-model="searchable" label="searchable" />
      <CoarCheckbox v-model="clearable" label="clearable" />
      <CoarCheckbox v-model="showSelectAll" label="showSelectAll" />
      <CoarCheckbox v-model="disabled" label="disabled" />
      <CoarCheckbox v-model="readonly" label="readonly" />
      <CoarCheckbox v-model="error" label="error" />
      <CoarSelect v-model="size" :options="sizeOptions" :searchable="false" size="s" style="width: 90px;" />
      <CoarSelect v-model="appearance" :options="appearanceOptions" :searchable="false" size="s" style="width: 120px;" />
    </div>

    <div style="max-width: 320px;">
      <CoarFormField label="Countries">
        <CoarMultiSelect
          v-model="value"
          :options="activeOptions"
          :searchable="searchable"
          :clearable="clearable"
          :show-select-all="showSelectAll"
          :disabled="disabled"
          :readonly="readonly"
          :error="error"
          :size="size"
          :appearance="appearance"
          placeholder="Select countries..."
        />
      </CoarFormField>
      <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
        Selected: {{ value.join(', ') || 'none' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarMultiSelect, CoarSelect, CoarCheckbox, CoarFormField } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const value = ref<string[]>([]);
const grouped = ref(true);
const searchable = ref(false);
const clearable = ref(false);
const showSelectAll = ref(false);
const disabled = ref(false);
const readonly = ref(false);
const error = ref(false);
const size = ref<'xs' | 's' | 'm' | 'l'>('m');
const appearance = ref<'outline' | 'inline'>('outline');

const groupedOptions: CoarSelectOption<string>[] = [
  { value: 'at', label: 'Austria', group: 'Central Europe' },
  { value: 'de', label: 'Germany', group: 'Central Europe' },
  { value: 'ch', label: 'Switzerland', group: 'Central Europe' },
  { value: 'fr', label: 'France', group: 'Western Europe' },
  { value: 'nl', label: 'Netherlands', group: 'Western Europe' },
  { value: 'be', label: 'Belgium', group: 'Western Europe' },
  { value: 'es', label: 'Spain', group: 'Southern Europe' },
  { value: 'it', label: 'Italy', group: 'Southern Europe' },
  { value: 'pt', label: 'Portugal', group: 'Southern Europe' },
  { value: 'se', label: 'Sweden', group: 'Northern Europe' },
  { value: 'no', label: 'Norway', group: 'Northern Europe' },
  { value: 'dk', label: 'Denmark', group: 'Northern Europe' },
];

const flatOptions: CoarSelectOption<string>[] = groupedOptions.map(({ group, ...rest }) => rest);

const activeOptions = computed(() => grouped.value ? groupedOptions : flatOptions);

const sizeOptions: CoarSelectOption<string>[] = [
  { value: 'xs', label: 'xs' },
  { value: 's', label: 's' },
  { value: 'm', label: 'm' },
  { value: 'l', label: 'l' },
];

const appearanceOptions: CoarSelectOption<string>[] = [
  { value: 'outline', label: 'outline' },
  { value: 'inline', label: 'inline' },
];
</script>
