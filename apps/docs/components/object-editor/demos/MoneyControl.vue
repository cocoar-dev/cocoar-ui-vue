<template>
  <CoarNumberInput
    :id="id"
    :model-value="amount"
    size="s"
    appearance="inline"
    width="content"
    :decimals="2"
    :locale="locale"
    placeholder="–"
    :readonly="readonly"
    :error="error"
    :aria-label="label"
    @update:model-value="update({ amount: $event ?? undefined })"
  >
    <template #suffixAction="{ disabled, readonly: locked }">
      <CoarSelect
        :model-value="currency"
        size="s"
        appearance="inline"
        width="content"
        :options="currencies"
        :disabled="disabled"
        :readonly="locked"
        aria-label="Currency"
        @update:model-value="update({ currency: $event ?? undefined })"
      />
    </template>
  </CoarNumberInput>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CoarNumberInput, CoarSelect } from '@cocoar/vue-ui';
import type { Money } from './money';

// The props every value control receives (CoarValueControlProps); this control
// does not need schema and options.
const props = defineProps<{
  modelValue?: Money;
  id: string;
  label: string;
  readonly: boolean;
  error: boolean;
  locale?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: Money] }>();

const amount = computed(() => props.modelValue?.amount ?? null);
const currency = computed(() => props.modelValue?.currency ?? null);
const currencies = ['EUR', 'USD', 'CHF'].map((value) => ({ value, label: value }));

function update(change: Money) {
  emit('update:modelValue', { ...props.modelValue, ...change });
}
</script>
