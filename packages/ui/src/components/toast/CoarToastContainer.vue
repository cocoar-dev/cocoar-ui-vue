<script setup lang="ts">
import { ref, nextTick, type ComponentPublicInstance } from 'vue';
import type { InternalToast, ToastPosition } from './toast-types';
import CoarToastItem from './CoarToastItem.vue';

const toasts = ref<InternalToast[]>([]);
const position = ref<ToastPosition>('top-right');
const toastRefs = ref<Record<number, ComponentPublicInstance | null>>({});

function addToast(toast: InternalToast) {
  // Limit to 5 visible toasts max (FIFO eviction)
  if (toasts.value.length >= 5) {
    const evicted = toasts.value[0];
    evicted.onDismiss();
    toasts.value = toasts.value.slice(1);
  }
  toasts.value = [...toasts.value, toast];

  if (toast.duration > 0) {
    nextTick(() => {
      const comp = toastRefs.value[toast.id] as { startAutoClose?: () => void } | null;
      comp?.startAutoClose?.();
    });
  }
}

function onDismissed(id: number) {
  const toast = toasts.value.find((t) => t.id === id);
  if (toast) {
    toast.onDismiss();
  }
  toasts.value = toasts.value.filter((t) => t.id !== id);
  delete toastRefs.value[id];
}

function removeAll() {
  toasts.value = [];
  toastRefs.value = {};
}

function setPosition(pos: ToastPosition) {
  position.value = pos;
}

function setToastRef(id: number, el: Element | ComponentPublicInstance | null) {
  toastRefs.value[id] = el as ComponentPublicInstance | null;
}

defineExpose({ addToast, onDismissed, removeAll, setPosition });
</script>

<template>
  <div :class="['coar-toast-container', `coar-toast-container--${position}`]">
    <CoarToastItem
      v-for="toast in toasts"
      :key="toast.id"
      :ref="(el: any) => setToastRef(toast.id, el)"
      :variant="toast.variant"
      :title="toast.title"
      :message="toast.message"
      :duration="toast.duration"
      :dismissible="toast.dismissible"
      :show-progress="toast.showProgress"
      :action="toast.action"
      @dismissed="onDismissed(toast.id)"
    />
  </div>
</template>

<style scoped>
.coar-toast-container {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s, 8px);
  pointer-events: none;
  max-height: 100vh;
  overflow: hidden;
}

.coar-toast-container--top-right {
  top: var(--coar-spacing-l, 24px);
  right: var(--coar-spacing-l, 24px);
}

.coar-toast-container--top-left {
  top: var(--coar-spacing-l, 24px);
  left: var(--coar-spacing-l, 24px);
}

.coar-toast-container--top-center {
  top: var(--coar-spacing-l, 24px);
  left: 50%;
  transform: translateX(-50%);
}

.coar-toast-container--bottom-right {
  bottom: var(--coar-spacing-l, 24px);
  right: var(--coar-spacing-l, 24px);
}

.coar-toast-container--bottom-left {
  bottom: var(--coar-spacing-l, 24px);
  left: var(--coar-spacing-l, 24px);
}

.coar-toast-container--bottom-center {
  bottom: var(--coar-spacing-l, 24px);
  left: 50%;
  transform: translateX(-50%);
}
</style>
