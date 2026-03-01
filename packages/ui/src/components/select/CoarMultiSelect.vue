<script setup lang="ts" generic="T">
import { computed, toRef, onMounted, onBeforeUnmount, useTemplateRef, nextTick } from 'vue';
import { CoarIcon } from '../icon';
import { useSelectBase, type CoarSelectSize, type CoarSelectAppearance } from './useSelectBase';
import { useSelectDropdown } from './useSelectDropdown';
import { vScrollbar } from '../scrollbar/vScrollbar';
import type { CoarSelectOption } from './types';

export interface CoarMultiSelectProps<T = unknown> {
  /** Label text */
  label?: string;
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
  /** Marks as required */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Hint text */
  hint?: string;
  /** HTML id */
  id?: string;
  /** HTML name */
  name?: string;
  /** Enable search/filter */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Show clear button */
  clearable?: boolean;
  /** Show "Select All" checkbox */
  showSelectAll?: boolean;
  /** Label for "Select All" */
  selectAllLabel?: string;
  /** Comparison function */
  compareWith?: (a: T, b: T) => boolean;
  /** Dropdown position */
  dropdownPosition?: 'auto' | 'top' | 'bottom';
}

const props = withDefaults(defineProps<CoarMultiSelectProps<T>>(), {
  label: '',
  placeholder: 'Select options...',
  options: () => [],
  size: 'm',
  appearance: 'outline',
  disabled: false,
  readonly: false,
  required: false,
  error: '',
  hint: '',
  id: '',
  name: '',
  searchable: false,
  searchPlaceholder: 'Search...',
  clearable: false,
  showSelectAll: false,
  selectAllLabel: 'Select All',
  compareWith: undefined,
  dropdownPosition: 'auto',
});

const model = defineModel<T[]>({ default: () => [] });

const hostRef = useTemplateRef<HTMLElement>('hostRef');
const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const searchInputRef = useTemplateRef<HTMLInputElement>('searchInputRef');
const dropdownRef = useTemplateRef<HTMLElement>('dropdownRef');

const hasError = computed(() => props.error.length > 0);
const displayMessage = computed(() => props.error || props.hint);

const {
  isOpen,
  isFocused,
  searchQuery,
  highlightedIndex,
  inputId,
  messageId,
  listboxId,
  filteredOptions,
  activeDescendantId,
  toggleDropdown,
  closeDropdown,
  onSearchInput,
  onFocus,
  onBlur,
  onKeyDown,
} = useSelectBase({
  options: toRef(props, 'options'),
  searchable: toRef(props, 'searchable'),
  disabled: toRef(props, 'disabled'),
  readonly: toRef(props, 'readonly'),
  id: toRef(props, 'id'),
  dropdownPositionPreference: toRef(props, 'dropdownPosition'),
});

const { left: ddLeft, top: ddTop, minWidth: ddMinWidth } = useSelectDropdown({
  isOpen,
  triggerEl: triggerRef,
  dropdownEl: dropdownRef,
});

const compare = computed(() => props.compareWith ?? ((a: T, b: T) => a === b));

const selectedCount = computed(() => model.value.length);

const displayText = computed(() => {
  if (selectedCount.value === 0) return '';
  const selected = props.options.filter((o) =>
    model.value.some((v) => compare.value(v, o.value)),
  );
  if (selected.length === 1) return selected[0].label;
  return `${selected.length} selected`;
});

const enabledOptions = computed(() => filteredOptions.value.filter((o) => !o.disabled));

const allSelected = computed(() => {
  if (enabledOptions.value.length === 0) return false;
  return enabledOptions.value.every((o) =>
    model.value.some((v) => compare.value(v, o.value)),
  );
});

const someSelected = computed(() => {
  if (allSelected.value) return false;
  return enabledOptions.value.some((o) =>
    model.value.some((v) => compare.value(v, o.value)),
  );
});

