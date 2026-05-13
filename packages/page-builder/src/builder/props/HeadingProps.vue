<script setup lang="ts">
import {
  CoarFormField,
  CoarTextInput,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { HeadingNode } from '../../schema';

const props = defineProps<{
  node: HeadingNode;
  patch: (update: Partial<HeadingNode>) => void;
}>();

const LEVEL_OPTIONS: CoarSelectOption<number>[] = [
  { value: 1, label: 'H1' },
  { value: 2, label: 'H2' },
  { value: 3, label: 'H3' },
  { value: 4, label: 'H4' },
  { value: 5, label: 'H5' },
  { value: 6, label: 'H6' },
];
</script>

<template>
  <CoarFormField label="Text">
    <CoarTextInput
      :model-value="props.node.text ?? ''"
      @update:model-value="(v) => props.patch({ text: v })"
    />
  </CoarFormField>
  <CoarFormField label="Level">
    <CoarSelect
      :model-value="props.node.level ?? 2"
      :options="LEVEL_OPTIONS"
      @update:model-value="(v) => props.patch({ level: v as 1 | 2 | 3 | 4 | 5 | 6 })"
    />
  </CoarFormField>
</template>
