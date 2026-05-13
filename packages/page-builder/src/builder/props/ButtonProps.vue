<script setup lang="ts">
import { computed, inject } from 'vue';
import {
  CoarFormField,
  CoarTextInput,
  CoarSelect,
  CoarCheckbox,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { ButtonNode } from '../../schema';
import { BUILDER_CONFIG } from '../builderContext';

const props = defineProps<{
  node: ButtonNode;
  patch: (update: Partial<ButtonNode>) => void;
}>();

const config = inject(BUILDER_CONFIG);

/**
 * When the IDP / consumer supplies `availableActions`, the Action ID becomes a
 * select (one of the labeled choices). Otherwise it falls back to a free-text
 * input — useful for development and single-tenant cases where actions aren't
 * declared upfront.
 */
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
  // If the current value isn't in the configured list, surface it so the user
  // can see and change it instead of having a silently-broken hidden value.
  const cur = props.node.action;
  if (cur && !seen.has(cur)) {
    opts.push({ value: cur, label: `${cur} (not configured)` });
  }
  return opts;
});

const VARIANT_OPTIONS: CoarSelectOption<string>[] = [
  { value: 'primary', label: 'primary' },
  { value: 'secondary', label: 'secondary' },
  { value: 'ghost', label: 'ghost' },
  { value: 'danger', label: 'danger' },
];

const SIZE_OPTIONS: CoarSelectOption<string>[] = [
  { value: '', label: '— default' },
  { value: 'xs', label: 'xs' },
  { value: 's', label: 's' },
  { value: 'm', label: 'm' },
  { value: 'l', label: 'l' },
];
</script>

<template>
  <CoarFormField label="Label">
    <CoarTextInput
      :model-value="props.node.label ?? ''"
      @update:model-value="(v) => props.patch({ label: v })"
    />
  </CoarFormField>

  <CoarFormField
    label="Action"
    hint="Matched against the actions map at render time"
  >
    <CoarSelect
      v-if="actionOptions"
      :model-value="props.node.action ?? ''"
      :options="actionOptions"
      @update:model-value="(v) => props.patch({ action: (v as string) || undefined })"
    />
    <CoarTextInput
      v-else
      :model-value="props.node.action ?? ''"
      placeholder="e.g. auth:login"
      @update:model-value="(v) => props.patch({ action: v })"
    />
  </CoarFormField>

  <CoarFormField label="Variant">
    <CoarSelect
      :model-value="props.node.variant ?? 'primary'"
      :options="VARIANT_OPTIONS"
      @update:model-value="(v) => props.patch({ variant: v as ButtonNode['variant'] })"
    />
  </CoarFormField>
  <CoarFormField label="Size">
    <CoarSelect
      :model-value="props.node.size ?? ''"
      :options="SIZE_OPTIONS"
      @update:model-value="(v) => props.patch({ size: (v || undefined) as ButtonNode['size'] })"
    />
  </CoarFormField>
  <CoarFormField label="Icon (left)">
    <CoarTextInput
      :model-value="props.node.icon ?? ''"
      placeholder="e.g. log-in"
      @update:model-value="(v) => props.patch({ icon: v })"
    />
  </CoarFormField>
  <CoarCheckbox
    :model-value="!!props.node.validates"
    label="Validates form before firing"
    @update:model-value="(v) => props.patch({ validates: v })"
  />
</template>
