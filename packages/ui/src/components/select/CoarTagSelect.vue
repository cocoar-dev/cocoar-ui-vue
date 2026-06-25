<script setup lang="ts" generic="T">
/**
 * Tag-style multi-select. Selected values render as removable tags inside the trigger
 * itself; the dropdown shows only not-yet-selected options. Same service-routed
 * pattern as `CoarSelect` and `CoarMultiSelect` — the dropdown is opened via
 * `overlay.open()` when `isOpen && filteredOptions.length > 0` (the legacy component
 * never rendered the panel when there was nothing to show, and we preserve that to
 * avoid a visible empty dropdown flash while typing).
 */
import {
  computed, inject, ref, toRef, watch, onBeforeUnmount, useTemplateRef, nextTick, markRaw,
} from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon } from '../icon';
import { useSelectBase, resolveDropdownSize, type CoarSelectSize, type CoarSelectAppearance } from './useSelectBase';
import { getOverlayService, useOverlayParent } from '../overlay/useOverlay';
import { selectPreset } from '../overlay/overlay-presets';
import type { OverlayRef } from '../overlay/overlay-types';
import type { CoarSelectOption, CoarSelectSortGroups, CoarSelectSortOptions } from './types';
import { FORM_FIELD_INJECTION_KEY } from '../form-field/constants';
import CoarTagSelectDropdownPanel from './CoarTagSelectDropdownPanel.vue';

export interface CoarTagSelectProps<T = unknown> {
  /** Placeholder text */
  placeholder?: string;
  /** Available options */
  options?: CoarSelectOption<T>[];
  /** Select size */
  size?: CoarSelectSize;
  /** Visual appearance */
  appearance?: CoarSelectAppearance;
  /** Disables the select */
  disabled?: boolean;
  /** Makes the select read-only */
  readonly?: boolean;
  /** Whether the select has an error */
  error?: boolean;
  /** HTML id */
  id?: string;
  /** HTML name */
  name?: string;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Allow creating new tags by typing */
  allowCreate?: boolean;
  /** Comparison function */
  compareWith?: (a: T, b: T) => boolean;
  /** Dropdown position */
  dropdownPosition?: 'auto' | 'top' | 'bottom';
  /**
   * Max width of the dropdown panel. Omitted (default) → fixed to the trigger
   * width with ellipsis + tooltip for long labels. Set a number (px) or CSS
   * length → the panel may grow from the trigger width up to this cap.
   */
  dropdownMaxWidth?: number | string;
  /** Sort order for groups. Default: 'asc' */
  sortGroups?: CoarSelectSortGroups;
  /** Sort order for options (within each group, or all if ungrouped). Default: 'none' */
  sortOptions?: CoarSelectSortOptions<T>;
}

const props = withDefaults(defineProps<CoarTagSelectProps<T>>(), {
  placeholder: 'Type to search...',
  options: () => [],
  size: 'm',
  appearance: 'outline',
  disabled: false,
  readonly: false,
  error: false,
  id: '',
  name: '',
  searchPlaceholder: 'Type to search...',
  allowCreate: false,
  compareWith: undefined,
  dropdownPosition: 'auto',
  sortGroups: 'asc',
  sortOptions: 'none',
});

const { t } = useI18n();
const model = defineModel<T[]>({ default: () => [] });

const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);

const hostRef = useTemplateRef<HTMLElement>('hostRef');
const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const tagInputRef = useTemplateRef<HTMLInputElement>('tagInputRef');

const hasError = computed(() => props.error || (formField?.hasError.value ?? false));
const tagInputValue = ref('');

const compare = computed(() => props.compareWith ?? ((a: T, b: T) => a === b));

// Options minus already selected
const availableOptions = computed(() =>
  props.options.filter((o) => !model.value.some((v) => compare.value(v, o.value))),
);

