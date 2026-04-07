<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount, useTemplateRef } from 'vue';
import type { ContextMenuContext } from './useContextMenu';
import { provideMenuClose } from './menu-cascade';
import CoarMenu from './CoarMenu.vue';

const props = defineProps<{
  /** Context menu controller returned by useContextMenu() */
  menu: ContextMenuContext;
}>();

const hostRef = useTemplateRef<HTMLElement>('hostRef');
const left = ref(0);
const top = ref(0);

// Provide close callback so CoarMenuItem auto-closes the context menu on click
provideMenuClose(() => props.menu.close());

function clampToViewport(x: number, y: number, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 4;

  return {
    left: x + rect.width > vw - pad ? Math.max(pad, vw - rect.width - pad) : x,
    top: y + rect.height > vh - pad ? Math.max(pad, vh - rect.height - pad) : y,
  };
}

function onPointerDown(event: PointerEvent) {
  if (!props.menu.isOpen.value) return;
  const target = event.target as Node;
  // Check if click is inside the context menu host
  if (hostRef.value?.contains(target)) return;
  // Check if click is inside a teleported submenu panel
  if ((target as Element).closest?.('.coar-submenu-panel')) return;
  props.menu.close();
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.menu.isOpen.value) {
    event.preventDefault();
    event.stopPropagation();
    props.menu.close();
  }
}

function onScroll(event: Event) {
  if (!props.menu.isOpen.value) return;
  if (event.target instanceof Node && hostRef.value?.contains(event.target)) return;
  props.menu.close();
}

function installListeners() {
  document.addEventListener('pointerdown', onPointerDown, { capture: true });
  document.addEventListener('keydown', onKeyDown, { capture: true });
  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
}

function removeListeners() {
  document.removeEventListener('pointerdown', onPointerDown, { capture: true });
  document.removeEventListener('keydown', onKeyDown, { capture: true });
  document.removeEventListener('scroll', onScroll, { capture: true });
}

watch(
  () => props.menu.isOpen.value,
  async (open) => {
    if (open) {
      left.value = props.menu.position.value.x;
      top.value = props.menu.position.value.y;
      installListeners();
      await nextTick();
      if (hostRef.value) {
        const clamped = clampToViewport(
          props.menu.position.value.x,
          props.menu.position.value.y,
          hostRef.value,
        );
        left.value = clamped.left;
        top.value = clamped.top;
      }
    } else {
      removeListeners();
    }
  },
);

onBeforeUnmount(() => {
  removeListeners();
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="menu.isOpen.value"
      ref="hostRef"
      class="coar-context-menu"
      :style="{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 'var(--coar-z-overlay, 1000)',
      }"
    >
      <CoarMenu>
        <slot />
      </CoarMenu>
    </div>
  </Teleport>
</template>
