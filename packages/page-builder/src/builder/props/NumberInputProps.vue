<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarFormField, CoarTextInput, CoarCheckbox, CoarNumberInput } from '@cocoar/vue-ui';
import type { NumberInputNode } from '../../schema';

const props = defineProps<{
  node: NumberInputNode;
  patch: (update: Partial<NumberInputNode>) => void;
}>();

const { t } = useI18n();

function setRequired(v: boolean) {
  const next: NonNullable<NumberInputNode['validation']> = { ...props.node.validation };
  if (v) next.required = true;
  else delete next.required;
  props.patch({ validation: Object.keys(next).length > 0 ? next : undefined });
}

/** null from a cleared number input clears the schema key (patchNode semantics). */
function patchNumber(key: 'min' | 'max' | 'step' | 'decimals' | 'defaultValue', v: number | null) {
  props.patch({ [key]: v ?? undefined });
}
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.label', undefined, 'Label')">
    <CoarTextInput
      :model-value="props.node.label ?? ''"
      @update:model-value="(v) => props.patch({ label: v })"
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
      :model-value="props.node.placeholder ?? ''"
      @update:model-value="(v) => props.patch({ placeholder: v })"
    />
  </CoarFormField>
  <div class="pb-number-grid">
    <CoarFormField :label="t('coar.pageBuilder.props.min', undefined, 'Min')">
      <CoarNumberInput
        size="s"
        clearable
        :decimals="6"
        :model-value="props.node.min ?? null"
        @update:model-value="(v) => patchNumber('min', v)"
      />
    </CoarFormField>
    <CoarFormField :label="t('coar.pageBuilder.props.max', undefined, 'Max')">
      <CoarNumberInput
        size="s"
        clearable
        :decimals="6"
        :model-value="props.node.max ?? null"
        @update:model-value="(v) => patchNumber('max', v)"
      />
    </CoarFormField>
    <CoarFormField :label="t('coar.pageBuilder.props.step', undefined, 'Step')">
      <CoarNumberInput
        size="s"
        clearable
        :decimals="6"
        :model-value="props.node.step ?? null"
        @update:model-value="(v) => patchNumber('step', v)"
      />
    </CoarFormField>
    <CoarFormField :label="t('coar.pageBuilder.props.decimals', undefined, 'Decimals')">
      <CoarNumberInput
        size="s"
        clearable
        :min="0"
        :max="10"
        :model-value="props.node.decimals ?? null"
        @update:model-value="(v) => patchNumber('decimals', v)"
      />
    </CoarFormField>
  </div>
  <CoarFormField :label="t('coar.pageBuilder.props.defaultValue', undefined, 'Default value')">
    <CoarNumberInput
      clearable
      :decimals="props.node.decimals ?? 6"
      :model-value="props.node.defaultValue ?? null"
      @update:model-value="(v) => patchNumber('defaultValue', v)"
    />
  </CoarFormField>
  <CoarCheckbox
    :model-value="!!props.node.validation?.required"
    :label="t('coar.pageBuilder.props.required', undefined, 'Required')"
    @update:model-value="setRequired"
  />
  <CoarCheckbox
    :model-value="!!props.node.disabled"
    :label="t('coar.pageBuilder.props.disabled', undefined, 'Disabled')"
    @update:model-value="(v) => props.patch({ disabled: v })"
  />
</template>

<style scoped>
.pb-number-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