const {
  isOpen,
  isFocused,
  searchQuery,
  highlightedIndex,
  inputId: baseInputId,
  listboxId,
  filteredOptions,
  activeDescendantId,
  openDropdown,
  closeDropdown,
  onKeyDown,
} = useSelectBase({
  options: availableOptions,
  searchable: computed(() => true),
  disabled: toRef(props, 'disabled'),
  readonly: toRef(props, 'readonly'),
  id: toRef(props, 'id'),
  dropdownPositionPreference: toRef(props, 'dropdownPosition'),
  sortGroups: toRef(props, 'sortGroups'),
  sortOptions: toRef(props, 'sortOptions'),
});

const inputId = computed(() => props.id || formField?.inputId.value || baseInputId.value);
const describedBy = computed(() => formField?.messageId.value || undefined);

const selectedTags = computed(() =>
  model.value.map((v) => {
    const opt = props.options.find((o) => compare.value(o.value, v));
    return opt ?? { value: v, label: String(v) };
  }),
);

const hostClasses = computed(() => [
  'coar-tag-select-host',
  `coar-select--${props.size}`,
  {
    'coar-select--inline': props.appearance === 'inline',
    'coar-select--disabled': props.disabled,
    'coar-select--readonly': props.readonly,
    'coar-select--error': hasError.value,
    'coar-select--open': isOpen.value,
  },
]);

function removeTag(value: T, event?: Event) {
  event?.stopPropagation();
  if (props.disabled || props.readonly) return;
  model.value = model.value.filter((v) => !compare.value(v, value));
}

function selectOption(option: CoarSelectOption<T>) {
  if (option.disabled || props.disabled || props.readonly) return;
  model.value = [...model.value, option.value];
  tagInputValue.value = '';
  searchQuery.value = '';
  nextTick(() => tagInputRef.value?.focus());
}

function selectHighlighted() {
  const options = filteredOptions.value;
  const idx = highlightedIndex.value;
  if (idx >= 0 && idx < options.length && !options[idx].disabled) {
    selectOption(options[idx]);
  }
}

function onTagInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  tagInputValue.value = value;
  searchQuery.value = value;
  if (value && !isOpen.value) {
    openDropdown(triggerRef.value ?? undefined);
  }
}

function onTagKeyDown(event: KeyboardEvent) {
  // Backspace removes last tag when input is empty
  if (event.key === 'Backspace' && !tagInputValue.value && model.value.length > 0) {
    model.value = model.value.slice(0, -1);
    return;
  }

  // Enter creates new tag if allowCreate and no highlighted option
  if (event.key === 'Enter' && props.allowCreate && tagInputValue.value.trim()) {
    const query = tagInputValue.value.trim();
    const match = filteredOptions.value.find((o) => o.label.toLowerCase() === query.toLowerCase());
    if (highlightedIndex.value >= 0) {
      selectHighlighted();
    } else if (match) {
      selectOption(match);
    } else {
      // Create new tag (cast to T — allowCreate assumes T is string-compatible)
      model.value = [...model.value, query as T];
      tagInputValue.value = '';
      searchQuery.value = '';
    }
    event.preventDefault();
    return;
  }

  onKeyDown(event, selectHighlighted, triggerRef.value ?? undefined, true);
}

function onTriggerClick() {
  if (props.disabled || props.readonly) return;
  tagInputRef.value?.focus();
  if (!isOpen.value && availableOptions.value.length > 0) {
    openDropdown(triggerRef.value ?? undefined);
  }
}

function onInputFocus() {
  isFocused.value = true;
  if (availableOptions.value.length > 0) {
    openDropdown(triggerRef.value ?? undefined);
  }
}

function onInputBlur() {
  isFocused.value = false;
}

// --- overlay-service wiring ---
//
// The legacy TagSelect hid the dropdown whenever `filteredOptions.length === 0` so
// an "empty state" never flashed on-screen between keystrokes. Mirror that here by
// closing the overlay when options drop to zero and re-opening when they return.

