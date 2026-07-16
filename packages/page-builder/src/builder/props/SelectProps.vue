<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import {
  CoarFormField,
  CoarTextInput,
  CoarCheckbox,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import OptionsEditor, { type EditorOption } from './OptionsEditor.vue';
import type { SelectNode } from '../../schema';

const props = defineProps<{
  node: SelectNode;
  patch: (update: Partial<SelectNode>) => void;
}>();

const { t } = useI18n();

const options = computed<EditorOption[]>(() => props.node.props.options ?? []);

function setOptions(next: EditorOption[]) {
  // An emptied list clears the key; a stale defaultValue pointing at a removed
  // option is dropped along with it.
  const patch: Partial<SelectNode> = { props: { options: next.length > 0 ? next : undefined } };
  if (props.node.defaultValue !== undefined && !next.some((o) => o.value === props.node.defaultValue)) {
    patch.defaultValue = undefined;
  }
  props.patch(patch);
}

const defaultChoices = computed<CoarSelectOption<string>[]>(() =>
  options.value.map((o) => ({ value: o.value, label: o.label || o.value })),
);

function setRequired(v: boolean) {
  const next: NonNullable<SelectNode['validation']> = { ...props.node.validation };
  if (v) next.required = true;
  else delete next.required;
  props.patch({ validation: Object.keys(next).length > 0 ? next : undefined });
}
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.label', undefined, 'Label')">
    <CoarTextInput
      :model-value="props.node.props.label ?? ''"
      @update:model-value="(v) => props.patch({ props: { label: v } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.name', undefined, 'Name (field key)')">
    <CoarTextInput
      :model-value="props.node.name ?? ''"
      @update:model-value="(v) => props.patch({ name: v })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.placeholder', undefined, 'Placeholder')">
    <CoarTextInput
      :model-value="props.node.props.placeholder ?? ''"
      @update:model-value="(v) => props.patch({ props: { placeholder: v } })"
    />
  </CoarFormField>

  <OptionsEditor :options="options" @update:options="setOptions" />

  <CoarFormField :label="t('coar.pageBuilder.props.defaultValue', undefined, 'Default value')">
    <CoarSelect
      :model-value="(props.node.defaultValue as string | undefined) ?? null"
      :options="defaultChoices"
      :placeholder="t('coar.pageBuilder.props.none', undefined, '— none')"
      clearable
      @update:model-value="(v) => props.patch({ defaultValue: (v as string | null) ?? undefined })"
    />
  </CoarFormField>

  <CoarCheckbox
    :model-value="!!props.node.validation?.required"
    :label="t('coar.pageBuilder.props.required', undefined, 'Required')"
    @update:model-value="setRequired"
  />
  <CoarCheckbox
    :model-value="!!props.node.props.disabled"
    :label="t('coar.pageBuilder.props.disabled', undefined, 'Disabled')"
    @update:model-value="(v) => props.patch({ props: { disabled: v } })"
  />
</template>
