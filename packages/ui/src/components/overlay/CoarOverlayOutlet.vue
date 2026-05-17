<script setup lang="ts">
import { onMounted, provide, useTemplateRef, inject } from 'vue';
import { OVERLAY_PARENT_KEY, OVERLAY_SERVICE_KEY } from './useOverlay';
import type { OverlayInstance } from './overlay-service';

const props = defineProps<{
  instance: OverlayInstance;
}>();

const hostRef = useTemplateRef<HTMLElement>('hostRef');
const panelRef = useTemplateRef<HTMLElement>('panelRef');

const service = inject(OVERLAY_SERVICE_KEY)!;

// Expose this overlay as the parent-context for any descendant that opens its own overlay
// (popover, tooltip, sub-menu). Descendants call `useOverlayParent()` and pass the result
// to `overlay.open({ parent })`, which wires up z-index stacking, click-outside awareness,
// and close-propagation. See `OVERLAY_PARENT_KEY` docs in useOverlay.ts.
provide(OVERLAY_PARENT_KEY, props.instance);

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
  if (
    (a11y.role === 'dialog' || a11y.role === 'alertdialog') &&
    props.instance.spec.backdrop.kind === 'modal'
  ) {
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
        // Position via `top`/`left` (not `transform: translate3d`). A `transform` value
        // other than `none` makes the element a containing block for any `position: fixed`
        // descendants (CSS spec), which breaks popup widgets inside overlays — Monaco's
        // IntelliSense, tooltips anchored to body, etc. land relative to the overlay
        // instead of the viewport. `top`/`left` positioning doesn't have that side effect.
        // The compositor-acceleration benefit of translate3d is marginal for mount-time
        // positioning, which is what overlays do.
        left: `${instance.left}px`,
        top: `${instance.top}px`,
        margin: '0',
        border: 'none',
        padding: '0',
        background: 'transparent',
        overflow: 'visible',
        zIndex: `calc(var(--coar-z-overlay, 1000) + ${instance.id * 2})`,
        opacity: instance.presented ? '1' : '0',
        pointerEvents: instance.presented ? 'auto' : 'none',
      }"
      :data-placement="instance.placement"
      v-bind="getA11yAttrs()"
    >
      <!-- Panel -->
      <div
        :id="`coar-overlay-panel-${instance.id}`"
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
  display: flex;
}

.coar-overlay-panel {
  box-sizing: border-box;
  display: flex;
  /* Panel is a flex child of `.coar-overlay-host`. Without `flex: 1` it would
     shrink to its content's intrinsic width and ignore the host width set by
     `applySize` in overlay-service. `min-width: 0` overrides the default
     `min-width: auto` for flex children so content can be narrower than the
     panel's min-content (otherwise long unbreakable strings push the panel
     past the host's configured width). */
  flex: 1;
  min-width: 0;
}
</style>
