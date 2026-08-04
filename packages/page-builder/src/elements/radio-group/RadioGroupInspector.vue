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
import OptionsEditor, { type EditorOption } from '../../builder/props/OptionsEditor.vue';
import type { RadioGroupNode } from '../../schema';

const props = defineProps<{
  node: RadioGroupNode;
  patch: (update: Partial<RadioGroupNode>) => void;
}>();

const { t } = useI18n();

const options = computed<EditorOption[]>(() => props.node.props.options ?? []);

function setOptions(next: EditorOption[]) {
  // An emptied list clears the key; a stale defaultValue pointing at a removed
  // option is dropped along with it.
  const patch: Partial<RadioGroupNode> = { props: { options: next.length > 0 ? next : undefined } };
  if (props.node.defaultValue !== undefined && !next.some((o) => o.value === props.node.defaultValue)) {
    patch.defaultValue = undefined;
  }
  props.patch(patch);
}

const orientationChoices = computed<CoarSelectOption<string>[]>(() => [
  { value: 'vertical', label: t('coar.pageBuilder.props.vertical', undefined, 'Vertical') },
  { value: 'horizontal', label: t('coar.pageBuilder.props.horizontal', undefined, 'Horizontal') },
]);
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.label', undefined, 'Label')">
    <CoarTextInput size="s"
      :model-value="props.node.props.label ?? ''"
      @update:model-value="(v) => props.patch({ props: { label: v } })"
    />
  </CoarFormField>

  <OptionsEditor :options="options" @update:options="setOptions" />

  <CoarFormField
    :label="t('coar.pageBuilder.props.optionsSource', undefined, 'Options source ID')"
    :hint="t('coar.pageBuilder.props.optionsSourceHint', undefined, 'Resolved via config.optionsSource at render time — overrides the static options')"
  >
    <CoarTextInput size="s"
      :model-value="props.node.props.optionsSourceId ?? ''"
      placeholder="e.g. countries"
      @update:model-value="(v) => props.patch({ props: { optionsSourceId: v || undefined } })"
    />
  </CoarFormField>

  <CoarFormField :label="t('coar.pageBuilder.props.orientation', undefined, 'Orientation')">
    <CoarSelect size="s"
      :model-value="props.node.props.orientation ?? 'vertical'"
      :options="orientationChoices"
      @update:model-value="(v) => props.patch({ props: { orientation: v as RadioGroupNode['props']['orientation'] } })"
    />
  </CoarFormField>

  <CoarCheckbox size="s"
    :model-value="!!props.node.props.disabled"
    :label="t('coar.pageBuilder.props.disabled', undefined, 'Disabled')"
    @update:model-value="(v) => props.patch({ props: { disabled: v } })"
  />
</template>
