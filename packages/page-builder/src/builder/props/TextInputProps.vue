<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import {
  CoarFormField,
  CoarTextInput,
  CoarCheckbox,
  CoarNumberInput,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { FieldValidation, TextInputNode } from '../../schema';

const props = defineProps<{
  node: TextInputNode;
  patch: (update: Partial<TextInputNode>) => void;
}>();

const { t } = useI18n();

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
  <CoarFormField :label="t('coar.pageBuilder.props.label', undefined, 'Label')">
    <CoarTextInput
      :model-value="props.node.props.label ?? ''"
      @update:model-value="(v) => props.patch({ props: { label: v } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.name', undefined, 'Name (field key)')">
    <CoarTextInput
      :model-value="props.node.name ?? ''"
      @update:model-value="(v) => props.patch({ name: v })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.placeholder', undefined, 'Placeholder')">
    <CoarTextInput
      :model-value="props.node.props.placeholder ?? ''"
      @update:model-value="(v) => props.patch({ props: { placeholder: v } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.inputType', undefined, 'Input type')">
    <CoarSelect
      :model-value="props.node.props.inputType ?? 'text'"
      :options="INPUT_TYPE_OPTIONS"
      @update:model-value="(v) => props.patch({ props: { inputType: v as TextInputNode['props']['inputType'] } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.rows', undefined, 'Rows')">
    <CoarNumberInput
      clearable
      :min="1"
      :max="20"
      :model-value="props.node.props.rows ?? null"
      :placeholder="'1'"
      @update:model-value="(v) => props.patch({ props: { rows: v && v > 1 ? v : undefined } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.defaultValue', undefined, 'Default value')">
    <CoarTextInput
      :model-value="(props.node.defaultValue as string | undefined) ?? ''"
      @update:model-value="(v) => props.patch({ defaultValue: v })"
    />
  </CoarFormField>
  <CoarCheckbox
    :model-value="!!props.node.validation?.required"
    :label="t('coar.pageBuilder.props.required', undefined, 'Required')"
    @update:model-value="setRequired"
  />
  <CoarCheckbox
    :model-value="!!props.node.props.disabled"
    :label="t('coar.pageBuilder.props.disabled', undefined, 'Disabled')"
    @update:model-value="(v) => props.patch({ props: { disabled: v } })"
  />
</template>