const showClearButton = computed(() =>
  props.clearable && selectedCount.value > 0 && !props.disabled && !props.readonly,
);

const hostClasses = computed(() => [
  'coar-select-host',
  `coar-select--${props.size}`,
  {
    'coar-select--inline': props.appearance === 'inline',
    'coar-select--disabled': props.disabled,
    'coar-select--readonly': props.readonly,
    'coar-select--error': hasError.value,
    'coar-select--open': isOpen.value,
  },
]);

function isSelected(option: CoarSelectOption<T>): boolean {
  return model.value.some((v) => compare.value(v, option.value));
}

function toggleOption(option: CoarSelectOption<T>) {
  if (option.disabled || props.disabled || props.readonly) return;
  const idx = model.value.findIndex((v) => compare.value(v, option.value));
  if (idx >= 0) {
    model.value = [...model.value.slice(0, idx), ...model.value.slice(idx + 1)];
  } else {
    model.value = [...model.value, option.value];
  }
}

function toggleAll() {
  if (props.disabled || props.readonly) return;
  if (allSelected.value) {
    // Deselect all enabled options
    model.value = model.value.filter(
      (v) => !enabledOptions.value.some((o) => compare.value(o.value, v)),
    );
  } else {
    // Select all enabled options
    const newValues = [...model.value];
    for (const o of enabledOptions.value) {
      if (!model.value.some((v) => compare.value(v, o.value))) {
        newValues.push(o.value);
      }
    }
    model.value = newValues;
  }
}

function selectHighlighted() {
  const options = filteredOptions.value;
  const idx = highlightedIndex.value;
  if (idx >= 0 && idx < options.length && !options[idx].disabled) {
    toggleOption(options[idx]);
  }
}

function clearSelection(event: Event) {
  event.stopPropagation();
  model.value = [];
}

function onTriggerClick(event: Event) {
  event.stopPropagation();
  toggleDropdown(triggerRef.value ?? undefined);
  if (isOpen.value && props.searchable) {
    nextTick(() => searchInputRef.value?.focus());
  }
}

function handleKeyDown(event: KeyboardEvent) {
  onKeyDown(event, selectHighlighted, triggerRef.value ?? undefined);
  if (isOpen.value && props.searchable && event.key !== 'Escape' && event.key !== 'Tab') {
    nextTick(() => searchInputRef.value?.focus());
  }
}

function onDocumentMouseDown(event: MouseEvent) {
  if (!isOpen.value) return;
  const target = event.target as Node;
  if (hostRef.value?.contains(target)) return;
  if (dropdownRef.value?.contains(target)) return;
  closeDropdown();
}

onMounted(() => document.addEventListener('mousedown', onDocumentMouseDown));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMouseDown));
</script>

