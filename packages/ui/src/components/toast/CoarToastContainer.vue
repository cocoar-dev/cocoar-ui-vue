<script setup lang="ts">
import { ref, nextTick, type ComponentPublicInstance } from 'vue';
import type { ToastService } from './toast-service';
import CoarToastItem from './CoarToastItem.vue';

const props = defineProps<{
  service: ToastService;
}>();

const toastRefs = ref<Record<number, ComponentPublicInstance | null>>({});

function onDismissed(id: number) {
  props.service.onDismissed(id);
  delete toastRefs.value[id];
}

function setToastRef(id: number, el: Element | ComponentPublicInstance | null) {
  toastRefs.value[id] = el as ComponentPublicInstance | null;

  // Start auto-close for newly added toasts
  if (el) {
    const toast = props.service.toasts.value.find((t) => t.id === id);
    if (toast && toast.duration > 0) {
      nextTick(() => {
        const comp = toastRefs.value[id] as { startAutoClose?: () => void } | null;
        comp?.startAutoClose?.();
      });
    }
  }
}
</script>

<template>
  <div :class="['coar-toast-container', `coar-toast-container--${service.position.value}`]" aria-live="polite" aria-relevant="additions">
    <CoarToastItem
      v-for="toast in service.toasts.value"
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
