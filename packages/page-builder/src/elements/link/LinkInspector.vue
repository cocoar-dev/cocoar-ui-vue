<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import {
  CoarFormField,
  CoarTextInput,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { LinkNode } from '../../schema';
import { BUILDER_CONFIG } from '../../builder/builderContext';

const props = defineProps<{
  node: LinkNode;
  patch: (update: Partial<Omit<LinkNode, 'props'>> & { props?: Partial<LinkNode['props']> }) => void;
}>();

const { t } = useI18n();

const config = inject(BUILDER_CONFIG);

const actionOptions = computed<CoarSelectOption<string>[] | null>(() => {
  const list = config?.value?.availableActions;
  if (!list || list.length === 0) return null;
  const seen = new Set<string>();
  const opts: CoarSelectOption<string>[] = [
    { value: '', label: t('coar.pageBuilder.props.none', undefined, '— none') },
  ];
  for (const a of list) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    opts.push({ value: a.id, label: a.label });
  }
  const cur = props.node.props.action;
  if (cur && !seen.has(cur)) {
    opts.push({
      value: cur,
      label: t('coar.pageBuilder.props.notConfigured', { id: cur }, '{id} (not configured)'),
    });
  }
  return opts;
});
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.label', undefined, 'Label')">
    <CoarTextInput size="s"
      :model-value="props.node.props.label ?? ''"
      @update:model-value="(v) => props.patch({ props: { label: v } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.action', undefined, 'Action')">
    <CoarSelect size="s"
      v-if="actionOptions"
      :model-value="props.node.props.action ?? ''"
      :options="actionOptions"
      @update:model-value="(v) => props.patch({ props: { action: (v as string) || undefined } })"
    />
    <CoarTextInput size="s"
      v-else
      :model-value="props.node.props.action ?? ''"
      placeholder="e.g. nav:forgot-password"
      @update:model-value="(v) => props.patch({ props: { action: v } })"
    />
  </CoarFormField>
</template>
