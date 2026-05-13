<script setup lang="ts">
import {
  CoarFormField,
  CoarTextInput,
  CoarCheckbox,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { TextInputNode } from '../../schema';

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
  <CoarFormField label="Input type">
    <CoarSelect
      :model-value="props.node.inputType ?? 'text'"
      :options="INPUT_TYPE_OPTIONS"
      @update:model-value="(v) => props.patch({ inputType: v as TextInputNode['inputType'] })"
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
