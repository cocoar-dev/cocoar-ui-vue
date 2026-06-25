<script setup lang="ts" generic="T">
/**
 * Panel mounted by the overlay-service when `CoarSelect` opens. Renders the dropdown
 * options + empty state. The service handles teleport, positioning, `size.minWidth:
 * 'anchor'` (so the dropdown matches the trigger width), z-index stacking, outside
 * click, escape, and reposition on scroll — everything below the markup here is
 * owned by the service.
 *
 * Reactive state is passed in as refs (`filteredOptions`, `highlightedIndex`,
 * `searchQuery`) and accessed via `.value` in the template. That keeps the dropdown
 * in sync with the parent `CoarSelect` without duplicating state.
 */
import { type PropType, type Ref } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarIcon } from '../icon';
import { vScrollbar } from '../scrollbar/vScrollbar';
import { vTooltip } from '../tooltip/vTooltip';
import type { CoarSelectOption } from './types';
import type { CoarSelectSize } from './useSelectBase';

const props = defineProps({
  /** Reactive ref: currently filtered + sorted options. */
  filteredOptions: {
    type: Object as PropType<Ref<CoarSelectOption<T>[]>>,
    required: true,
  },
  /** Reactive ref: index of the currently highlighted (keyboard-focused) option. */
  highlightedIndex: { type: Object as PropType<Ref<number>>, required: true },
  /** Reactive ref: search query — drives empty-state message. */
  searchQuery: { type: Object as PropType<Ref<string>>, required: true },
  /** DOM id for the inner listbox — referenced by the trigger's `aria-controls`. */
  listboxId: { type: String, required: true },
  /** Prefix for per-option ids — `${prefix}-option-${i}` (matches `activeDescendantId`). */
  optionIdPrefix: { type: String, required: true },
  /** Size variant for CSS modifier class. */
  size: { type: String as PropType<CoarSelectSize>, required: true },
  /** Returns true if the option is currently selected. */
  isSelected: {
    type: Function as PropType<(option: CoarSelectOption<T>) => boolean>,
    required: true,
  },
  /** Click handler for an option — host decides whether to close, focus, etc. */
  onOptionClick: {
    type: Function as PropType<(option: CoarSelectOption<T>) => void>,
    required: true,
  },
  /** Mouse-enter highlight handler — syncs `highlightedIndex` with pointer. */
  onHighlight: {
    type: Function as PropType<(i: number) => void>,
    required: true,
  },
});

const { t } = useI18n();

// Local setup bindings so the template auto-unwraps via the ref binding rules
// (auto-unwrap applies to setup bindings that are refs, not to `props.foo`).
const filteredOptions = props.filteredOptions;
const highlightedIndex = props.highlightedIndex;
const searchQuery = props.searchQuery;
</script>

<template>
  <div :class="['coar-select-dropdown', `coar-select-dropdown--${size}`]" role="presentation">
    <div
      :id="listboxId"
      v-scrollbar="{ overflowX: 'hidden', defer: false }"
      class="coar-select-options"
      role="listbox"
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
          <CoarIcon v-if="option.icon" :name="option.icon" size="s" class="coar-select-option-icon" />
          <span class="coar-select-option-label">{{ option.label }}</span>
          <CoarIcon v-if="isSelected(option)" name="check" source="coar-builtin" size="s" class="coar-select-option-check" />
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
  /* Fill the overlay panel, which the service sizes to `minWidth: 'anchor'`
     (≥ trigger width). Without this the dropdown shrinks to its content width,
     leaving an empty strip inside the panel that swallows clicks without
     closing the overlay. */
  width: 100%;
  box-sizing: border-box;
  /* Match the trigger's effective corner: --coar-dropdown-radius tracks the input
     radius, capped at half the trigger height so a full/pill input radius rounds
     the panel like the input's pill end instead of ballooning into a stadium.
     Mirrors CoarInputFrame's --coar-input-corner, re-derived per size below. */
  --coar-dropdown-corner: min(var(--coar-dropdown-radius), calc(var(--coar-component-m-height) / 2));
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-dropdown-corner);
  box-shadow: var(--coar-dropdown-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.coar-select-dropdown--xs { --coar-dropdown-corner: min(var(--coar-dropdown-radius), calc(var(--coar-component-xs-height) / 2)); }
.coar-select-dropdown--s  { --coar-dropdown-corner: min(var(--coar-dropdown-radius), calc(var(--coar-component-s-height) / 2)); }
.coar-select-dropdown--l  { --coar-dropdown-corner: min(var(--coar-dropdown-radius), calc(var(--coar-component-l-height) / 2)); }

.coar-select-options {
  max-height: 240px;
  overflow: hidden;
  /* No top/bottom padding: the first option sits flush at the top and the last
     flush at the bottom. The panel's overflow:hidden + radius clips the first/last
     row highlight to the rounded corners. */
  padding: 0;
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
  transition: background-color 0.1s ease;
}

.coar-select-option:hover:not(.coar-select-option--disabled),
.coar-select-option--highlighted:not(.coar-select-option--disabled) {
  background: var(--coar-background-neutral-tertiary);
}

.coar-select-option--selected {
  background: var(--coar-background-accent-secondary);
  color: var(--coar-text-accent-primary);
}

.coar-select-option--selected:hover,
.coar-select-option--selected.coar-select-option--highlighted {
  background: var(--coar-background-accent-secondary);
}

.coar-select-option--disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
}

.coar-select-option-icon { flex-shrink: 0; color: inherit; }

.coar-select-option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coar-select-option-check {
  flex-shrink: 0;
  color: var(--coar-icon-accent-primary);
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
  .coar-select-option {
    transition: none;
  }
}
</style>