<template>
  <div ref="hostRef" :class="hostClasses">
    <div class="coar-select-wrapper">
      <!-- Label -->
      <label v-if="label" :for="inputId" class="coar-select-label">
        {{ label }}
        <span v-if="required" class="coar-select-required">*</span>
      </label>

      <!-- Trigger -->
      <div
        :id="inputId"
        ref="triggerRef"
        class="coar-select-trigger"
        :class="{
          'coar-select-trigger--focused': isFocused,
          'coar-select-trigger--disabled': disabled,
          'coar-select-trigger--readonly': readonly,
          'coar-select-trigger--error': hasError,
          'coar-select-trigger--open': isOpen,
        }"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        :aria-controls="listboxId"
        :aria-activedescendant="activeDescendantId"
        :aria-describedby="displayMessage ? messageId : undefined"
        :aria-invalid="hasError ? 'true' : undefined"
        :aria-disabled="disabled ? 'true' : undefined"
        :tabindex="disabled ? -1 : 0"
        role="combobox"
        @click="onTriggerClick"
        @keydown="handleKeyDown"
        @focus="onFocus"
        @blur="onBlur"
      >
        <span class="coar-select-value" :class="{ 'coar-select-placeholder': selectedCount === 0 }">
          {{ selectedCount > 0 ? displayText : placeholder }}
        </span>

        <span class="coar-select-actions">
          <span v-if="selectedCount > 0" class="coar-multi-select-badge">{{ selectedCount }}</span>
          <button
            v-if="showClearButton"
            type="button"
            class="coar-select-clear"
            tabindex="-1"
            aria-label="Clear selection"
            @click="clearSelection"
          >
            <CoarIcon name="x" source="coar-builtin" size="auto" />
          </button>
          <CoarIcon
            name="caret-right"
            source="coar-builtin"
            size="auto"
            class="coar-select-arrow"
            :class="{ 'coar-select-arrow--open': isOpen }"
          />
        </span>
      </div>

      <!-- Dropdown (teleported to body for proper stacking) -->
      <Teleport to="body">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          :class="['coar-select-dropdown', `coar-select-dropdown--${props.size}`]"
          role="presentation"
          :style="{
            position: 'fixed',
            top: '0px',
            left: '0px',
            transform: `translate3d(${ddLeft}px, ${ddTop}px, 0)`,
            minWidth: `${ddMinWidth}px`,
            zIndex: 'var(--coar-z-overlay, 1000)',
          }"
        >
          <!-- Search -->
          <div v-if="searchable" class="coar-select-search">
            <input
              ref="searchInputRef"
              type="text"
              class="coar-select-search-input"
              :placeholder="searchPlaceholder"
              :value="searchQuery"
              @input="onSearchInput"
              @keydown="handleKeyDown"
            />
          </div>

          <!-- Select All -->
          <div
            v-if="showSelectAll && !searchQuery"
            class="coar-select-option coar-select-option--select-all"
            @click="toggleAll"
          >
            <span
              class="coar-multi-select-check"
              :class="{
                'coar-multi-select-check--checked': allSelected,
                'coar-multi-select-check--indeterminate': someSelected,
              }"
            >
              <svg v-if="allSelected" viewBox="0 0 16 16" fill="none" class="coar-multi-select-check-icon">
                <path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else-if="someSelected" viewBox="0 0 16 16" fill="none" class="coar-multi-select-check-icon">
                <path d="M4 8H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </span>
            <span class="coar-select-option-label">{{ selectAllLabel }}</span>
          </div>

          <!-- Options List -->
          <div
            :id="listboxId"
            v-scrollbar="{ overflowX: 'hidden', defer: false }"
            class="coar-select-options"
            role="listbox"
            aria-multiselectable="true"
            :aria-label="label || 'Options'"
          >
            <div
              v-for="(option, i) in filteredOptions"
              :id="`${inputId}-option-${i}`"
              :key="String(option.value)"
              class="coar-select-option"
              :class="{
                'coar-select-option--selected': isSelected(option),
                'coar-select-option--highlighted': highlightedIndex === i,
                'coar-select-option--disabled': option.disabled,
              }"
              :aria-selected="isSelected(option)"
              :aria-disabled="option.disabled ? 'true' : undefined"
              tabindex="-1"
              role="option"
              @click="toggleOption(option)"
              @mouseenter="highlightedIndex = i"
            >
              <span class="coar-multi-select-check" :class="{ 'coar-multi-select-check--checked': isSelected(option) }">
                <svg v-if="isSelected(option)" viewBox="0 0 16 16" fill="none" class="coar-multi-select-check-icon">
                  <path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <CoarIcon v-if="option.icon" :name="option.icon" size="s" class="coar-select-option-icon" />
              <span class="coar-select-option-label">{{ option.label }}</span>
            </div>
            <div v-if="filteredOptions.length === 0" class="coar-select-empty">
              {{ searchQuery ? 'No results found' : 'No options available' }}
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Message -->
      <div
        :id="messageId"
        class="coar-form-field-message"
        :class="{ 'coar-form-field-message--error': hasError }"
        :title="displayMessage || undefined"
      >
        {{ displayMessage }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-select-host {
  display: block;
  position: relative;
}

.coar-select-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Label */
.coar-select-label {
  display: block;
  margin-bottom: var(--coar-component-m-label-margin);
  font-family: var(--coar-body-small-bold-family);
  font-size: var(--coar-component-m-label-font-size);
  font-weight: var(--coar-body-small-bold-weight);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  user-select: none;
}

.coar-select-required {
  color: var(--coar-text-semantic-error-bold);
  margin-left: var(--coar-spacing-xs);
}

.coar-select--xs .coar-select-label {
  font-size: var(--coar-component-xs-label-font-size);
  margin-bottom: var(--coar-component-xs-label-margin);
}
.coar-select--s .coar-select-label {
  font-size: var(--coar-component-s-label-font-size);
  margin-bottom: var(--coar-component-s-label-margin);
}
.coar-select--l .coar-select-label {
  font-size: var(--coar-component-l-label-font-size);
  margin-bottom: var(--coar-component-l-label-margin);
}

/* Trigger */
.coar-select-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--coar-component-m-height);
  padding: 0 var(--coar-spacing-s);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-surface-input);
  cursor: pointer;
  transition: border-color var(--coar-duration-fast) var(--coar-ease-out), box-shadow var(--coar-duration-fast) var(--coar-ease-out);
  outline: none;
}

