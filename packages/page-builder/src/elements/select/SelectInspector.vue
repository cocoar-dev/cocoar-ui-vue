<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarFormField, CoarTextInput, CoarCheckbox } from '@cocoar/vue-ui';
import OptionsEditor, { type EditorOption } from '../../builder/props/OptionsEditor.vue';
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
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.label', undefined, 'Label')">
    <CoarTextInput
      :model-value="props.node.props.label ?? ''"
      @update:model-value="(v) => props.patch({ props: { label: v } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.placeholder', undefined, 'Placeholder')">
    <CoarTextInput
      :model-value="props.node.props.placeholder ?? ''"
      @update:model-value="(v) => props.patch({ props: { placeholder: v } })"
    />
  </CoarFormField>

  <OptionsEditor :options="options" @update:options="setOptions" />

  <CoarFormField
    :label="t('coar.pageBuilder.props.optionsSource', undefined, 'Options source ID')"
    :hint="t('coar.pageBuilder.props.optionsSourceHint', undefined, 'Resolved via config.optionsSource at render time — overrides the static options')"
  >
    <CoarTextInput
      :model-value="props.node.props.optionsSourceId ?? ''"
      placeholder="e.g. countries"
      @update:model-value="(v) => props.patch({ props: { optionsSourceId: v || undefined } })"
    />
  </CoarFormField>

  <CoarCheckbox
    :model-value="!!props.node.props.disabled"
    :label="t('coar.pageBuilder.props.disabled', undefined, 'Disabled')"
    @update:model-value="(v) => props.patch({ props: { disabled: v } })"
  />
</template>
