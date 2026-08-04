<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarFormField, CoarTextInput } from '@cocoar/vue-ui';
import type { SectionNode } from '../../schema';

const props = defineProps<{
  node: SectionNode;
  patch: (update: Partial<SectionNode>) => void;
}>();

const { t } = useI18n();
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.title', undefined, 'Title')">
    <CoarTextInput size="s"
      :model-value="props.node.props.title ?? ''"
      @update:model-value="(v) => props.patch({ props: { title: v } })"
    />
  </CoarFormField>
</template>
