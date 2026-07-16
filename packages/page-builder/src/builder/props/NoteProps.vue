<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarFormField, CoarTextInput, CoarSelect, type CoarSelectOption } from '@cocoar/vue-ui';
import type { NoteNode } from '../../schema';

const props = defineProps<{
  node: NoteNode;
  patch: (update: Partial<NoteNode>) => void;
}>();

const { t } = useI18n();

const VARIANT_OPTIONS: CoarSelectOption<string>[] = [
  { value: 'neutral', label: 'neutral' },
  { value: 'info', label: 'info' },
  { value: 'success', label: 'success' },
  { value: 'warning', label: 'warning' },
  { value: 'error', label: 'error' },
  { value: 'accent', label: 'accent' },
];
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.text', undefined, 'Text')">
    <CoarTextInput
      :model-value="props.node.text ?? ''"
      :rows="3"
      @update:model-value="(v) => props.patch({ text: v })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.variant', undefined, 'Variant')">
    <CoarSelect
      :model-value="props.node.variant ?? 'neutral'"
      :options="VARIANT_OPTIONS"
      @update:model-value="(v) => props.patch({ variant: v as NoteNode['variant'] })"
    />
  </CoarFormField>
</template>
