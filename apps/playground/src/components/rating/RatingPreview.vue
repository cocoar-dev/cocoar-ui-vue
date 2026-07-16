<script setup lang="ts">
import { CoarFormField } from '@cocoar/vue-ui';
import type { ElementNode } from '@cocoar/vue-page-builder';
import RatingStars from './RatingStars.vue';
import type { RatingProps } from './ratingProps';

defineProps<{
  node: ElementNode<string, RatingProps>;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarFormField :label="node.props.label" :required="node.validation?.required">
    <RatingStars :model-value="Number(node.defaultValue ?? 0)" :max="node.props.max" readonly />
  </CoarFormField>
</template>
