<script setup lang="ts">
import { ref, nextTick, type ComponentPublicInstance } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { getToastService, type ToastService } from './toast-service';
import CoarToastItem from './CoarToastItem.vue';

const props = withDefaults(
  defineProps<{
    /**
     * The toast service backing this container. Defaults to the
     * `getToastService()` singleton (the same one `useToast()` wraps), so
     * `<CoarToastContainer />` is zero-config once `CoarOverlayPlugin` is
     * installed. Pass an explicit service only when you run a non-singleton
     * instance (e.g. an isolated test harness).
     */
    service?: ToastService;
  }>(),
  {
    // Lazy default: resolved per-instance at render so it picks up the
    // plugin-registered singleton. Throws a clear "install CoarOverlayPlugin"
    // error if the plugin is missing — far better than the previous silent
    // `Cannot read properties of undefined (reading 'position')` crash that
    // stalled the reactive flush and broke unrelated UI on the page.
    service: () => getToastService(),
  },
);

const { t } = useI18n();

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
  <div :class="['coar-toast-container', `coar-toast-container--${service.position.value}`]" role="region" :aria-label="t('coar.ui.toast.notifications', undefined, 'Notifications')" aria-live="polite" aria-relevant="additions">
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
  gap: var(--coar-spacing-s);
  pointer-events: none;
  max-height: 100vh;
  overflow: hidden;
}

.coar-toast-container--top-right {
  top: var(--coar-spacing-l);
  right: var(--coar-spacing-l);
}

.coar-toast-container--top-left {
  top: var(--coar-spacing-l);
  left: var(--coar-spacing-l);
}

.coar-toast-container--top-center {
  top: var(--coar-spacing-l);
  left: 50%;
  transform: translateX(-50%);
}

.coar-toast-container--bottom-right {
  bottom: var(--coar-spacing-l);
  right: var(--coar-spacing-l);
}

.coar-toast-container--bottom-left {
  bottom: var(--coar-spacing-l);
  left: var(--coar-spacing-l);
}

.coar-toast-container--bottom-center {
  bottom: var(--coar-spacing-l);
  left: 50%;
  transform: translateX(-50%);
}
</style>