const parentOverlay = useOverlayParent();
let overlayRef: OverlayRef | null = null;

const shouldShowOverlay = computed(() => isOpen.value && filteredOptions.value.length > 0);

function openOverlay() {
  const trigger = triggerRef.value;
  if (!trigger || overlayRef) return;

  const ref = getOverlayService().open({
    spec: {
      ...selectPreset,
      anchor: { kind: 'element', element: trigger },
      size: resolveDropdownSize(props.dropdownMaxWidth),
    },
    content: { kind: 'component', component: markRaw(CoarTagSelectDropdownPanel) },
    inputs: {
      filteredOptions,
      highlightedIndex,
      listboxId: listboxId.value,
      optionIdPrefix: inputId.value,
      size: props.size,
      onOptionClick: (opt: CoarSelectOption<T>) => selectOption(opt),
      onHighlight: (i: number) => { highlightedIndex.value = i; },
    },
    parent: parentOverlay,
  });
  overlayRef = ref;

  ref.afterClosed.then(() => {
    if (overlayRef !== ref) return;
    overlayRef = null;
    if (isOpen.value) closeDropdown();
  });
}

function closeOverlay() {
  const ref = overlayRef;
  overlayRef = null;
  if (ref && !ref.isClosed) ref.close();
}

watch(shouldShowOverlay, (show) => {
  if (show) openOverlay();
  else closeOverlay();
});

onBeforeUnmount(() => {
  closeOverlay();
});
</script>

<template>
  <div ref="hostRef" :class="hostClasses">
    <div class="coar-select-wrapper">
      <!-- Trigger with Tags -->
      <div
        ref="triggerRef"
        class="coar-tag-select-trigger"
        :class="{
          'coar-tag-select-trigger--focused': isFocused,
          'coar-tag-select-trigger--disabled': disabled,
          'coar-tag-select-trigger--readonly': readonly,
          'coar-tag-select-trigger--error': hasError,
        }"
        @click="onTriggerClick"
      >
        <div class="coar-tag-select-tags">
          <span
            v-for="tag in selectedTags"
            :key="String(tag.value)"
            class="coar-tag-select-tag"
          >
            <span class="coar-tag-select-tag-label">{{ tag.label }}</span>
            <button
              v-if="!disabled && !readonly"
              type="button"
              class="coar-tag-select-tag-remove"
              tabindex="-1"
              :aria-label="t('coar.ui.tagSelect.remove', undefined, 'Remove')"
              @click="removeTag(tag.value, $event)"
            >
              <CoarIcon name="x" source="coar-builtin" size="auto" />
            </button>
          </span>
          <input
            :id="inputId"
            ref="tagInputRef"
            type="text"
            class="coar-tag-select-input"
            :placeholder="selectedTags.length === 0 ? placeholder : ''"
            :disabled="disabled"
            :readonly="readonly"
            :value="tagInputValue"
            :aria-expanded="isOpen"
            aria-haspopup="listbox"
            :aria-controls="listboxId"
            :aria-activedescendant="activeDescendantId"
            :aria-describedby="describedBy"
            :aria-invalid="hasError ? 'true' : undefined"
            role="combobox"
            autocomplete="off"
            @input="onTagInput"
            @keydown="onTagKeyDown"
            @focus="onInputFocus"
            @blur="onInputBlur"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-tag-select-host {
  display: block;
  position: relative;
}

