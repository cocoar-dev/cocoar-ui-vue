<script setup lang="ts">
import { computed } from 'vue';
import {
  CoarFormField,
  CoarTextInput,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import { isContainerNode, type PageNode, type NodeStyle } from '../../schema';

const props = defineProps<{
  node: PageNode;
  patchStyle: (update: Partial<NodeStyle>) => void;
}>();

const isContainer = computed(() => isContainerNode(props.node));

const ALIGN_OPTIONS: CoarSelectOption<string>[] = [
  { value: '', label: '— inherit' },
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
  { value: 'stretch', label: 'stretch' },
];
</script>

<template>
  <CoarFormField v-if="isContainer" label="Gap">
    <CoarTextInput
      :model-value="props.node.style?.gap ?? ''"
      placeholder="e.g. 8px"
      @update:model-value="(v) => props.patchStyle({ gap: v })"
    />
  </CoarFormField>

  <CoarFormField label="Padding">
    <CoarTextInput
      :model-value="props.node.style?.padding ?? ''"
      placeholder="e.g. 16px"
      @update:model-value="(v) => props.patchStyle({ padding: v })"
    />
  </CoarFormField>

  <CoarFormField label="Width">
    <CoarTextInput
      :model-value="props.node.style?.width ?? ''"
      placeholder="e.g. 100%, 380px"
      @update:model-value="(v) => props.patchStyle({ width: v })"
    />
  </CoarFormField>

  <CoarFormField v-if="isContainer" label="Align children">
    <CoarSelect
      :model-value="props.node.style?.align ?? ''"
      :options="ALIGN_OPTIONS"
      @update:model-value="(v) => props.patchStyle({ align: (v || undefined) as NodeStyle['align'] })"
    />
  </CoarFormField>
</template>