.coar-select--xs .coar-select-trigger { height: var(--coar-component-xs-height); }
.coar-select--s .coar-select-trigger { height: var(--coar-component-s-height); }
.coar-select--l .coar-select-trigger { height: var(--coar-component-l-height); }

.coar-select-trigger:hover:not(.coar-select-trigger--disabled):not(.coar-select-trigger--readonly):not(.coar-select-trigger--error):not(.coar-select-trigger--focused) {
  border-color: var(--coar-border-input-hover);
}

.coar-select-trigger--focused:not(.coar-select-trigger--error) {
  border-color: var(--coar-border-accent-primary);
  box-shadow: inset 0 0 0 1px var(--coar-border-accent-primary);
}

.coar-select-trigger--disabled {
  background: var(--coar-surface-input-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.coar-select-trigger--readonly { cursor: default; }

.coar-select-trigger--error { border-color: var(--coar-border-semantic-error-bold); }

.coar-select-trigger--error.coar-select-trigger--focused {
  box-shadow: inset 0 0 0 1px var(--coar-border-semantic-error-bold);
}

.coar-select--inline .coar-select-trigger {
  border: none;
  background: transparent;
  box-shadow: none;
}

.coar-select--inline .coar-select-trigger:hover:not(.coar-select-trigger--disabled):not(.coar-select-trigger--readonly) {
  background: var(--coar-background-neutral-tertiary);
}

/* Value */
.coar-select-value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  min-width: 0;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-small-base-size);
  font-weight: var(--coar-body-small-base-weight);
  color: var(--coar-text-neutral-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-select-placeholder { color: var(--coar-text-neutral-tertiary); }

/* Actions */
.coar-select-actions {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  margin-left: var(--coar-spacing-xs);
  flex-shrink: 0;
}

/* Badge */
.coar-multi-select-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-primary);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-small-bold-weight);
  line-height: 1;
}

/* Checkbox indicator */
.coar-multi-select-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--coar-select-checkbox-size, 16px);
  height: var(--coar-select-checkbox-size, 16px);
  border: 2px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  flex-shrink: 0;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out), border-color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-multi-select-check--checked,
.coar-multi-select-check--indeterminate {
  background: var(--coar-background-accent-primary);
  border-color: var(--coar-background-accent-primary);
}

.coar-multi-select-check-icon {
  width: 12px;
  height: 12px;
  color: var(--coar-text-on-bold);
}

