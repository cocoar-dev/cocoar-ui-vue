<script setup lang="ts">
import { ref, onBeforeUnmount, nextTick, type PropType } from 'vue';
import { computeOverlayCoordinates } from '../overlay/overlay-position';
import type { Placement } from '../overlay/overlay-types';
import CoarButton from '../button/CoarButton.vue';

export type PopconfirmPlacement = 'top' | 'bottom' | 'left' | 'right';
export type PopconfirmVariant = 'primary' | 'danger';

const props = defineProps({
  /** Confirmation message */
  message: { type: String, required: true },
  /** Optional title */
  title: { type: String, default: '' },
  /** Confirm button text */
  confirmText: { type: String, default: 'OK' },
  /** Cancel button text */
  cancelText: { type: String, default: 'Cancel' },
  /** Confirm button variant */
  confirmVariant: { type: String as PropType<PopconfirmVariant>, default: 'primary' },
  /** Preferred placement */
  placement: { type: String as PropType<PopconfirmPlacement>, default: 'top' },
  /** Disable popconfirm */
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits<{
  confirmed: [];
  cancelled: [];
}>();

const isOpen = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const panelStyle = ref({ left: '0px', top: '0px', opacity: '0' });
const actualPlacement = ref<PopconfirmPlacement>(props.placement);

const placementFallbacks: Record<PopconfirmPlacement, Placement[]> = {
  top: ['top', 'bottom', 'left', 'right'],
  bottom: ['bottom', 'top', 'left', 'right'],
  left: ['left', 'right', 'top', 'bottom'],
  right: ['right', 'left', 'top', 'bottom'],
};

function onClick(event: Event) {
  if (props.disabled) return;
  event.preventDefault();
  event.stopPropagation();

  if (isOpen.value) {
    close();
  } else {
    open();
  }
}

function open() {
  if (isOpen.value) return;
  isOpen.value = true;
  panelStyle.value = { left: '0px', top: '0px', opacity: '0' };
  nextTick(() => {
    positionPanel();
    addGlobalListeners();
  });
}

function close() {
  if (!isOpen.value) return;
  isOpen.value = false;
  removeGlobalListeners();
}

function confirm() {
  emit('confirmed');
  close();
}

function cancel() {
  emit('cancelled');
  close();
}

function positionPanel() {
  const trigger = triggerRef.value;
  const panel = panelRef.value;
  if (!trigger || !panel) return;

  const anchorRect = trigger.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const placements = placementFallbacks[props.placement] ?? ['top', 'bottom', 'left', 'right'];

  const viewport = {
    width: window.innerWidth || 800,
    height: window.innerHeight || 600,
  };

  const coords = computeOverlayCoordinates(
    anchorRect,
    { width: panelRect.width || 1, height: panelRect.height || 1 },
    { placement: placements, offset: 8, flip: true, shift: true },
    viewport,
  );

  actualPlacement.value = (coords.placement as PopconfirmPlacement) || props.placement;
  panelStyle.value = {
    left: `${coords.left}px`,
    top: `${coords.top}px`,
    opacity: '1',
  };
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) {
    cancel();
  }
}

function onOutsideClick(event: MouseEvent) {
  if (!isOpen.value) return;
  const target = event.target as Node;
  if (triggerRef.value?.contains(target)) return;
  if (panelRef.value?.contains(target)) return;
  cancel();
}

let globalListenersActive = false;

function addGlobalListeners() {
  if (globalListenersActive) return;
  globalListenersActive = true;
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('mousedown', onOutsideClick, true);
}

function removeGlobalListeners() {
  if (!globalListenersActive) return;
  globalListenersActive = false;
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('mousedown', onOutsideClick, true);
}

onBeforeUnmount(() => {
  removeGlobalListeners();
});
</script>

<template>
  <span ref="triggerRef" class="coar-popconfirm-trigger" aria-haspopup="dialog" @click="onClick">
    <slot />
  </span>
  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="panelRef"
      class="coar-popconfirm-host"
      :data-placement="actualPlacement"
      role="dialog"
      :aria-label="title || message"
      :style="{
        position: 'fixed',
        zIndex: 'var(--coar-z-overlay, 1000)',
        ...panelStyle,
      }"
    >
      <div class="coar-popconfirm-panel">
        <div v-if="title" class="coar-popconfirm-panel__title">{{ title }}</div>
        <div class="coar-popconfirm-panel__message">{{ message }}</div>
        <div class="coar-popconfirm-panel__actions">
          <CoarButton size="s" variant="secondary" @click="cancel">{{ cancelText }}</CoarButton>
          <CoarButton
            size="s"
            :variant="confirmVariant === 'danger' ? 'danger' : 'primary'"
            @click="confirm"
          >{{ confirmText }}</CoarButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.coar-popconfirm-trigger {
  display: inline;
}

.coar-popconfirm-host {
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
}

.coar-popconfirm-panel {
  position: relative;
  padding: 0.75rem;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-s);
  max-width: 280px;
  font-family: var(--coar-body-base-family);
  box-sizing: border-box;
}

/* Arrow pseudo-element */
.coar-popconfirm-panel::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral-tertiary);
  transform: rotate(45deg);
}

/* Top placement - arrow at bottom */
.coar-popconfirm-host[data-placement='top'] .coar-popconfirm-panel::before {
  bottom: -6px;
  left: 50%;
  margin-left: -5px;
  border-top: none;
  border-left: none;
}

/* Bottom placement - arrow at top */
.coar-popconfirm-host[data-placement='bottom'] .coar-popconfirm-panel::before {
  top: -6px;
  left: 50%;
  margin-left: -5px;
  border-bottom: none;
  border-right: none;
}

/* Left placement - arrow at right */
.coar-popconfirm-host[data-placement='left'] .coar-popconfirm-panel::before {
  right: -6px;
  top: 50%;
  margin-top: -5px;
  border-bottom: none;
  border-left: none;
}

/* Right placement - arrow at left */
.coar-popconfirm-host[data-placement='right'] .coar-popconfirm-panel::before {
  left: -6px;
  top: 50%;
  margin-top: -5px;
  border-top: none;
  border-right: none;
}

.coar-popconfirm-panel__title {
  font-weight: 600;
  font-size: var(--coar-body-base-size);
  color: var(--coar-text-neutral-primary);
  margin-bottom: 0.25rem;
}

.coar-popconfirm-panel__message {
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-secondary);
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.coar-popconfirm-panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
