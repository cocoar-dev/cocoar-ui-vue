<script setup lang="ts">
import { onMounted, useTemplateRef, inject } from 'vue';
import { OVERLAY_SERVICE_KEY } from './useOverlay';
import type { OverlayInstance } from './overlay-service';

const props = defineProps<{
  instance: OverlayInstance;
}>();

const hostRef = useTemplateRef<HTMLElement>('hostRef');
const panelRef = useTemplateRef<HTMLElement>('panelRef');

const service = inject(OVERLAY_SERVICE_KEY)!;

onMounted(() => {
  const hostEl = hostRef.value;
  const panelEl = panelRef.value;
  if (hostEl && panelEl) {
    service.onPanelMounted(props.instance, panelEl, hostEl);
  }
});

function getPanelClasses(): string[] {
  const classes = ['coar-overlay-panel'];
  const panelClass = props.instance.spec.panelClass;
  if (panelClass) {
    if (Array.isArray(panelClass)) {
      classes.push(...panelClass.filter(Boolean));
    } else {
      classes.push(panelClass);
    }
  }
  return classes;
}

function getA11yAttrs(): Record<string, string | undefined> {
  const a11y = props.instance.spec.a11y;
  const attrs: Record<string, string | undefined> = {};
  if (a11y.role) attrs.role = a11y.role;
  if (a11y.label) attrs['aria-label'] = a11y.label;
  if (a11y.labelledBy) attrs['aria-labelledby'] = a11y.labelledBy;
  if (a11y.describedBy) attrs['aria-describedby'] = a11y.describedBy;
  if ((a11y.role === 'dialog' || a11y.role === 'alertdialog') && props.instance.spec.backdrop.kind === 'modal') {
    attrs['aria-modal'] = 'true';
  }
  return attrs;
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop for modal overlays -->
    <div
      v-if="instance.spec.backdrop.kind === 'modal'"
      class="coar-overlay-backdrop"
      :style="{
        zIndex: `calc(var(--coar-z-overlay-backdrop, 999) + ${instance.id * 2})`,
      }"
    />

    <!-- Overlay host -->
    <div
      ref="hostRef"
      class="coar-overlay-host"
      :style="{
        position: 'fixed',
        inset: 'unset',
        top: '0px',
        left: '0px',
        margin: '0',
        border: 'none',
        padding: '0',
        background: 'transparent',
        overflow: 'visible',
        transform: `translate3d(${instance.left}px, ${instance.top}px, 0px)`,
        zIndex: `calc(var(--coar-z-overlay, 1000) + ${instance.id * 2})`,
        opacity: instance.presented ? '1' : '0',
        pointerEvents: instance.presented ? 'auto' : 'none',
      }"
      :data-placement="instance.placement"
      v-bind="getA11yAttrs()"
    >
      <!-- Panel -->
      <div
        ref="panelRef"
        :class="getPanelClasses()"
      >
        <!-- Component content -->
        <component
          :is="instance.content.component"
          v-if="instance.content.kind === 'component'"
          v-bind="instance.inputs"
        />
        <!-- Slot content (for template-based usage) -->
        <slot v-else />
      </div>
    </div>
  </Teleport>
</template>

<style>
.coar-overlay-backdrop {
  position: fixed;
  inset: 0;
  margin: 0;
  border: none;
  padding: 0;
  overflow: visible;
  background: color-mix(in srgb, var(--coar-color-black) 40%, transparent);
}

.coar-overlay-host {
  box-sizing: border-box;
}

.coar-overlay-panel {
  box-sizing: border-box;
}
</style>
