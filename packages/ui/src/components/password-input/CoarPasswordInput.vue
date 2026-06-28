<script setup lang="ts">
import { computed, ref, inject, useTemplateRef } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon } from '../icon';
import CoarInputFrame from '../input-frame/CoarInputFrame.vue';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';

export type CoarPasswordInputSize = 'xs' | 's' | 'm' | 'l';

export interface CoarPasswordInputProps {
  /** Placeholder text shown when input is empty */
  placeholder?: string;
  /** Input size */
  size?: CoarPasswordInputSize;
  /** Disables the input */
  disabled?: boolean;
  /** Makes the input read-only */
  readonly?: boolean;
  /** Marks the input as required */
  required?: boolean;
  /** Error state (boolean for standalone use; auto-injected from CoarFormField) */
  error?: boolean;
  /** Show clear button when input has value */
  clearable?: boolean;
  /** HTML id attribute */
  id?: string;
  /** HTML name attribute */
  name?: string;
  /** HTML autocomplete attribute */
  autocomplete?: string;
  /** Maximum character length */
  maxlength?: number;
}

const props = withDefaults(defineProps<CoarPasswordInputProps>(), {
  placeholder: '',
  size: 'm',
  disabled: false,
  readonly: false,
  required: false,
  error: false,
  clearable: false,
  id: '',
  name: '',
  autocomplete: 'current-password',
  maxlength: undefined,
});

const model = defineModel<string>({ default: '' });

const emit = defineEmits<{
  focused: [event: FocusEvent];
  blurred: [event: FocusEvent];
  clear: [];
}>();

const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

const { t } = useI18n();

const showPassword = ref(false);
const inputElement = useTemplateRef<HTMLInputElement>('inputElement');

