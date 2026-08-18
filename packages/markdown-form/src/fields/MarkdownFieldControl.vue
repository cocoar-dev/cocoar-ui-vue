<script setup lang="ts">
import { computed } from 'vue';
import { CoarMarkdownEditor, type CoarMarkdownEditorToolEntry } from '@cocoar/vue-markdown-editor';
import type { MarkdownFormFieldControlProps } from '../types';

const props = defineProps<MarkdownFormFieldControlProps>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const value = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : ''));
const tools = computed<CoarMarkdownEditorToolEntry[]>(() => [...props.context.markdownTools]);
</script>

<template>
  <CoarMarkdownEditor
    :model-value="value"
    :placeholder="field.props['placeholder'] || field.id"
    :tools="tools"
    toolbar-mode="external"
    toolbar-position="top"
    flavor="gfm"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
