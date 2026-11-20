<script setup lang="ts">
import { computed } from 'vue';
import { CoarSelect, CoarTag } from '@cocoar/vue-ui';
import type { JsonValue } from '../../core/schema';
import type { CoarValueControlProps } from '../types';

const props = withDefaults(defineProps<CoarValueControlProps<JsonValue>>(), { locale: undefined });
const emit = defineEmits<{ 'update:modelValue': [value: JsonValue | undefined] }>();
const selection = computed({
  get: () => props.modelValue ?? null,
  set: (value: JsonValue | null) => emit('update:modelValue', value ?? undefined),
});
// A long list is easier to search than to scroll.
const searchable = computed(() => props.options.length > 7);
// Fixed options read as categories (tags); options of a source, such as people, as plain text.
const asTags = computed(() => !props.schema['x-coar-options']);
const descriptionOf = (value: JsonValue) => props.options.find((option) => option.value === value)?.description;
</script>

<template>
  <CoarSelect
    :id="id"
    v-model="selection"
    size="s"
    appearance="inline"
    width="content"
    dropdown-max-width="20rem"
    :options="options"
    :searchable="searchable"
    :readonly="readonly"
    :error="error"
    :aria-label="label"
    placeholder="–"
  >
    <template #value="{ option, placeholder }">
      <CoarTag v-if="option && asTags" size="s" variant="info" borderless>{{ option.label }}</CoarTag>
      <span v-else>{{ option?.label ?? placeholder }}</span>
    </template>
    <template #option="{ option, selected }">
      <span class="coar-object-editor-option">
        <CoarTag v-if="asTags" size="s" :variant="selected ? 'accent' : 'info'" borderless>{{ option.label }}</CoarTag>
        <span v-else>{{ option.label }}</span>
        <small v-if="descriptionOf(option.value)">{{ descriptionOf(option.value) }}</small>
      </span>
    </template>
  </CoarSelect>
</template>
