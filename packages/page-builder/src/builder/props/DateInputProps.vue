<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarFormField, CoarTextInput, CoarCheckbox, CoarPlainDatePicker } from '@cocoar/vue-ui';
import { isoToPlainDate } from '../../renderSafety';
import type { DateInputNode } from '../../schema';

const props = defineProps<{
  node: DateInputNode;
  patch: (update: Partial<DateInputNode>) => void;
}>();

const { t } = useI18n();

function setRequired(v: boolean) {
  const next: NonNullable<DateInputNode['validation']> = { ...props.node.validation };
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
  <CoarFormField :label="t('coar.pageBuilder.props.defaultValue', undefined, 'Default value')">
    <CoarPlainDatePicker
      clearable
      :model-value="isoToPlainDate(props.node.defaultValue)"
      @update:model-value="(d) => props.patch({ defaultValue: d ? d.toString() : undefined })"
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
