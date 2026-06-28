<script setup lang="ts">
import { computed, ref, inject } from 'vue';
import { RADIO_GROUP_INJECTION_KEY } from './constants';

export interface CoarRadioButtonProps {
  /** Value of this radio option */
  value: unknown;
  /** Disables this specific radio button */
  disabled?: boolean;
}

const props = withDefaults(defineProps<CoarRadioButtonProps>(), {
  disabled: false,
});

const group = inject(RADIO_GROUP_INJECTION_KEY, undefined);

const isFocused = ref(false);
const autoId = `coar-radio-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;

const isChecked = computed(() => group?.modelValue.value === props.value);
const isDisabled = computed(() => props.disabled || (group?.disabled.value ?? false));
const groupSize = computed(() => group?.size.value ?? 'm');
const groupHasError = computed(() => group?.hasError.value ?? false);
const labelPosition = computed(() => group?.labelPosition.value ?? 'after');
const radioName = computed(() => group?.name.value ?? '');

const hostClasses = computed(() => [
  'coar-radio',
  `coar-radio--${groupSize.value}`,
  {
    'coar-radio--checked': isChecked.value,
    'coar-radio--disabled': isDisabled.value,
    'coar-radio--focused': isFocused.value,
    'coar-radio--error': groupHasError.value,
  },
]);

function onInputChange() {
  if (isDisabled.value) return;
  if (group && !isChecked.value) {
    group.selectValue(props.value);
  }
}

function onClick(event: Event) {
  if (isDisabled.value) {
    event.preventDefault();
    return;
  }
  if (group && !isChecked.value) {
    group.selectValue(props.value);
  }
}

function onFocus() { isFocused.value = true; }
function onBlur() { isFocused.value = false; }
</script>

<template>
  <div :class="hostClasses" @click="onClick">
    <label class="coar-radio__label" :for="autoId">
      <span v-if="labelPosition === 'before'" class="coar-radio__text">
        <slot />
      </span>
      <input
        :id="autoId"
        type="radio"
        class="coar-radio__input"
        :name="radioName"
        :checked="isChecked"
        :disabled="isDisabled"
        @change="onInputChange"
        @focus="onFocus"
        @blur="onBlur"
      />
      <span class="coar-radio__control">
        <span class="coar-radio__dot" />
      </span>
      <span v-if="labelPosition === 'after'" class="coar-radio__text">
        <slot />
      </span>
    </label>
  </div>
</template>

<style scoped>
.coar-radio {
  display: inline-flex;
}

.coar-radio__label {
  display: inline-flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  cursor: pointer;
  user-select: none;
  font-family: var(--coar-body-base-family);
  font-size: var(--coar-component-m-font-size);
  line-height: var(--coar-body-base-line-height);
  color: var(--coar-text-neutral-primary);
}

.coar-radio--disabled .coar-radio__label {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Hidden input */
.coar-radio__input {
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

/* Custom radio control */
.coar-radio__control {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid var(--coar-border-input);
  border-radius: 50%;
  background: var(--coar-surface-input);
  transition: border-color var(--coar-duration-fast) var(--coar-ease-out), box-shadow var(--coar-duration-fast) var(--coar-ease-out);
  flex-shrink: 0;
}

.coar-radio__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  transition: background var(--coar-duration-fast) var(--coar-ease-out);
}

/* Hover */
.coar-radio:not(.coar-radio--disabled):not(.coar-radio--checked):hover .coar-radio__control {
  border-color: var(--coar-border-input-hover);
}

/* Focus */
.coar-radio--focused .coar-radio__control {
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
}

/* Checked */
.coar-radio--checked .coar-radio__control {
  border-color: var(--coar-border-accent-primary);
  background: var(--coar-surface-input);
}

.coar-radio--checked .coar-radio__dot {
  background: var(--coar-background-accent-primary);
}

/* Checked + Hover */
.coar-radio--checked:not(.coar-radio--disabled):hover .coar-radio__control {
  border-color: var(--coar-border-accent-secondary);
}

.coar-radio--checked:not(.coar-radio--disabled):hover .coar-radio__dot {
  background: var(--coar-background-accent-secondary);
}

/* Sizes */
.coar-radio--xs .coar-radio__control { width: 14px; height: 14px; }
/* Even dot in the 10px content box (14 − 2×2 border) → 2px whole-pixel gaps
   so the dot stays crisply centred. An odd 5px dot left 2.5px gaps that
   sub-pixel rounding rendered as visibly off-centre. */
.coar-radio--xs .coar-radio__dot { width: 6px; height: 6px; }
.coar-radio--xs .coar-radio__label { font-size: var(--coar-component-xs-font-size); }

.coar-radio--s .coar-radio__control { width: 16px; height: 16px; }
.coar-radio--s .coar-radio__dot { width: 6px; height: 6px; }
.coar-radio--s .coar-radio__label { font-size: var(--coar-component-s-font-size); }

.coar-radio--l .coar-radio__control { width: 22px; height: 22px; }
.coar-radio--l .coar-radio__dot { width: 10px; height: 10px; }
.coar-radio--l .coar-radio__label { font-size: var(--coar-component-l-font-size); }

/* Error */
.coar-radio--error .coar-radio__control {
  border-color: var(--coar-border-semantic-error-bold);
}

.coar-radio--error.coar-radio--checked .coar-radio__dot {
  background: var(--coar-background-semantic-error-bold);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .coar-radio__control,
  .coar-radio__dot {
    transition: none;
  }
}
</style>
