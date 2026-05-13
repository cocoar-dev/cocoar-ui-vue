<script setup lang="ts">
import { CoarFormField, CoarTextInput } from '@cocoar/vue-ui';
import type { SectionNode } from '../../schema';

const props = defineProps<{
  node: SectionNode;
  patch: (update: Partial<SectionNode>) => void;
}>();
</script>

<template>
  <CoarFormField label="Title">
    <CoarTextInput
      :model-value="props.node.title ?? ''"
      @update:model-value="(v) => props.patch({ title: v })"
    />
  </CoarFormField>
</template>
