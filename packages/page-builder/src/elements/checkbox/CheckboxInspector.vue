<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarFormField, CoarTextInput, CoarCheckbox } from '@cocoar/vue-ui';
import type { CheckboxNode } from '../../schema';

const props = defineProps<{
  node: CheckboxNode;
  patch: (update: Partial<Omit<CheckboxNode, 'props'>> & { props?: Partial<CheckboxNode['props']> }) => void;
}>();

const { t } = useI18n();
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.label', undefined, 'Label')">
    <CoarTextInput
size="s"
      :model-value="props.node.props.label ?? ''"
      @update:model-value="(v) => props.patch({ props: { label: v } })"
    />
  </CoarFormField>
  <CoarCheckbox
size="s"
    :model-value="!!props.node.props.disabled"
    :label="t('coar.pageBuilder.props.disabled', undefined, 'Disabled')"
    @update:model-value="(v) => props.patch({ props: { disabled: v } })"
  />
</template>
