<script setup lang="ts">
import { computed, inject } from 'vue';
import {
  CoarFormField,
  CoarTextInput,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { LinkNode } from '../../schema';
import { BUILDER_CONFIG } from '../builderContext';

const props = defineProps<{
  node: LinkNode;
  patch: (update: Partial<LinkNode>) => void;
}>();

const config = inject(BUILDER_CONFIG);

const actionOptions = computed<CoarSelectOption<string>[] | null>(() => {
  const list = config?.value?.availableActions;
  if (!list || list.length === 0) return null;
  const seen = new Set<string>();
  const opts: CoarSelectOption<string>[] = [{ value: '', label: '— none' }];
  for (const a of list) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    opts.push({ value: a.id, label: a.label });
  }
  const cur = props.node.action;
  if (cur && !seen.has(cur)) {
    opts.push({ value: cur, label: `${cur} (not configured)` });
  }
  return opts;
});
</script>

<template>
  <CoarFormField label="Label">
    <CoarTextInput
      :model-value="props.node.label ?? ''"
      @update:model-value="(v) => props.patch({ label: v })"
    />
  </CoarFormField>
  <CoarFormField label="Action">
    <CoarSelect
      v-if="actionOptions"
      :model-value="props.node.action ?? ''"
      :options="actionOptions"
      @update:model-value="(v) => props.patch({ action: (v as string) || undefined })"
    />
    <CoarTextInput
      v-else
      :model-value="props.node.action ?? ''"
      placeholder="e.g. nav:forgot-password"
      @update:model-value="(v) => props.patch({ action: v })"
    />
  </CoarFormField>
</template>
