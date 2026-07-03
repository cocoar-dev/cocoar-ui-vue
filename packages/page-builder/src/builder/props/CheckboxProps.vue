<script setup lang="ts">
import { CoarFormField, CoarTextInput, CoarCheckbox } from '@cocoar/vue-ui';
import type { CheckboxNode } from '../../schema';

const props = defineProps<{
  node: CheckboxNode;
  patch: (update: Partial<CheckboxNode>) => void;
}>();

function setRequired(v: boolean) {
  const next: NonNullable<CheckboxNode['validation']> = { ...props.node.validation };
  if (v) next.required = true;
  else delete next.required;
  props.patch({ validation: Object.keys(next).length > 0 ? next : undefined });
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
  <CoarCheckbox
    :model-value="!!props.node.defaultValue"
    label="Checked by default"
    @update:model-value="(v) => props.patch({ defaultValue: v || undefined })"
  />
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
