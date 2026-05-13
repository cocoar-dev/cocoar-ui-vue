<script setup lang="ts">
import { CoarFormField, CoarTextInput } from '@cocoar/vue-ui';
import type { SpacerNode } from '../../schema';

const props = defineProps<{
  node: SpacerNode;
  patch: (update: Partial<SpacerNode>) => void;
}>();
</script>

<template>
  <CoarFormField
    label="Size (CSS)"
    hint="Leave empty to fill available space"
  >
    <CoarTextInput
      :model-value="props.node.size ?? ''"
      placeholder="e.g. 24px"
      @update:model-value="(v) => props.patch({ size: v })"
    />
  </CoarFormField>
</template>
