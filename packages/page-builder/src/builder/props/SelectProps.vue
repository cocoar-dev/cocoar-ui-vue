<script setup lang="ts">
import { computed } from 'vue';
import {
  CoarFormField,
  CoarIcon,
  CoarTextInput,
  CoarCheckbox,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { SelectNode } from '../../schema';

const props = defineProps<{
  node: SelectNode;
  patch: (update: Partial<SelectNode>) => void;
}>();

type Option = { value: string; label: string };

const options = computed<Option[]>(() => props.node.options ?? []);

function setOptions(next: Option[]) {
  // An emptied list clears the key; a stale defaultValue pointing at a removed
  // option is dropped along with it.
  const patch: Partial<SelectNode> = { options: next.length > 0 ? next : undefined };
  if (props.node.defaultValue !== undefined && !next.some((o) => o.value === props.node.defaultValue)) {
    patch.defaultValue = undefined;
  }
  props.patch(patch);
}

function updateOption(index: number, key: keyof Option, value: string) {
  const next = options.value.map((o, i) => (i === index ? { ...o, [key]: value } : o));
  setOptions(next);
}

function addOption() {
  const n = options.value.length + 1;
  setOptions([...options.value, { value: `option-${n}`, label: `Option ${n}` }]);
}

function removeOption(index: number) {
  setOptions(options.value.filter((_, i) => i !== index));
}

function moveOption(index: number, delta: -1 | 1) {
  const target = index + delta;
  if (target < 0 || target >= options.value.length) return;
  const next = [...options.value];
  [next[index], next[target]] = [next[target], next[index]];
  setOptions(next);
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
  <CoarFormField label="Label">
    <CoarTextInput
      :model-value="props.node.label ?? ''"
      @update:model-value="(v) => props.patch({ label: v })"
    />
  </CoarFormField>
  <CoarFormField label="Name (field key)">
    <CoarTextInput
      :model-value="props.node.name ?? ''"
      @update:model-value="(v) => props.patch({ name: v })"
    />
  </CoarFormField>
  <CoarFormField label="Placeholder">
    <CoarTextInput
      :model-value="props.node.placeholder ?? ''"
      @update:model-value="(v) => props.patch({ placeholder: v })"
    />
  </CoarFormField>

  <!-- ── Options ── -->
  <div class="pb-select-options">
    <div class="pb-select-options__label">Options</div>
    <div
      v-for="(opt, i) in options"
      :key="i"
      class="pb-select-options__row"
    >
      <CoarTextInput
        size="s"
        :model-value="opt.value"
        placeholder="value"
        @update:model-value="(v) => updateOption(i, 'value', v)"
      />
      <CoarTextInput
        size="s"
        :model-value="opt.label"
        placeholder="label"
        @update:model-value="(v) => updateOption(i, 'label', v)"
      />
      <button
        type="button"
        class="pb-select-options__btn"
        :disabled="i === 0"
        title="Move up"
        @click="moveOption(i, -1)"
      >
        <CoarIcon name="chevron-up" size="xs" />
      </button>
      <button
        type="button"
        class="pb-select-options__btn"
        :disabled="i === options.length - 1"
        title="Move down"
        @click="moveOption(i, 1)"
      >
        <CoarIcon name="chevron-down" size="xs" />
      </button>
      <button
        type="button"
        class="pb-select-options__btn pb-select-options__btn--danger"
        title="Remove option"
        @click="removeOption(i)"
      >
        <CoarIcon name="x" size="xs" />
      </button>
    </div>
    <button type="button" class="pb-select-options__add" @click="addOption">
      <CoarIcon name="plus" size="xs" />
      <span>Add option</span>
    </button>
  </div>

  <CoarFormField label="Default value">
    <CoarSelect
      :model-value="props.node.defaultValue ?? null"
      :options="defaultChoices"
      placeholder="— none"
      clearable
      @update:model-value="(v) => props.patch({ defaultValue: (v as string | null) ?? undefined })"
    />
  </CoarFormField>

  <CoarCheckbox
    :model-value="!!props.node.validation?.required"
    label="Required"
    @update:model-value="setRequired"
  />
  <CoarCheckbox
    :model-value="!!props.node.disabled"
    label="Disabled"
    @update:model-value="(v) => props.patch({ disabled: v })"
  />
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
