<script setup lang="ts">
import { computed } from 'vue';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { parse } from '@cocoar/vue-markdown-core';
import type { MarkdownFormFieldReadonlyProps } from '../types';

const props = defineProps<MarkdownFormFieldReadonlyProps>();
const value = computed(() => (typeof props.modelValue === 'string' ? props.modelValue : ''));
const doc = computed(() => parse(value.value));
</script>

<template>
  <CoarMarkdown v-if="value" :doc="doc" />
  <span v-else class="coar-markdown-form-field__empty">{{ context.messages.empty }}</span>
</template>
