<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarFormField, CoarTextInput } from '@cocoar/vue-ui';
import type { CardNode } from '../../schema';

const props = defineProps<{
  node: CardNode;
  patch: (update: Partial<CardNode>) => void;
}>();

const { t } = useI18n();
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.title', undefined, 'Title')">
    <CoarTextInput
      :model-value="props.node.title ?? ''"
      @update:model-value="(v) => props.patch({ title: v })"
    />
  </CoarFormField>
</template>
