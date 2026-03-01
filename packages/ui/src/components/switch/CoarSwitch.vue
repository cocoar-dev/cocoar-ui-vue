<script setup lang="ts">
import { computed, ref } from 'vue';

export type CoarSwitchSize = 's' | 'm' | 'l';

export interface CoarSwitchProps {
  /** Label text displayed next to the switch */
  label?: string;
  /** Disables the switch */
  disabled?: boolean;
  /** Prevents changes but keeps normal appearance */
  readonly?: boolean;
  /** Switch size */
  size?: CoarSwitchSize;
  /** Label position relative to the switch */
  labelPosition?: 'before' | 'after';
  /** HTML id attribute */
  id?: string;
  /** HTML name attribute */
  name?: string;
}

const props = withDefaults(defineProps<CoarSwitchProps>(), {
  label: '',
  disabled: false,
  readonly: false,
  size: 'm',
  labelPosition: 'after',
  id: '',
  name: '',
});

const model = defineModel<boolean>({ default: false });

const isFocused = ref(false);

const autoId = `coar-switch-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const inputId = computed(() => props.id || autoId);

const hostClasses = computed(() => [
  'coar-switch-host',
  `coar-switch--${props.size}`,
  {
    'coar-switch--disabled': props.disabled,
    'coar-switch--readonly': props.readonly,
    'coar-switch--checked': model.value,
  },
]);

function onToggle(event: Event) {
  if (props.readonly) {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    target.checked = model.value;
    return;
  }
  const target = event.target as HTMLInputElement;
  model.value = target.checked;
}

function onFocus() { isFocused.value = true; }
function onBlur() { isFocused.value = false; }
</script>

<template>
  <div :class="hostClasses">
    <label class="coar-switch-wrapper" :class="{ 'coar-switch-focused': isFocused }">
      <span v-if="labelPosition === 'before' && label" class="coar-switch-label">{{ label }}</span>

      <!-- Hidden native input -->
      <input
        :id="inputId"
        type="checkbox"
        role="switch"
        class="coar-switch-input"
        :name="name || undefined"
        :checked="model"
        :disabled="disabled"
        :aria-checked="model"
        :aria-disabled="disabled ? 'true' : undefined"
        :aria-readonly="readonly ? 'true' : undefined"
        @change="onToggle"
        @focus="onFocus"
        @blur="onBlur"
      />

      <!-- Custom track + thumb -->
      <span class="coar-switch-track" :class="{ 'coar-switch-track--checked': model }">
        <span class="coar-switch-thumb" />
      </span>

      <span v-if="labelPosition === 'after' && label" class="coar-switch-label">{{ label }}</span>
    </label>
  </div>
</template>

<style scoped>
.coar-switch-host {
  display: inline-block;
}

/* Track sizes */
.coar-switch--s {
  --coar-switch-track-width: var(--coar-switch-s-track-width);
  --coar-switch-track-height: var(--coar-switch-s-track-height);
  --coar-switch-thumb-size: var(--coar-switch-s-thumb-size);
}

.coar-switch--m {
  --coar-switch-track-width: var(--coar-switch-m-track-width);
  --coar-switch-track-height: var(--coar-switch-m-track-height);
  --coar-switch-thumb-size: var(--coar-switch-m-thumb-size);
}

.coar-switch--l {
  --coar-switch-track-width: var(--coar-switch-l-track-width);
  --coar-switch-track-height: var(--coar-switch-l-track-height);
  --coar-switch-thumb-size: var(--coar-switch-l-thumb-size);
}

/* Wrapper */
.coar-switch-wrapper {
  display: inline-flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  cursor: pointer;
  user-select: none;
}

.coar-switch--disabled .coar-switch-wrapper {
  cursor: not-allowed;
}

.coar-switch--readonly .coar-switch-wrapper {
  cursor: default;
}

/* Hidden native input */
.coar-switch-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Track */
.coar-switch-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  width: var(--coar-switch-track-width);
  height: var(--coar-switch-track-height);
  border: 1px solid transparent;
  border-radius: calc(var(--coar-switch-track-height) / 2);
  background: var(--coar-color-gray-300);
  transition: background var(--coar-duration-fast) ease,
              border-color var(--coar-duration-fast) ease;
}

/* Track hover (off) */
.coar-switch-wrapper:hover .coar-switch-track:not(.coar-switch-track--checked) {
  background: var(--coar-color-gray-400);
}

/* Track checked */
.coar-switch-track--checked {
  background: var(--coar-background-accent-primary);
  border-color: var(--coar-background-accent-primary);
}

/* Track hover (on) */
.coar-switch-wrapper:hover .coar-switch-track--checked {
  background: var(--coar-background-accent-hover);
  border-color: var(--coar-background-accent-hover);
}

/* Thumb */
.coar-switch-thumb {
  position: absolute;
  top: 50%;
  left: 1px;
  width: var(--coar-switch-thumb-size);
  height: var(--coar-switch-thumb-size);
  border-radius: 50%;
  background: var(--coar-text-on-bold);
  transform: translateY(-50%) translateX(0);
  transition: transform var(--coar-duration-fast) ease;
}

/* Thumb checked position */
.coar-switch-track--checked .coar-switch-thumb {
  transform: translateY(-50%) translateX(calc(var(--coar-switch-track-width) - var(--coar-switch-thumb-size) - 4px));
}

/* Disabled */
.coar-switch--disabled .coar-switch-track {
  opacity: 0.6;
}

.coar-switch--disabled .coar-switch-track--checked {
  background: var(--coar-background-neutral-tertiary);
  border-color: var(--coar-background-neutral-tertiary);
}

.coar-switch--disabled .coar-switch-wrapper:hover .coar-switch-track {
  background: var(--coar-color-gray-300);
}

.coar-switch--disabled .coar-switch-wrapper:hover .coar-switch-track--checked {
  background: var(--coar-background-neutral-tertiary);
  border-color: var(--coar-background-neutral-tertiary);
}

/* Readonly hover – no change */
.coar-switch--readonly .coar-switch-wrapper:hover .coar-switch-track:not(.coar-switch-track--checked) {
  background: var(--coar-color-gray-300);
}

.coar-switch--readonly .coar-switch-wrapper:hover .coar-switch-track--checked {
  background: var(--coar-background-accent-primary);
  border-color: var(--coar-background-accent-primary);
}

/* Label */
.coar-switch-label {
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-component-m-font-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
}

.coar-switch--s .coar-switch-label {
  font-size: var(--coar-component-s-font-size);
}

.coar-switch--l .coar-switch-label {
  font-size: var(--coar-component-l-font-size);
}

.coar-switch--disabled .coar-switch-label {
  color: var(--coar-text-neutral-disabled);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .coar-switch-track,
  .coar-switch-thumb {
    transition: none;
  }
}
</style>
