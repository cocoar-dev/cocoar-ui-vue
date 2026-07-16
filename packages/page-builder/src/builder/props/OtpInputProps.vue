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
import type { OtpInputNode } from '../../schema';

const props = defineProps<{
  node: OtpInputNode;
  patch: (update: Partial<OtpInputNode>) => void;
}>();

const { t } = useI18n();

const OTP_TYPE_OPTIONS: CoarSelectOption<string>[] = [
  { value: 'numeric', label: 'numeric' },
  { value: 'alphanumeric', label: 'alphanumeric' },
  { value: 'text', label: 'text' },
];

function setRequired(v: boolean) {
  const next: NonNullable<OtpInputNode['validation']> = { ...props.node.validation };
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
  <CoarFormField :label="t('coar.pageBuilder.props.length', undefined, 'Length')">
    <CoarNumberInput
      clearable
      :min="3"
      :max="12"
      :model-value="props.node.props.length ?? null"
      :placeholder="'6'"
      @update:model-value="(v) => props.patch({ props: { length: v ?? undefined } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.otpType', undefined, 'Character set')">
    <CoarSelect
      :model-value="props.node.props.otpType ?? 'numeric'"
      :options="OTP_TYPE_OPTIONS"
      @update:model-value="(v) => props.patch({ props: { otpType: v as OtpInputNode['props']['otpType'] } })"
    />
  </CoarFormField>
  <CoarCheckbox
    :model-value="!!props.node.props.mask"
    :label="t('coar.pageBuilder.props.mask', undefined, 'Mask input')"
    @update:model-value="(v) => props.patch({ props: { mask: v || undefined } })"
  />
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
