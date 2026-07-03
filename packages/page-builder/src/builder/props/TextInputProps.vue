<script setup lang="ts">
import {
  CoarFormField,
  CoarTextInput,
  CoarCheckbox,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { FieldValidation, TextInputNode } from '../../schema';

const props = defineProps<{
  node: TextInputNode;
  patch: (update: Partial<TextInputNode>) => void;
}>();

const INPUT_TYPE_OPTIONS: CoarSelectOption<string>[] = [
  { value: 'text', label: 'text' },
  { value: 'email', label: 'email' },
  { value: 'password', label: 'password' },
  { value: 'url', label: 'url' },
];

function setRequired(v: boolean) {
  // Merge into the existing rules — JSON-authored minLength/pattern/matchField/
  // message must survive toggling Required in the panel.
  const next: FieldValidation = { ...props.node.validation };
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
  <CoarFormField label="Placeholder">
    <CoarTextInput
      :model-value="props.node.placeholder ?? ''"
      @update:model-value="(v) => props.patch({ placeholder: v })"
    />
  </CoarFormField>
  <CoarFormField label="Input type">
    <CoarSelect
      :model-value="props.node.inputType ?? 'text'"
      :options="INPUT_TYPE_OPTIONS"
      @update:model-value="(v) => props.patch({ inputType: v as TextInputNode['inputType'] })"
    />
  </CoarFormField>
  <CoarFormField label="Default value">
    <CoarTextInput
      :model-value="props.node.defaultValue ?? ''"
      @update:model-value="(v) => props.patch({ defaultValue: v })"
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
