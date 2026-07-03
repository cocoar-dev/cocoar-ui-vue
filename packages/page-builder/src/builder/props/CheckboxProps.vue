<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarFormField, CoarTextInput, CoarCheckbox } from '@cocoar/vue-ui';
import type { CheckboxNode } from '../../schema';

const props = defineProps<{
  node: CheckboxNode;
  patch: (update: Partial<CheckboxNode>) => void;
}>();

const { t } = useI18n();

function setRequired(v: boolean) {
  const next: NonNullable<CheckboxNode['validation']> = { ...props.node.validation };
  if (v) next.required = true;
  else delete next.required;
  props.patch({ validation: Object.keys(next).length > 0 ? next : undefined });
}
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.label', undefined, 'Label')">
    <CoarTextInput
      :model-value="props.node.label ?? ''"
      @update:model-value="(v) => props.patch({ label: v })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.name', undefined, 'Name (field key)')">
    <CoarTextInput
      :model-value="props.node.name ?? ''"
      @update:model-value="(v) => props.patch({ name: v })"
    />
  </CoarFormField>
  <CoarCheckbox
    :model-value="!!props.node.defaultValue"
    :label="t('coar.pageBuilder.props.checkedByDefault', undefined, 'Checked by default')"
    @update:model-value="(v) => props.patch({ defaultValue: v || undefined })"
  />
  <CoarCheckbox
    :model-value="!!props.node.validation?.required"
    :label="t('coar.pageBuilder.props.required', undefined, 'Required')"
    @update:model-value="setRequired"
  />
  <CoarCheckbox
    :model-value="!!props.node.disabled"
    :label="t('coar.pageBuilder.props.disabled', undefined, 'Disabled')"
    @update:model-value="(v) => props.patch({ disabled: v })"
  />
</template>
