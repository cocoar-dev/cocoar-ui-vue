<script setup lang="ts">
/**
 * Shared value/label options editor for choice elements (select, multi-select,
 * radio-group): rows with add / remove / reorder. Emits the full next array —
 * defaultValue pruning is the caller's concern (it differs per value shape).
 */
import { CoarIcon, CoarTextInput } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';

export interface EditorOption {
  value: string;
  label: string;
}

const props = defineProps<{
  options: EditorOption[];
}>();

const emit = defineEmits<{
  'update:options': [next: EditorOption[]];
}>();

const { t } = useI18n();

function updateOption(index: number, key: keyof EditorOption, value: string) {
  emit('update:options', props.options.map((o, i) => (i === index ? { ...o, [key]: value } : o)));
}

function addOption() {
  const n = props.options.length + 1;
  emit('update:options', [...props.options, { value: `option-${n}`, label: `Option ${n}` }]);
}

function removeOption(index: number) {
  emit('update:options', props.options.filter((_, i) => i !== index));
}

function moveOption(index: number, delta: -1 | 1) {
  const target = index + delta;
  if (target < 0 || target >= props.options.length) return;
  const next = [...props.options];
  [next[index], next[target]] = [next[target], next[index]];
  emit('update:options', next);
}
</script>

<template>
  <div class="pb-select-options">
    <div class="pb-select-options__label">{{ t('coar.pageBuilder.props.options', undefined, 'Options') }}</div>
    <div
      v-for="(opt, i) in options"
      :key="i"
      class="pb-select-options__row"
    >
      <CoarTextInput
        size="s"
        :model-value="opt.value"
        :placeholder="t('coar.pageBuilder.props.optionValuePlaceholder', undefined, 'value')"
        @update:model-value="(v) => updateOption(i, 'value', v)"
      />
      <CoarTextInput
        size="s"
        :model-value="opt.label"
        :placeholder="t('coar.pageBuilder.props.optionLabelPlaceholder', undefined, 'label')"
        @update:model-value="(v) => updateOption(i, 'label', v)"
      />
      <button
        type="button"
        class="pb-select-options__btn"
        :disabled="i === 0"
        :title="t('coar.pageBuilder.common.moveUp', undefined, 'Move up')"
        @click="moveOption(i, -1)"
      >
        <CoarIcon name="chevron-up" size="xs" />
      </button>
      <button
        type="button"
        class="pb-select-options__btn"
        :disabled="i === options.length - 1"
        :title="t('coar.pageBuilder.common.moveDown', undefined, 'Move down')"
        @click="moveOption(i, 1)"
      >
        <CoarIcon name="chevron-down" size="xs" />
      </button>
      <button
        type="button"
        class="pb-select-options__btn pb-select-options__btn--danger"
        :title="t('coar.pageBuilder.props.removeOption', undefined, 'Remove option')"
        @click="removeOption(i)"
      >
        <CoarIcon name="x" size="xs" />
      </button>
    </div>
    <button type="button" class="pb-select-options__add" @click="addOption">
      <CoarIcon name="plus" size="xs" />
      <span>{{ t('coar.pageBuilder.props.addOption', undefined, 'Add option') }}</span>
    </button>
  </div>
</template>

<style scoped>
.pb-select-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pb-select-options__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--coar-text-neutral-secondary, #5a5a60);
}

.pb-select-options__row {
  display: grid;
  grid-template-columns: 1fr 1fr auto auto auto;
  gap: 4px;
  align-items: center;
}

.pb-select-options__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--coar-border-neutral, #dcdce0);
  background: transparent;
  color: var(--coar-icon-neutral-secondary, #5a5a60);
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.12s ease-out, color 0.12s ease-out;
}

.pb-select-options__btn:hover:not(:disabled) {
  background: var(--coar-surface-neutral-subtle, #f0f0f2);
  color: var(--coar-icon-neutral-primary, #111);
}

.pb-select-options__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pb-select-options__btn--danger:hover:not(:disabled) {
  background: var(--coar-surface-semantic-error-subtle, #fde8e4);
  color: var(--coar-text-semantic-error-bold, #c0392b);
}

.pb-select-options__add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  height: 24px;
  padding: 0 8px;
  border: 1px dashed var(--coar-border-neutral, #cecece);
  background: transparent;
  color: var(--coar-text-neutral-secondary, #666);
  font-family: inherit;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
}

.pb-select-options__add:hover {
  border-color: var(--coar-border-accent, #1666cc);
  color: var(--coar-text-accent, #1666cc);
}
</style>
