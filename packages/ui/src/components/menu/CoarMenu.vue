<script setup lang="ts">
import { onBeforeUnmount, ref, provide, nextTick } from 'vue';
import { MenuCascade, provideMenuCascade, useMenuCascade, MENU_NAV_KEY, type MenuNavigationItem } from './menu-cascade';
import { vScrollbar } from '../scrollbar/vScrollbar';

const props = withDefaults(
  defineProps<{
    /** Reserve icon column to prevent layout shift. Default: true */
    showIconColumn?: boolean;
    /** Remove border/background/shadow for seamless embedding. */
    borderless?: boolean;
  }>(),
  { showIconColumn: true, borderless: false },
);

const parentCascade = useMenuCascade();
const cascade = new MenuCascade(parentCascade ?? null);
provideMenuCascade(cascade);

// --- Roving tabindex navigation ---
const items = ref<MenuNavigationItem[]>([]);
const activeIndex = ref(0);

function sortItemsByDom() {
  items.value.sort((a, b) => {
    const pos = a.el.compareDocumentPosition(b.el);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

function register(item: MenuNavigationItem): () => void {
  items.value = [...items.value, item];

  // Sort by DOM position (deferred to ensure elements are in the DOM)
  nextTick(() => {
    sortItemsByDom();

    // Ensure first enabled item is the active one if none is set
    if (items.value.length === 1 || activeIndex.value < 0) {
      const firstEnabled = items.value.findIndex((i) => !i.disabled);
      if (firstEnabled >= 0) activeIndex.value = firstEnabled;
    }
  });

  return () => {
    const i = items.value.indexOf(item);
    if (i >= 0) {
      const newItems = [...items.value];
      newItems.splice(i, 1);
      items.value = newItems;
      // Adjust active index if needed
      if (activeIndex.value >= items.value.length) {
        activeIndex.value = Math.max(0, items.value.length - 1);
      }
    }
  };
}

provide(MENU_NAV_KEY, { register, activeIndex, items });

function findNextEnabledIndex(from: number, direction: 1 | -1): number {
  const len = items.value.length;
  if (len === 0) return -1;
  let idx = from;
  for (let i = 0; i < len; i++) {
    idx = ((idx + direction) % len + len) % len;
    if (!items.value[idx].disabled) return idx;
  }
  return -1;
}

function focusIndex(idx: number) {
  if (idx >= 0 && idx < items.value.length) {
    activeIndex.value = idx;
    items.value[idx].el.focus();
  }
}

function onMenuKeydown(event: KeyboardEvent) {
  let handled = true;
  switch (event.key) {
    case 'ArrowDown': {
      const next = findNextEnabledIndex(activeIndex.value, 1);
      focusIndex(next);
      break;
    }
    case 'ArrowUp': {
      const prev = findNextEnabledIndex(activeIndex.value, -1);
      focusIndex(prev);
      break;
    }
    case 'Home': {
      const first = findNextEnabledIndex(-1, 1);
      focusIndex(first);
      break;
    }
    case 'End': {
      const last = findNextEnabledIndex(items.value.length, -1);
      focusIndex(last);
      break;
    }
    default:
      handled = false;
  }
  if (handled) {
    event.preventDefault();
    event.stopPropagation();
  }
}

onBeforeUnmount(() => {
  cascade.destroy();
});
</script>

<template>
  <div
    role="menu"
    class="coar-menu"
    :class="{ 'coar-menu--borderless': props.borderless }"
    :style="{
      '--coar-menu-icon-slot-display': props.showIconColumn ? undefined : 'none',
      '--coar-menu-item-icon-slot-size': props.showIconColumn ? undefined : '0px',
    }"
    @keydown="onMenuKeydown"
  >
    <div v-if="$slots.header" class="coar-menu__header">
      <slot name="header" />
    </div>

    <div
      v-scrollbar="{ overflowX: 'hidden', overflowY: 'scroll', autoHide: 'leave' }"
      class="coar-menu__content"
    >
      <slot />
    </div>

    <div v-if="$slots.footer" class="coar-menu__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.coar-menu {
  display: inline-flex;
  flex-direction: column;
  min-width: var(--coar-menu-min-width);
  max-width: var(--coar-menu-max-width);
  gap: 0;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-s);
  overflow: hidden;
  box-shadow: var(--coar-shadow-s);
}

.coar-menu__header,
.coar-menu__footer {
  flex-shrink: 0;
}

.coar-menu__content {
  flex: 1;
  overflow: hidden;
}

.coar-menu--borderless {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  min-width: unset;
  max-width: unset;
}

</style>
