<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import {
  CoarFormField,
  CoarTextInput,
} from '@cocoar/vue-ui';
import type { LinkNode } from '../../schema';

const props = defineProps<{
  node: LinkNode;
  patch: (update: Partial<Omit<LinkNode, 'props'>> & { props?: Partial<LinkNode['props']> }) => void;
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
</template>
