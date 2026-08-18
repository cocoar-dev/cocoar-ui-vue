<script setup lang="ts">
import { computed } from 'vue';
import { toEmbedProps } from '@cocoar/vue-markdown-core';
import FieldHost from './FieldHost.vue';
import { createMarkdownFormField } from './template-parser';

const props = withDefaults(
  defineProps<{
    fieldProps: Record<string, unknown>;
    defaultType?: string;
  }>(),
  {
    defaultType: 'text',
  },
);

const field = computed(() =>
  createMarkdownFormField(
    toEmbedProps(props.fieldProps),
    'block',
    `block:${String(props.fieldProps['id'] ?? crypto.randomUUID?.() ?? 'field')}`,
    props.defaultType,
  ),
);
</script>

<template>
  <FieldHost :field="field" />
</template>
