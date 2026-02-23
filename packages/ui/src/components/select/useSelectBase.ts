import { ref, computed, watch, type Ref } from 'vue';
import type { CoarSelectOption } from './types';

export type CoarSelectSize = 'xs' | 's' | 'm' | 'l';
export type CoarSelectAppearance = 'outline' | 'inline';

export interface UseSelectBaseOptions {
  options: Ref<CoarSelectOption[]>;
  searchable: Ref<boolean>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  id: Ref<string>;
  dropdownPositionPreference: Ref<'auto' | 'top' | 'bottom'>;
}

export function useSelectBase(opts: UseSelectBaseOptions) {
  const isOpen = ref(false);
  const isFocused = ref(false);
  const searchQuery = ref('');
  const highlightedIndex = ref(-1);
  const dropdownPosition = ref<'top' | 'bottom'>('bottom');

  const autoId = `coar-select-${crypto.randomUUID?.() ?? Date.now().toString(16)}`;
  const inputId = computed(() => opts.id.value || autoId);
  const messageId = computed(() => `${inputId.value}-message`);
  const listboxId = computed(() => `${inputId.value}-listbox`);

  const filteredOptions = computed(() => {
    const query = searchQuery.value.toLowerCase().trim();
    if (!query) return opts.options.value;
    return opts.options.value.filter((o) => o.label.toLowerCase().includes(query));
  });

  // Reset highlighted index when filtered options change
  watch(filteredOptions, () => {
    highlightedIndex.value = -1;
  });

  const activeDescendantId = computed(() => {
    const index = highlightedIndex.value;
    if (index < 0 || index >= filteredOptions.value.length) return undefined;
    return `${inputId.value}-option-${index}`;
  });

  function highlightNextOption() {
    const options = filteredOptions.value;
    let next = highlightedIndex.value + 1;
    while (next < options.length) {
      if (!options[next].disabled) {
        highlightedIndex.value = next;
        scrollToHighlighted();
        return;
      }
      next++;
    }
  }

  function highlightPreviousOption() {
    const options = filteredOptions.value;
    let prev = highlightedIndex.value - 1;
    while (prev >= 0) {
      if (!options[prev].disabled) {
        highlightedIndex.value = prev;
        scrollToHighlighted();
        return;
      }
      prev--;
    }
  }

  function highlightFirstOption() {
    const options = filteredOptions.value;
    for (let i = 0; i < options.length; i++) {
      if (!options[i].disabled) {
        highlightedIndex.value = i;
        scrollToHighlighted();
        return;
      }
    }
  }

  function highlightLastOption() {
    const options = filteredOptions.value;
    for (let i = options.length - 1; i >= 0; i--) {
      if (!options[i].disabled) {
        highlightedIndex.value = i;
        scrollToHighlighted();
        return;
      }
    }
  }

  function scrollToHighlighted() {
    setTimeout(() => {
      const el = document.querySelector(`#${inputId.value}-option-${highlightedIndex.value}`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  function openDropdown(triggerEl?: HTMLElement) {
    if (opts.disabled.value || opts.readonly.value) return;
    if (isOpen.value) return;

    // Resolve position
    if (triggerEl && opts.dropdownPositionPreference.value === 'auto') {
      const rect = triggerEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      dropdownPosition.value = spaceBelow < 260 && spaceAbove > spaceBelow ? 'top' : 'bottom';
    } else if (opts.dropdownPositionPreference.value !== 'auto') {
      dropdownPosition.value = opts.dropdownPositionPreference.value;
    }

    isOpen.value = true;
    searchQuery.value = '';
    highlightedIndex.value = -1;
  }

  function closeDropdown() {
    isOpen.value = false;
    searchQuery.value = '';
    highlightedIndex.value = -1;
  }

  function toggleDropdown(triggerEl?: HTMLElement) {
    if (isOpen.value) closeDropdown();
    else openDropdown(triggerEl);
  }

  function onSearchInput(event: Event) {
    searchQuery.value = (event.target as HTMLInputElement).value;
    highlightedIndex.value = -1;
  }

  function onFocus() { isFocused.value = true; }
  function onBlur() { isFocused.value = false; }

  // Outside click handler
  function handleOutsideClick(event: MouseEvent, hostEl: HTMLElement | null) {
    if (!isOpen.value || !hostEl) return;
    if (!hostEl.contains(event.target as Node)) {
      closeDropdown();
    }
  }

  function onKeyDown(
    event: KeyboardEvent,
    selectHighlighted: () => void,
    triggerEl?: HTMLElement,
  ) {
    if (opts.disabled.value || opts.readonly.value) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        if (!isOpen.value) {
          event.preventDefault();
          openDropdown(triggerEl);
          highlightFirstOption();
        } else if (highlightedIndex.value >= 0) {
          event.preventDefault();
          selectHighlighted();
        }
        break;
      case 'Escape':
        if (isOpen.value) {
          event.preventDefault();
          closeDropdown();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen.value) {
          openDropdown(triggerEl);
          highlightFirstOption();
        } else {
          highlightNextOption();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen.value) {
          openDropdown(triggerEl);
          highlightLastOption();
        } else {
          highlightPreviousOption();
        }
        break;
      case 'Home':
        if (isOpen.value) {
          event.preventDefault();
          highlightFirstOption();
        }
        break;
      case 'End':
        if (isOpen.value) {
          event.preventDefault();
          highlightLastOption();
        }
        break;
      case 'Tab':
        if (isOpen.value) closeDropdown();
        break;
    }
  }

  return {
    isOpen,
    isFocused,
    searchQuery,
    highlightedIndex,
    dropdownPosition,
    inputId,
    messageId,
    listboxId,
    filteredOptions,
    activeDescendantId,
    openDropdown,
    closeDropdown,
    toggleDropdown,
    onSearchInput,
    onFocus,
    onBlur,
    onKeyDown,
    handleOutsideClick,
    highlightFirstOption,
  };
}
