<script setup lang="ts" generic="T">
/**
 * Panel mounted by the overlay-service when `CoarMultiSelect` opens. Same split as
 * `CoarSelectDropdownPanel` (service owns positioning / teleport / stacking / dismiss),
 * plus the extra markup for the multi-select variant: a leading "Select all" row with
 * check-all / indeterminate state, and a checkbox indicator on each option.
 */
import { type PropType, type Ref } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon } from '../icon';
import { vScrollbar } from '../scrollbar/vScrollbar';
import { vTooltip } from '../tooltip/vTooltip';
import type { CoarSelectOption } from './types';
import type { CoarSelectSize } from './useSelectBase';

const props = defineProps({
  filteredOptions: { type: Object as PropType<Ref<CoarSelectOption<T>[]>>, required: true },
  highlightedIndex: { type: Object as PropType<Ref<number>>, required: true },
  searchQuery: { type: Object as PropType<Ref<string>>, required: true },
  listboxId: { type: String, required: true },
  optionIdPrefix: { type: String, required: true },
  size: { type: String as PropType<CoarSelectSize>, required: true },
  /** Shown when `showSelectAll && !searchQuery` — checks/unchecks all enabled options. */
  showSelectAll: { type: Boolean, required: true },
  selectAllLabel: { type: String, required: true },
  /** Reactive ref: true when every enabled option is selected. */
  allSelected: { type: Object as PropType<Ref<boolean>>, required: true },
  /** Reactive ref: true when some but not all enabled options are selected. */
  someSelected: { type: Object as PropType<Ref<boolean>>, required: true },
  onToggleAll: { type: Function as PropType<() => void>, required: true },
  isSelected: {
    type: Function as PropType<(option: CoarSelectOption<T>) => boolean>,
    required: true,
  },
  onOptionClick: {
    type: Function as PropType<(option: CoarSelectOption<T>) => void>,
    required: true,
  },
  onHighlight: {
    type: Function as PropType<(i: number) => void>,
    required: true,
  },
});

const { t } = useI18n();

// Setup bindings so the template auto-unwraps the refs.
const filteredOptions = props.filteredOptions;
const highlightedIndex = props.highlightedIndex;
const searchQuery = props.searchQuery;
const allSelected = props.allSelected;
const someSelected = props.someSelected;
</script>

<template>
  <div :class="['coar-select-dropdown', `coar-select-dropdown--${size}`]" role="presentation">
    <!-- Select All -->
    <div
      v-if="showSelectAll && !searchQuery"
      class="coar-select-option coar-select-option--select-all"
      role="option"
      :aria-selected="allSelected"
      @click="onToggleAll()"
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
      :aria-label="t('coar.ui.select.options', undefined, 'Options')"
    >
      <template v-for="(option, i) in filteredOptions" :key="String(option.value)">
        <div
          v-if="option.group && (i === 0 || filteredOptions[i - 1]?.group !== option.group)"
          class="coar-select-group-header"
          role="presentation"
        >
          {{ option.group }}
        </div>
        <div
          :id="`${optionIdPrefix}-option-${i}`"
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
          v-tooltip="{ content: option.label, onlyOnOverflow: '.coar-select-option-label', placement: 'top', openDelay: 300 }"
          @click="onOptionClick(option)"
          @mouseenter="onHighlight(i)"
        >
          <span class="coar-multi-select-check" :class="{ 'coar-multi-select-check--checked': isSelected(option) }">
            <svg v-if="isSelected(option)" viewBox="0 0 16 16" fill="none" class="coar-multi-select-check-icon">
              <path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <CoarIcon v-if="option.icon" :name="option.icon" size="s" class="coar-select-option-icon" />
          <span class="coar-select-option-label">{{ option.label }}</span>
        </div>
      </template>
      <div v-if="filteredOptions.length === 0" class="coar-select-empty">
        {{ searchQuery ? t('coar.ui.select.noResults', undefined, 'No results found') : t('coar.ui.select.noOptions', undefined, 'No options available') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-select-dropdown {
  /* Fill the overlay panel (sized to `minWidth: 'anchor'`) so no empty strip
     inside the panel swallows clicks. See CoarSelectDropdownPanel for detail. */
  width: 100%;
  box-sizing: border-box;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-dropdown-radius);
  box-shadow: var(--coar-dropdown-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.coar-select-options {
  max-height: 240px;
  overflow: hidden;
  padding: var(--coar-spacing-xs) 0;
}

.coar-select-option {
  display: flex;
  align-items: center;
  gap: var(--coar-select-option-gap);
  padding: var(--coar-select-option-padding);
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-select-option-font-size);
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

.coar-multi-select-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--coar-select-checkbox-size);
  height: var(--coar-select-checkbox-size);
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

.coar-select-group-header {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: var(--coar-spacing-s) var(--coar-spacing-s) var(--coar-spacing-xs);
  border-top: 1px solid transparent;
  background: var(--coar-background-neutral-primary);
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-body-caption-size);
  font-weight: var(--coar-font-weight-semibold);
  color: var(--coar-text-neutral-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  user-select: none;
}

.coar-select-group-header::before {
  content: '';
  position: absolute;
  top: calc(-1 * var(--coar-spacing-xs) - 1px);
  left: 0;
  right: 0;
  height: calc(var(--coar-spacing-xs) + 1px);
  background: inherit;
}

.coar-select-group-header:not(:first-child) {
  border-top-color: var(--coar-border-neutral-tertiary);
}

.coar-select-empty {
  padding: var(--coar-select-option-padding);
  text-align: center;
  font-family: var(--coar-body-small-base-family);
  font-size: var(--coar-select-option-font-size);
  color: var(--coar-text-neutral-tertiary);
}

@media (prefers-reduced-motion: reduce) {
  .coar-select-option,
  .coar-multi-select-check {
    transition: none;
  }
}
</style>
