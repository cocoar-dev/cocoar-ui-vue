<script setup lang="ts">
import { computed } from 'vue';
import { CoarTag } from '@cocoar/vue-ui';
import type { JsonValue } from '../../core/schema';
import type { CoarValueViewProps } from '../types';

const props = withDefaults(defineProps<CoarValueViewProps<JsonValue>>(), { locale: undefined });
const labels = computed(() => {
  const values = Array.isArray(props.value) ? props.value : props.value === undefined ? [] : [props.value];
  return values.map((value) => props.options.find((option) => option.value === value)?.label ?? String(value));
});
// Fixed options read as categories; free tags as plain tags; options of a source as text.
const variant = computed(() => (props.options.length ? 'info' : undefined));
const asText = computed(() => !!props.schema['x-coar-options']);
</script>

<template>
  <span v-if="asText">{{ labels.join(', ') }}</span>
  <span v-else class="coar-object-editor-tags">
    <CoarTag v-for="label in labels" :key="label" size="s" :variant="variant" :borderless="!!variant">{{
      label
    }}</CoarTag>
  </span>
</template>
