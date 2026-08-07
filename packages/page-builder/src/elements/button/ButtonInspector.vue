<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import {
  CoarFormField,
  CoarTextInput,
  CoarSelect,
  CoarCheckbox,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { ButtonNode } from '../../schema';
import BuilderFxButton from '../../builder/BuilderFxButton.vue';

const props = defineProps<{
  node: ButtonNode;
  patch: (update: Partial<Omit<ButtonNode, 'props'>> & { props?: Partial<ButtonNode['props']> }) => void;
}>();

const { t } = useI18n();

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
    <CoarTextInput size="s"
      :model-value="props.node.props.label ?? ''"
      @update:model-value="(v) => props.patch({ props: { label: v } })"
    />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.variant', undefined, 'Variant')">
    <CoarSelect size="s"
      :model-value="props.node.props.variant ?? 'primary'"
      :options="VARIANT_OPTIONS"
      @update:model-value="(v) => props.patch({ props: { variant: v as ButtonNode['props']['variant'] } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.size', undefined, 'Size')">
    <CoarSelect size="s"
      :model-value="props.node.props.size ?? ''"
      :options="sizeOptions"
      @update:model-value="(v) => props.patch({ props: { size: (v || undefined) as ButtonNode['props']['size'] } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.iconLeft', undefined, 'Icon (left)')">
    <CoarTextInput size="s"
      :model-value="props.node.props.icon ?? ''"
      placeholder="e.g. log-in"
      @update:model-value="(v) => props.patch({ props: { icon: v } })"
    />
  </CoarFormField>
  <CoarCheckbox size="s"
    :model-value="!!props.node.props.validates"
    :label="t('coar.pageBuilder.props.validatesForm', undefined, 'Validates form before firing')"
    @update:model-value="(v) => props.patch({ props: { validates: v } })"
  />
  <BuilderFxButton
    :node="props.node"
    target="disabled"
    label="Disabled"
    :static-value="!!props.node.props.disabled"
    :patch="props.patch"
  >
    <CoarCheckbox size="s"
      :model-value="!!props.node.props.disabled"
      @update:model-value="(v) => props.patch({ props: { disabled: v || undefined } })"
    />
  </BuilderFxButton>
  <CoarCheckbox size="s"
    :model-value="!!props.node.props.default"
    :label="t('coar.pageBuilder.props.defaultButton', undefined, 'Default button (Enter submits here)')"
    @update:model-value="(v) => props.patch({ props: { default: v || undefined } })"
  />
</template>
