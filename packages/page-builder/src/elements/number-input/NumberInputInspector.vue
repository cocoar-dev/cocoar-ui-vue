<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarFormField, CoarTextInput, CoarCheckbox, CoarNumberInput } from '@cocoar/vue-ui';
import type { NumberInputNode } from '../../schema';

const props = defineProps<{
  node: NumberInputNode;
  patch: (update: Partial<NumberInputNode>) => void;
}>();

const { t } = useI18n();

/** null from a cleared number input clears the schema key (patchNode semantics). */
function patchNumber(key: 'min' | 'max' | 'step' | 'decimals', v: number | null) {
  props.patch({ props: { [key]: v ?? undefined } });
}
</script>

<template>
  <CoarFormField :label="t('coar.pageBuilder.props.label', undefined, 'Label')">
    <CoarTextInput
size="s"
      :model-value="props.node.props.label ?? ''"
      @update:model-value="(v) => props.patch({ props: { label: v } })"
    />
  </CoarFormField>
  <CoarFormField :label="t('coar.pageBuilder.props.placeholder', undefined, 'Placeholder')">
    <CoarTextInput
size="s"
      :model-value="props.node.props.placeholder ?? ''"
      @update:model-value="(v) => props.patch({ props: { placeholder: v } })"
    />
  </CoarFormField>
  <div class="pb-number-grid">
    <CoarFormField :label="t('coar.pageBuilder.props.min', undefined, 'Min')">
      <CoarNumberInput
        size="s"
        clearable
        :decimals="6"
        :model-value="props.node.props.min ?? null"
        @update:model-value="(v) => patchNumber('min', v)"
      />
    </CoarFormField>
    <CoarFormField :label="t('coar.pageBuilder.props.max', undefined, 'Max')">
      <CoarNumberInput
        size="s"
        clearable
        :decimals="6"
        :model-value="props.node.props.max ?? null"
        @update:model-value="(v) => patchNumber('max', v)"
      />
    </CoarFormField>
    <CoarFormField :label="t('coar.pageBuilder.props.step', undefined, 'Step')">
      <CoarNumberInput
        size="s"
        clearable
        :decimals="6"
        :model-value="props.node.props.step ?? null"
        @update:model-value="(v) => patchNumber('step', v)"
      />
    </CoarFormField>
    <CoarFormField :label="t('coar.pageBuilder.props.decimals', undefined, 'Decimals')">
      <CoarNumberInput
        size="s"
        clearable
        :min="0"
        :max="10"
        :model-value="props.node.props.decimals ?? null"
        @update:model-value="(v) => patchNumber('decimals', v)"
      />
    </CoarFormField>
  </div>
  <CoarCheckbox
size="s"
    :model-value="!!props.node.props.disabled"
    :label="t('coar.pageBuilder.props.disabled', undefined, 'Disabled')"
    @update:model-value="(v) => props.patch({ props: { disabled: v } })"
  />
</template>

<style scoped>
.pb-number-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
