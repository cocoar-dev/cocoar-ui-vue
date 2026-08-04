<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarFormField, CoarTextInput, CoarSelect, type CoarSelectOption } from '@cocoar/vue-ui';
import type { NoteNode } from '../../schema';

const props = defineProps<{
  node: NoteNode;
  patch: (update: Partial<Omit<NoteNode, 'props'>> & { props?: Partial<NoteNode['props']> }) => void;
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
    <CoarTextInput size="s"
      :model-value="props.node.props.text ?? ''"
      :rows="3"
      @update:model-value="(v) => props.patch({ props: { text: v } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.variant', undefined, 'Variant')">
    <CoarSelect size="s"
      :model-value="props.node.props.variant ?? 'neutral'"
      :options="VARIANT_OPTIONS"
      @update:model-value="(v) => props.patch({ props: { variant: v as NoteNode['props']['variant'] } })"
    />
  </CoarFormField>
</template>
