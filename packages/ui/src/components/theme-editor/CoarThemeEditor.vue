<script setup lang="ts">
import { markRaw, onMounted, onUnmounted } from 'vue';
import { getOverlayService } from '../overlay/useOverlay';
import type { OverlayRef } from '../overlay/overlay-types';
import CoarThemeEditorPanel from './CoarThemeEditorPanel.vue';
import { initThemeEditorState, cleanupThemeEditorState, isOpen } from './theme-editor-state';

const props = withDefaults(defineProps<{ hideDarkToggle?: boolean }>(), {
  hideDarkToggle: false,
});

let overlayRef: OverlayRef | null = null;

onMounted(() => {
  initThemeEditorState(props.hideDarkToggle);
});

onUnmounted(() => {
  overlayRef?.close();
  cleanupThemeEditorState();
});

const PANEL_SPEC = {
  anchor: { kind: 'virtual' as const, placement: 'center' as const },
  dismiss: { outsideClick: false, escapeKey: true },
  scroll: { strategy: 'noop' as const },
  focus: { trap: false, restore: false },
  a11y: { role: 'dialog' as const, label: 'Theme Editor' },
  panelClass: 'te-overlay-panel',
};

function openPanel() {
  if (overlayRef && !overlayRef.isClosed) return;
  isOpen.value = true;
  overlayRef = getOverlayService().open({
    spec: PANEL_SPEC,
    content: {
      kind: 'component',
      component: markRaw(CoarThemeEditorPanel),
    },
    inputs: {
      hideDarkToggle: props.hideDarkToggle,
      onClose: () => {
        overlayRef?.close();
        isOpen.value = false;
      },
    },
  });
  overlayRef.afterClosed.then(() => {
    isOpen.value = false;
    overlayRef = null;
  });
}

function handleFabClick() {
  if (isOpen.value) {
    overlayRef?.close();
    isOpen.value = false;
  } else {
    openPanel();
  }
}
</script>

<template>
  <Teleport to="body">
    <button
      class="te-fab"
      :class="{ 'te-fab--open': isOpen }"
      :title="isOpen ? 'Close theme editor' : 'Open theme editor'"
      @click="handleFabClick"
    >
      <svg v-if="!isOpen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/>
        <circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    </button>
  </Teleport>
</template>

<style scoped>
/* ── FAB ─────────────────────────────────────────── */
.te-fab {
  position: fixed; bottom: 24px; right: 24px;
  z-index: calc(var(--coar-z-overlay, 1000) + 2);
  width: 44px; height: 44px; border-radius: 12px; border: none;
  background: var(--coar-background-accent-primary, #1183CD); color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(17,131,205,.40), 0 1px 3px rgba(0,0,0,.12);
  transition: box-shadow 0.2s, background 0.15s;
}
.te-fab:hover    { background: var(--coar-background-accent-hover, #0d6fad); box-shadow: 0 6px 20px rgba(17,131,205,.45); }
.te-fab--open    { background: var(--coar-background-neutral-primary, #fff); color: var(--coar-text-neutral-primary, #333); box-shadow: 0 2px 8px rgba(0,0,0,.14); }
</style>

<style>
/* ── Global panel container — applied via panelClass ── */
.te-overlay-panel {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 360px;
  overflow-y: auto;
  background: var(--coar-background-neutral-primary, #fff);
  border-left: 1px solid var(--coar-border-neutral-tertiary, #e8e8e8);
  box-shadow: -4px 0 24px rgba(0,0,0,.07);
  display: flex; flex-direction: column;
  font-family: var(--coar-body-base-family, Poppins, sans-serif);
  font-size: 13px; color: var(--coar-text-neutral-primary, #1a1a1a);
}
</style>