.coar-select-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Tag Trigger */
.coar-tag-select-trigger {
  display: flex;
  align-items: center;
  /* Match the other selects' single-row height. The frame uses a fixed content
     `height` (+1px border each side); here the box is content-box + vertical
     padding (for multi-row chip breathing room), so the padding would stack ON TOP
     of min-height and make a single row 2×spacing-xs taller. Subtract that padding
     back out → single row == frame height; wrapped rows still grow naturally. */
  min-height: calc(var(--coar-component-m-height) - 2 * var(--coar-spacing-xs));
  --coar-field-pad: calc(var(--coar-field-padding-x) * var(--coar-component-scale, 1) * var(--coar-component-density, 1));
  padding: var(--coar-spacing-xs) var(--coar-field-pad);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-input-radius);
  background: var(--coar-surface-input);
  cursor: text;
  transition: border-color var(--coar-duration-fast) var(--coar-ease-out), box-shadow var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-select--xs .coar-tag-select-trigger { min-height: calc(var(--coar-component-xs-height) - 2 * var(--coar-spacing-xs)); --coar-component-scale: var(--coar-component-xs-scale); }
.coar-select--s .coar-tag-select-trigger { min-height: calc(var(--coar-component-s-height) - 2 * var(--coar-spacing-xs)); --coar-component-scale: var(--coar-component-s-scale); }
.coar-select--l .coar-tag-select-trigger { min-height: calc(var(--coar-component-l-height) - 2 * var(--coar-spacing-xs)); --coar-component-scale: var(--coar-component-l-scale); }

/* Per-size input text (was constant 14px regardless of size) */
.coar-select--xs .coar-tag-select-input { font-size: var(--coar-component-xs-font-size); }
.coar-select--s .coar-tag-select-input { font-size: var(--coar-component-s-font-size); }
.coar-select--l .coar-tag-select-input { font-size: var(--coar-component-l-font-size); }

.coar-tag-select-trigger:hover:not(.coar-tag-select-trigger--disabled):not(.coar-tag-select-trigger--readonly):not(.coar-tag-select-trigger--error):not(.coar-tag-select-trigger--focused) {
  border-color: var(--coar-border-input-hover);
}

.coar-tag-select-trigger--focused:not(.coar-tag-select-trigger--error) {
  border-color: var(--coar-focus-color);
  box-shadow: inset 0 0 0 1px var(--coar-focus-color);
}

.coar-tag-select-trigger--disabled {
  background: var(--coar-surface-input-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.coar-tag-select-trigger--readonly { cursor: default; }

.coar-tag-select-trigger--error { border-color: var(--coar-border-semantic-error-bold); }

.coar-tag-select-trigger--error.coar-tag-select-trigger--focused {
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold);
}

.coar-select--inline .coar-tag-select-trigger {
  border: none;
  background: transparent;
  box-shadow: none;
}

/* Tags Container */
.coar-tag-select-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--coar-spacing-xs);
  align-items: center;
  flex: 1;
  min-width: 0;
}

/* Tag */
.coar-tag-select-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  /* Scale chip height + font with the control size so an xs trigger isn't
     forced taller by a fixed 24px chip (see --coar-component-scale). */
  height: calc(24px * var(--coar-component-scale, 1));
  padding: 0 var(--coar-spacing-xs) 0 var(--coar-spacing-s);
  border-radius: var(--coar-tag-radius);
  background: var(--coar-background-neutral-secondary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  color: var(--coar-text-neutral-primary);
  font-family: var(--coar-body-small-base-family);
  font-size: calc(var(--coar-body-caption-size) * var(--coar-component-scale, 1));
  font-weight: var(--coar-body-small-bold-weight);
  white-space: nowrap;
  max-width: 160px;
}

.coar-tag-select-tag-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.coar-tag-select-tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  border-radius: var(--coar-radius-xxs);
  opacity: 0.6;
  transition: opacity var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-tag-select-tag-remove:hover { opacity: 1; }

/* Input */
.coar-tag-select-input {
  flex: 1;
  min-width: 60px;
  height: calc(24px * var(--coar-component-scale, 1));
  padding: 0;
  border: none;
  background: transparent;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-primary);
  outline: none;
}

.coar-tag-select-input::placeholder { color: var(--coar-text-placeholder); }

@media (prefers-reduced-motion: reduce) {
  .coar-tag-select-trigger,
  .coar-tag-select-tag-remove {
    transition: none;
  }
}
</style>
