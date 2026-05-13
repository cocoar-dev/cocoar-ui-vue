<script setup lang="ts">
import { CoarFormField, CoarTextInput, CoarCheckbox } from '@cocoar/vue-ui';
import type { SelectNode } from '../../schema';

const props = defineProps<{
  node: SelectNode;
  patch: (update: Partial<SelectNode>) => void;
}>();

function setRequired(v: boolean) {
  props.patch({ validation: v ? { required: true } : {} });
}
</script>

<template>
  <CoarFormField label="Label">
    <CoarTextInput
      :model-value="props.node.label ?? ''"
      @update:model-value="(v) => props.patch({ label: v })"
    />
  </CoarFormField>
  <CoarFormField label="Name (field key)">
    <CoarTextInput
      :model-value="props.node.name ?? ''"
      @update:model-value="(v) => props.patch({ name: v })"
    />
  </CoarFormField>
  <CoarFormField label="Placeholder">
    <CoarTextInput
      :model-value="props.node.placeholder ?? ''"
      @update:model-value="(v) => props.patch({ placeholder: v })"
    />
  </CoarFormField>
  <CoarCheckbox
    :model-value="!!props.node.validation?.required"
    label="Required"
    @update:model-value="setRequired"
  />
  <CoarCheckbox
    :model-value="!!props.node.disabled"
    label="Disabled"
    @update:model-value="(v) => props.patch({ disabled: v })"
  />
</template>
