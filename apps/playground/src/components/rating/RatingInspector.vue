<script setup lang="ts">
import { CoarFormField, CoarTextInput, CoarNumberInput } from '@cocoar/vue-ui';
import type { ElementNode } from '@cocoar/vue-page-builder';
import type { RatingProps } from './ratingProps';

defineProps<{
  node: ElementNode<string, RatingProps>;
  patch: (update: { props?: Partial<RatingProps> }) => void;
}>();
</script>

<template>
  <CoarFormField label="Label">
    <CoarTextInput
      :model-value="node.props.label ?? ''"
      @update:model-value="(v) => patch({ props: { label: v } })"
    />
  </CoarFormField>
  <CoarFormField label="Max stars">
    <CoarNumberInput
      :model-value="node.props.max"
      :min="1"
      :max="10"
      @update:model-value="(v) => patch({ props: { max: v ?? 5 } })"
    />
  </CoarFormField>
</template>
