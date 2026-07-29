<script setup lang="ts">
import { computed, nextTick, provide, ref, watch } from 'vue';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';
import { inject } from 'vue';
import { CHECKBOX_GROUP_INJECTION_KEY } from './constants';
import type { CoarCheckboxSize } from '../checkbox/CoarCheckbox.vue';

export type CheckboxGroupModel = readonly string[] | Readonly<Record<string, boolean>>;
export type CheckboxGroupModelType = 'array' | 'object';
export type CheckboxGroupOrientation = 'vertical' | 'horizontal';

export interface CoarCheckboxGroupProps {
  /** Shape emitted by v-model. Inferred from a defined model, otherwise array. */
  modelType?: CheckboxGroupModelType;
  /** Layout direction of the contained checkboxes. */
  orientation?: CheckboxGroupOrientation;
  /** Native form name shared by all contained checkbox inputs. */
  name?: string;
  /** Size inherited by every contained checkbox. */
  size?: CoarCheckboxSize;
  /** Disables every checkbox in the group. */
  disabled?: boolean;
  /** Marks every checkbox in the group as invalid. */
  error?: boolean;
}

const props = withDefaults(defineProps<CoarCheckboxGroupProps>(), {
  modelType: undefined,
  orientation: 'vertical',
  name: undefined,
  size: 'm',
  disabled: false,
  error: false,
});

const model = defineModel<CheckboxGroupModel>();
const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);
const registeredValues = ref<string[]>([]);
let objectSyncQueued = false;

const resolvedModelType = computed<CheckboxGroupModelType>(() => {
  if (props.modelType) return props.modelType;
  return model.value && !Array.isArray(model.value) ? 'object' : 'array';
});
const disabled = computed(() => props.disabled || (formField?.disabled.value ?? false));
const hasError = computed(() => props.error || (formField?.hasError.value ?? false));
const name = computed(() => props.name);
const size = computed(() => props.size);

function selectedValues(): Set<string> {
  const current = model.value;
  if (Array.isArray(current)) return new Set(current);
  if (current && typeof current === 'object') {
    return new Set(
      Object.entries(current)
        .filter(([, checked]) => checked)
        .map(([value]) => value),
    );
  }
  return new Set();
}

function isChecked(value: string): boolean {
  return selectedValues().has(value);
}

function emitSelection(selected: Set<string>) {
  if (resolvedModelType.value === 'object') {
    model.value = Object.fromEntries(
      registeredValues.value.map((value) => [value, selected.has(value)]),
    );
    return;
  }
  model.value = registeredValues.value.filter((value) => selected.has(value));
}

function setChecked(value: string, checked: boolean) {
  const selected = selectedValues();
  if (checked) selected.add(value);
  else selected.delete(value);
  emitSelection(selected);
}

function syncObjectShape() {
  if (objectSyncQueued || resolvedModelType.value !== 'object') return;
  objectSyncQueued = true;
  void nextTick(() => {
    objectSyncQueued = false;
    if (resolvedModelType.value !== 'object') return;
    const selected = selectedValues();
    const currentKeys = model.value && !Array.isArray(model.value) ? Object.keys(model.value) : [];
    const expectedKeys = registeredValues.value;
    if (
      currentKeys.length === expectedKeys.length &&
      currentKeys.every((key) => expectedKeys.includes(key))
    )
      return;
    emitSelection(selected);
  });
}

function register(value: string) {
  if (!registeredValues.value.includes(value)) {
    registeredValues.value = [...registeredValues.value, value];
    syncObjectShape();
  }
}

function unregister(value: string) {
  if (!registeredValues.value.includes(value)) return;
  registeredValues.value = registeredValues.value.filter((entry) => entry !== value);
  const selected = selectedValues();
  selected.delete(value);
  emitSelection(selected);
}

watch([model, resolvedModelType], () => syncObjectShape(), { deep: true });

provide(CHECKBOX_GROUP_INJECTION_KEY, {
  disabled,
  hasError,
  name,
  size,
  isChecked,
  setChecked,
  register,
  unregister,
});

const hostClasses = computed(() => [
  'coar-checkbox-group',
  `coar-checkbox-group--${props.orientation}`,
  {
    'coar-checkbox-group--disabled': disabled.value,
    'coar-checkbox-group--error': hasError.value,
  },
]);
</script>

<template>
  <div
    :id="formField?.inputId.value"
    :class="hostClasses"
    role="group"
    :aria-labelledby="formField?.labelId.value"
    :aria-describedby="formField?.messageId.value || undefined"
    :aria-invalid="hasError ? 'true' : undefined"
  >
    <slot />
  </div>
</template>

<style scoped>
.coar-checkbox-group {
  display: flex;
}

.coar-checkbox-group--vertical {
  flex-direction: column;
  /* Each checkbox already owns a full touch row. An additional vertical gap
     would double the intended rhythm and make option lists unnecessarily
     sparse. Use the group's `size` prop when a denser row itself is wanted. */
  gap: 0;
}

.coar-checkbox-group--horizontal {
  flex-flow: row wrap;
  gap: var(--coar-spacing-s) var(--coar-spacing-xl);
}
</style>
