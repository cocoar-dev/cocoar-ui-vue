<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarFormField, CoarTextInput } from '@cocoar/vue-ui';
import type { SpacerNode } from '../../schema';

const props = defineProps<{
  node: SpacerNode;
  patch: (update: Partial<SpacerNode>) => void;
}>();

const { t } = useI18n();
</script>

<template>
  <CoarFormField
    :label="t('coar.pageBuilder.props.sizeCss', undefined, 'Size (CSS)')"
    :hint="t('coar.pageBuilder.props.spacerSizeHint', undefined, 'Leave empty to fill available space')"
  >
    <CoarTextInput size="s"
      :model-value="props.node.props.size ?? ''"
      placeholder="e.g. 24px"
      @update:model-value="(v) => props.patch({ props: { size: v } })"
    />
  </CoarFormField>
</template>
