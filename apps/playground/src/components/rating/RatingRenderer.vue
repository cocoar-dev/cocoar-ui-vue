<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField } from '@cocoar/vue-ui';
import { usePageElement, type ElementNode } from '@cocoar/vue-page-builder';
import RatingStars from './RatingStars.vue';
import type { RatingProps } from './ratingProps';

const props = defineProps<{ node: ElementNode<string, RatingProps> }>();

const ctx = usePageElement();
const name = computed(() => props.node.name);
</script>

<template>
  <CoarFormField
    :label="node.props.label"
    :required="node.validation?.required"
    :error="name ? ctx.getError(name) : ''"
  >
    <RatingStars
      :model-value="name ? Number(ctx.getValue(name) ?? 0) : 0"
      :max="node.props.max"
      @update:model-value="(v) => { if (name) { ctx.setValue(name, v); ctx.markTouched(name); } }"
    />
  </CoarFormField>
</template>
