<script setup lang="ts">
import { ref, onBeforeUnmount, markRaw, type PropType } from 'vue';
import { getOverlayService } from '../overlay/useOverlay';
import { popconfirmPreset } from '../overlay/overlay-presets';
import type { Placement, OverlayRef } from '../overlay/overlay-types';
import CoarPopconfirmPanel from './CoarPopconfirmPanel.vue';

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

const triggerRef = ref<HTMLElement | null>(null);
let overlayRef: OverlayRef | null = null;

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

  if (overlayRef && !overlayRef.isClosed) {
    overlayRef.close();
    overlayRef = null;
  } else {
    open();
  }
}

function open() {
  if (overlayRef && !overlayRef.isClosed) return;

  const trigger = triggerRef.value;
  if (!trigger) return;

  const placements = placementFallbacks[props.placement] ?? ['top', 'bottom', 'left', 'right'];

  overlayRef = getOverlayService().open({
    spec: {
      ...popconfirmPreset,
      anchor: { kind: 'element', element: trigger },
      position: {
        placement: placements,
        offset: 8,
        flip: true,
        shift: true,
      },
      a11y: {
        role: 'alertdialog',
        label: props.title || props.message,
      },
    },
    content: { kind: 'component', component: markRaw(CoarPopconfirmPanel) },
    inputs: {
      message: props.message,
      title: props.title,
      confirmText: props.confirmText,
      cancelText: props.cancelText,
      confirmVariant: props.confirmVariant,
      onConfirm: () => {
        emit('confirmed');
        overlayRef?.close();
        overlayRef = null;
      },
      onCancel: () => {
        emit('cancelled');
        overlayRef?.close();
        overlayRef = null;
      },
    },
  });

  // When overlay is closed externally (outside click, escape), emit cancelled
  overlayRef.afterClosed.then(() => {
    if (overlayRef?.isClosed) {
      // Only emit cancelled if it wasn't already emitted via onConfirm/onCancel
      overlayRef = null;
    }
  });
}

onBeforeUnmount(() => {
  if (overlayRef && !overlayRef.isClosed) {
    overlayRef.close();
    overlayRef = null;
  }
});
</script>

<template>
  <span ref="triggerRef" class="coar-popconfirm-trigger" aria-haspopup="dialog" @click="onClick">
    <slot />
  </span>
</template>

<style scoped>
.coar-popconfirm-trigger {
  display: inline;
}
</style>