const autoId = `coar-password-input-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
const inputId = computed(() => props.id || formField?.inputId.value || autoId);

const inputType = computed(() => (showPassword.value ? 'text' : 'password'));
const toggleIcon = computed(() => (showPassword.value ? 'eye' : 'eye-off'));
const toggleAriaLabel = computed(() =>
  showPassword.value
    ? t('coar.ui.passwordInput.hidePassword', undefined, 'Hide password')
    : t('coar.ui.passwordInput.showPassword', undefined, 'Show password'),
);

const hasError = computed(() => props.error || (formField?.hasError.value ?? false));
const describedBy = computed(() => formField?.messageId.value || undefined);

const showClearButton = computed(() =>
  props.clearable && model.value.length > 0 && !props.disabled && !props.readonly
);

// Keep the clear button's layout slot whenever clearing is possible; only hide
// it visually while empty, so the field doesn't resize on first keystroke.
const clearSlotActive = computed(() =>
  props.clearable && !props.disabled && !props.readonly
);

const hostClasses = computed(() => [
  'coar-password-input-host',
  `coar-password-input--${props.size}`,
]);

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  model.value = target.value;
}

function onFocus(event: FocusEvent) {
  emit('focused', event);
}

function onBlur(event: FocusEvent) {
  emit('blurred', event);
}

function onClear() {
  model.value = '';
  emit('clear');
  inputElement.value?.focus();
}

function togglePasswordVisibility() {
  if (!props.disabled && !props.readonly) {
    showPassword.value = !showPassword.value;
  }
}
</script>

<template>
  <div :class="hostClasses">
    <div class="coar-password-input-wrapper">
      <!-- Single-line input shell owns box / radius / padding / states -->
      <CoarInputFrame
        class="coar-password-input-frame"
        :size="size"
        :error="hasError"
        :disabled="disabled"
        :readonly="readonly"
      >
        <!-- Input Element -->
        <input
          :id="inputId"
          ref="inputElement"
          :name="name"
          :type="inputType"
          :value="model"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :autocomplete="autocomplete || undefined"
          :maxlength="maxlength"
          :aria-describedby="describedBy"
          :aria-invalid="hasError ? 'true' : undefined"
          class="coar-password-input-field"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
        />

        <!-- Clear + visibility toggle → trailing affixes (both Type A) -->
        <template #trailing>
          <button
            v-if="clearSlotActive"
            type="button"
            class="coar-password-input-clear"
            :class="{ 'coar-password-input-clear--hidden': !showClearButton }"
            tabindex="-1"
            :aria-hidden="!showClearButton || undefined"
            :aria-label="t('coar.ui.passwordInput.clear', undefined, 'Clear')"
            @click="onClear"
          >
            <CoarIcon name="x" source="coar-builtin" size="auto" />
          </button>

          <button
            type="button"
            class="coar-password-input-toggle"
            tabindex="-1"
            :aria-label="toggleAriaLabel"
            :aria-controls="inputId"
            @click="togglePasswordVisibility"
          >
            <CoarIcon :name="toggleIcon" source="coar-builtin" size="auto" />
          </button>
        </template>
      </CoarInputFrame>
    </div>
  </div>
</template>

<style scoped>
.coar-password-input-host {
  display: block;
}

.coar-password-input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Box / radius / size / states owned by CoarInputFrame. */

/* Size-specific typography */
.coar-password-input--xs .coar-password-input-field { font-size: var(--coar-component-xs-font-size); }
.coar-password-input--s .coar-password-input-field { font-size: var(--coar-component-s-font-size); }
.coar-password-input--l .coar-password-input-field { font-size: var(--coar-component-l-font-size); }

/* Input Field — horizontal padding owned by the frame. */
.coar-password-input-field {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
}

.coar-password-input-field::placeholder { color: var(--coar-text-placeholder); }
.coar-password-input-field:disabled { color: var(--coar-text-neutral-disabled); cursor: not-allowed; }
.coar-password-input-field:read-only { cursor: default; }

/* Clear Button */
.coar-password-input-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-disabled);
  font-size: var(--coar-body-small-base-size);
  cursor: pointer;
  transition:
    color var(--coar-duration-fast) var(--coar-ease-out),
    opacity var(--coar-duration-fast) var(--coar-ease-out);
  flex-shrink: 0;
  opacity: 0.4;
}

/* Empty state — keep the slot (no resize on first keystroke), just hide it. */
.coar-password-input-clear--hidden {
  visibility: hidden;
  pointer-events: none;
}

.coar-password-input-frame:focus-within .coar-password-input-clear,
.coar-password-input-frame:hover .coar-password-input-clear {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}

.coar-password-input--xs .coar-password-input-clear { font-size: var(--coar-component-xs-font-size); }
.coar-password-input--s .coar-password-input-clear { font-size: var(--coar-component-s-font-size); }
.coar-password-input--l .coar-password-input-clear { font-size: var(--coar-component-l-font-size); }

.coar-password-input-clear:hover { color: var(--coar-icon-neutral-primary); }
.coar-password-input-clear:focus { outline: none; }
.coar-password-input-clear:focus-visible { color: var(--coar-icon-neutral-primary); }

/* Toggle Visibility Button — a Type-A icon affix; the frame's trailing wrapper
   provides the outer field-pad, so the button itself stays flush. */
.coar-password-input-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-secondary);
  font-size: var(--coar-body-small-base-size);
  cursor: pointer;
  transition: color var(--coar-duration-fast) var(--coar-ease-out);
  flex-shrink: 0;
}

.coar-password-input--xs .coar-password-input-toggle { font-size: var(--coar-component-xs-font-size); }
.coar-password-input--s .coar-password-input-toggle { font-size: var(--coar-component-s-font-size); }
.coar-password-input--l .coar-password-input-toggle { font-size: var(--coar-component-l-font-size); }

.coar-password-input-toggle:hover { color: var(--coar-icon-neutral-primary); }
.coar-password-input-toggle:focus { outline: none; }
.coar-password-input-toggle:focus-visible { color: var(--coar-icon-neutral-primary); }

/* Browser autofill styling */
.coar-password-input-field:-webkit-autofill,
.coar-password-input-field:-webkit-autofill:hover,
.coar-password-input-field:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--coar-text-neutral-primary);
  -webkit-box-shadow: 0 0 0px 1000px var(--coar-surface-input) inset;
  transition: background-color 5000s ease-in-out 0s;
}

.coar-input-frame--disabled .coar-password-input-toggle,
.coar-input-frame--readonly .coar-password-input-toggle {
  cursor: not-allowed;
  opacity: 0.5;
  pointer-events: none;
}

/* Message styles are in shared/form-field-message.css */

@media (prefers-reduced-motion: reduce) {
  .coar-password-input-frame,
  .coar-password-input-clear,
  .coar-password-input-toggle {
    transition-duration: 0s;
  }
}
</style>
