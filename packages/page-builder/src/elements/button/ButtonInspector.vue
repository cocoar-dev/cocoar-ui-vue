<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import {
  CoarFormField,
  CoarTextInput,
  CoarSelect,
  CoarCheckbox,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { ButtonNode } from '../../schema';
import { BUILDER_CONFIG } from '../../builder/builderContext';

const props = defineProps<{
  node: ButtonNode;
  patch: (update: Partial<Omit<ButtonNode, 'props'>> & { props?: Partial<ButtonNode['props']> }) => void;
}>();

const { t } = useI18n();

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
  const opts: CoarSelectOption<string>[] = [
    { value: '', label: t('coar.pageBuilder.props.none', undefined, '— none') },
  ];
  for (const a of list) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    opts.push({ value: a.id, label: a.label });
  }
  // If the current value isn't in the configured list, surface it so the user
  // can see and change it instead of having a silently-broken hidden value.
  const cur = props.node.props.action;
  if (cur && !seen.has(cur)) {
    opts.push({
      value: cur,
      label: t('coar.pageBuilder.props.notConfigured', { id: cur }, '{id} (not configured)'),
    });
  }
  return opts;
});

const VARIANT_OPTIONS: CoarSelectOption<string>[] = [
  { value: 'primary', label: 'primary' },
  { value: 'secondary', label: 'secondary' },
  { value: 'ghost', label: 'ghost' },
  { value: 'danger', label: 'danger' },
];

const sizeOptions = computed<CoarSelectOption<string>[]>(() => [
  { value: '', label: t('coar.pageBuilder.props.default', undefined, '— default') },
  { value: 'xs', label: 'xs' },
  { value: 's', label: 's' },
  { value: 'm', label: 'm' },
  { value: 'l', label: 'l' },
]);
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.label', undefined, 'Label')">
    <CoarTextInput
      :model-value="props.node.props.label ?? ''"
      @update:model-value="(v) => props.patch({ props: { label: v } })"
    />
  </CoarFormField>

  <CoarFormField
    :label="t('coar.pageBuilder.props.action', undefined, 'Action')"
    :hint="t('coar.pageBuilder.props.actionHint', undefined, 'Matched against the actions map at render time')"
  >
    <CoarSelect
      v-if="actionOptions"
      :model-value="props.node.props.action ?? ''"
      :options="actionOptions"
      @update:model-value="(v) => props.patch({ props: { action: (v as string) || undefined } })"
    />
    <CoarTextInput
      v-else
      :model-value="props.node.props.action ?? ''"
      placeholder="e.g. auth:login"
      @update:model-value="(v) => props.patch({ props: { action: v } })"
    />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.variant', undefined, 'Variant')">
    <CoarSelect
      :model-value="props.node.props.variant ?? 'primary'"
      :options="VARIANT_OPTIONS"
      @update:model-value="(v) => props.patch({ props: { variant: v as ButtonNode['props']['variant'] } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.size', undefined, 'Size')">
    <CoarSelect
      :model-value="props.node.props.size ?? ''"
      :options="sizeOptions"
      @update:model-value="(v) => props.patch({ props: { size: (v || undefined) as ButtonNode['props']['size'] } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.iconLeft', undefined, 'Icon (left)')">
    <CoarTextInput
      :model-value="props.node.props.icon ?? ''"
      placeholder="e.g. log-in"
      @update:model-value="(v) => props.patch({ props: { icon: v } })"
    />
  </CoarFormField>
  <CoarCheckbox
    :model-value="!!props.node.props.validates"
    :label="t('coar.pageBuilder.props.validatesForm', undefined, 'Validates form before firing')"
    @update:model-value="(v) => props.patch({ props: { validates: v } })"
  />
  <CoarCheckbox
    :model-value="!!props.node.props.default"
    :label="t('coar.pageBuilder.props.defaultButton', undefined, 'Default button (Enter submits here)')"
    @update:model-value="(v) => props.patch({ props: { default: v || undefined } })"
  />
</template>