/* Clear */
.coar-select-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-disabled);
  cursor: pointer;
  border-radius: var(--coar-radius-xs);
  transition: color var(--coar-duration-fast) var(--coar-ease-out), opacity var(--coar-duration-fast) var(--coar-ease-out);
  opacity: 0.4;
}

.coar-select-trigger:hover .coar-select-clear,
.coar-select--open .coar-select-clear {
  opacity: 1;
  color: var(--coar-icon-neutral-tertiary);
}

.coar-select-clear:hover { opacity: 1; color: var(--coar-icon-neutral-primary); }

/* Arrow */
.coar-select-arrow {
  width: 16px;
  height: 16px;
  color: var(--coar-icon-neutral-secondary);
  transform: rotate(90deg);
  transition: transform var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-select-arrow--open { transform: rotate(-90deg); }

/* Dropdown */
.coar-select-dropdown {
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  box-shadow: var(--coar-shadow-m);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Search */
.coar-select-search {
  padding: var(--coar-spacing-s);
  border-bottom: 1px solid var(--coar-border-neutral);
}

.coar-select-search-input {
  box-sizing: border-box;
  width: 100%;
  height: var(--coar-select-search-height, 32px);
  padding: 0 var(--coar-spacing-s);
  border: 1px solid var(--coar-border-input);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-surface-input);
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-select-option-font-size, var(--coar-body-small-base-size));
  color: var(--coar-text-neutral-primary);
  outline: none;
  transition: border-color var(--coar-duration-fast) var(--coar-ease-out), box-shadow var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-select-search-input::placeholder { color: var(--coar-text-neutral-tertiary); }

.coar-select-search-input:focus {
  border-color: var(--coar-border-accent-primary);
  box-shadow: inset 0 0 0 1px var(--coar-border-accent-primary);
}

/* Options */
.coar-select-options {
  max-height: 240px;
  overflow: hidden;
  padding: var(--coar-spacing-xs) 0;
}

.coar-select-option {
  display: flex;
  align-items: center;
  gap: var(--coar-select-option-gap, var(--coar-spacing-xs));
  padding: var(--coar-select-option-padding, var(--coar-spacing-s) var(--coar-spacing-m));
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-select-option-font-size, var(--coar-body-small-base-size));
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-select-option:hover:not(.coar-select-option--disabled),
.coar-select-option--highlighted:not(.coar-select-option--disabled) {
  background: var(--coar-background-neutral-tertiary);
}

.coar-select-option--selected {
  background: transparent;
  color: var(--coar-text-neutral-primary);
}

.coar-select-option--selected:hover,
.coar-select-option--selected.coar-select-option--highlighted {
  background: var(--coar-background-neutral-tertiary);
}

.coar-select-option--disabled { color: var(--coar-text-neutral-disabled); cursor: not-allowed; }
.coar-select-option-icon { flex-shrink: 0; color: inherit; }
.coar-select-option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-select-option--select-all {
  border-bottom: 1px solid var(--coar-border-neutral);
  font-weight: var(--coar-body-small-bold-weight);
}

/* Empty */
.coar-select-empty {
  padding: var(--coar-select-option-padding, var(--coar-spacing-m));
  text-align: center;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-select-option-font-size, var(--coar-body-small-base-size));
  color: var(--coar-text-neutral-tertiary);
}

/* Message */
.coar-form-field-message {
  display: block;
  margin-top: var(--coar-spacing-xs);
  height: calc(var(--coar-body-caption-size) * 1.4);
  font-family: var(--coar-body-caption-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-body-caption-weight);
  line-height: 1.4;
  color: var(--coar-text-neutral-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coar-form-field-message:empty { visibility: hidden; }
.coar-form-field-message--error { color: var(--coar-text-semantic-error-bold); }

@media (prefers-reduced-motion: reduce) {
  .coar-select-trigger,
  .coar-select-clear,
  .coar-select-arrow,
  .coar-select-search-input,
  .coar-select-option,
  .coar-multi-select-check {
    transition: none;
  }
}
</style>
